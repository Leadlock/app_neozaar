/**
 * Affiliate Management Controller
 * ─────────────────────────────────────────────────────────────
 * CRUD for affiliates, assignments, links, and admin operations.
 *
 * Routes protected by:
 *   verifyToken + requireAffiliateManager  (admin operations)
 *   verifyToken + requireAffiliateAccess   (read operations for affiliate themselves)
 */
const pool = require('../../config/database');
const {
  affiliateAuditLog,
  ensureRefCode,
  generateLinkSlug,
} = require('../../services/affiliate/affiliate.attribution.service');

// ── GET /api/affiliate/affiliates ────────────────────────────────
// List all affiliates (A_MANAGER / SUPER_ADMIN / ADMIN)
const getAffiliates = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ["u.role_type IN ('AGENT','A_MANAGER')"];
    const params = [];

    if (status === 'active')   { conditions.push('u.is_active = TRUE'); }
    if (status === 'inactive') { conditions.push('u.is_active = FALSE'); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.mobile, u.role_type, u.is_active,
              u.ref_code, u.created_at,
              (SELECT COUNT(*) FROM affiliate_attributions aa
               WHERE aa.affiliate_id=u.id AND aa.status='active') AS total_customers,
              (SELECT COUNT(*) FROM affiliate_links al
               WHERE al.affiliate_id=u.id AND al.is_active=TRUE) AS active_links,
              (SELECT COUNT(*) FROM affiliate_campaigns ac
               WHERE ac.affiliate_id=u.id) AS total_campaigns
       FROM users u
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*) FROM users u WHERE ${where}`, params.slice(0, -2)
    );
    res.json({ status: 'success', data: rows, total: parseInt(cnt[0].count) });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── GET /api/affiliate/affiliates/:id ───────────────────────────
const getAffiliateById = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.mobile, u.role_type, u.is_active, u.ref_code, u.created_at
       FROM users u
       WHERE u.id=$1 AND u.role_type IN ('AGENT','A_MANAGER')`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Affiliate not found' });
    res.json({ status: 'success', data: rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── POST /api/affiliate/affiliates ──────────────────────────────
// Create a new affiliate user (A_MANAGER / SUPER_ADMIN / ADMIN)
const createAffiliate = async (req, res) => {
  try {
    const { name, email, mobile, role_type = 'AGENT', role_id } = req.body;
    if (!name || !email) {
      return res.status(400).json({ status: 'fail', message: 'name and email are required' });
    }
    if (!['AGENT', 'A_MANAGER'].includes(role_type)) {
      return res.status(400).json({ status: 'fail', message: 'role_type must be AGENT or A_MANAGER' });
    }

    // Check email uniqueness
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email=LOWER(TRIM($1)) LIMIT 1', [email]
    );
    if (existing.length) {
      return res.status(409).json({ status: 'fail', message: 'Email already registered' });
    }

    const bcrypt = require('bcryptjs');
    const { generateRandomStringSecure } = require('../../utils/cryptoHelper');
    const tempPassword = generateRandomStringSecure(10);
    const hashed = await bcrypt.hash(tempPassword, 10);

    // role_id: AGENT=7, A_MANAGER=11
    const resolvedRoleId = role_type === 'AGENT' ? 7 : 11;

    const { rows: created } = await pool.query(
      `INSERT INTO users (name, email, mobile, role_id, role_type, password, is_active, is_email_verified, created_at, updated_at)
       VALUES ($1, LOWER(TRIM($2)), $3, $4, $5, $6, TRUE, TRUE, NOW(), NOW())
       RETURNING id, name, email, mobile, role_type, is_active`,
      [name, email, mobile || null, resolvedRoleId, role_type, hashed]
    );
    const newUser = created[0];

    // Generate ref_code
    const refCode = await ensureRefCode(newUser.id);

    affiliateAuditLog({
      actorId: req.user.id,
      action: 'affiliate_created',
      affiliateId: newUser.id,
      entityType: 'user',
      entityId: newUser.id,
      newValue: { name, email, role_type },
      ip: req.ip,
    });

    // Send welcome email with temp password
    try {
      const emailService = require('../../config/mail');
      if (emailService.sendWelcomeMailtoUser) {
        emailService.sendWelcomeMailtoUser(newUser.email, newUser.name, tempPassword, role_type);
      }
    } catch (emailErr) {
      console.warn('[affiliate] welcome email failed:', emailErr.message);
    }

    res.status(201).json({
      status: 'success',
      message: 'Affiliate created successfully',
      data: { ...newUser, ref_code: refCode },
    });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── PUT /api/affiliate/affiliates/:id ───────────────────────────
const updateAffiliate = async (req, res) => {
  try {
    const { name, mobile } = req.body;
    const { rows } = await pool.query(
      `UPDATE users
       SET name=COALESCE($1, name), mobile=COALESCE($2, mobile), updated_at=NOW()
       WHERE id=$3 AND role_type IN ('AGENT','A_MANAGER')
       RETURNING id, name, email, mobile, role_type, is_active`,
      [name || null, mobile || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Affiliate not found' });
    affiliateAuditLog({
      actorId: req.user.id,
      action: 'affiliate_updated',
      affiliateId: Number(req.params.id),
      entityType: 'user',
      entityId: Number(req.params.id),
      newValue: req.body,
    });
    res.json({ status: 'success', data: rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── POST /api/affiliate/affiliates/:id/activate ─────────────────
const setAffiliateStatus = async (req, res) => {
  try {
    const is_active = req.body.is_active !== false;
    const { rows } = await pool.query(
      `UPDATE users SET is_active=$1, updated_at=NOW()
       WHERE id=$2 AND role_type IN ('AGENT','A_MANAGER')
       RETURNING id, name, email, is_active`,
      [is_active, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Affiliate not found' });
    affiliateAuditLog({
      actorId: req.user.id,
      action: is_active ? 'affiliate_activated' : 'affiliate_deactivated',
      affiliateId: Number(req.params.id),
      entityType: 'user',
      entityId: Number(req.params.id),
    });
    res.json({ status: 'success', data: rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── GET /api/affiliate/affiliates/:id/assignments ────────────────
const getAssignments = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT aa.*, p.name AS catalog_name, p.action_type, u.name AS assigned_by_name
       FROM affiliate_assignments aa
       JOIN products p ON p.id = aa.catalog_id
       LEFT JOIN users u ON u.id = aa.assigned_by
       WHERE aa.affiliate_id=$1 AND aa.is_active=TRUE
       ORDER BY aa.assigned_at DESC`,
      [req.params.id]
    );
    res.json({ status: 'success', data: rows });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── POST /api/affiliate/affiliates/:id/assignments ───────────────
const addAssignment = async (req, res) => {
  try {
    const { catalog_id, catalog_type = 'product', notes } = req.body;
    if (!catalog_id) {
      return res.status(400).json({ status: 'fail', message: 'catalog_id is required' });
    }
    if (!['product', 'service', 'solution'].includes(catalog_type) || !/^\d+$/.test(String(catalog_id))) {
      return res.status(400).json({ status: 'fail', message: 'A valid catalog ID and type are required' });
    }
    const { rows: affiliates } = await pool.query(
      "SELECT id FROM users WHERE id=$1 AND role_type IN ('AGENT','A_MANAGER') AND is_active=TRUE", [req.params.id]
    );
    if (!affiliates.length) {
      return res.status(404).json({ status: 'fail', message: 'Affiliate no longer exists or is inactive. Refresh and select the current account.' });
    }
    const { rows: catalogs } = await pool.query(
      'SELECT id FROM products WHERE id=$1 AND action_type=$2 AND deleted_at IS NULL', [catalog_id, catalog_type]
    );
    if (!catalogs.length) {
      return res.status(400).json({ status: 'fail', message: 'Catalog item not found for the selected type' });
    }
    const { rows } = await pool.query(
      `INSERT INTO affiliate_assignments (affiliate_id, catalog_id, catalog_type, assigned_by, notes)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (affiliate_id, catalog_id) DO UPDATE
         SET is_active=TRUE, notes=EXCLUDED.notes, assigned_at=NOW(),
             assigned_by=EXCLUDED.assigned_by, catalog_type=EXCLUDED.catalog_type
       RETURNING *`,
      [req.params.id, catalog_id, catalog_type, req.user.id, notes || null]
    );
    affiliateAuditLog({
      actorId: req.user.id,
      action: 'catalog_assigned',
      affiliateId: Number(req.params.id),
      entityType: 'product',
      entityId: catalog_id,
      newValue: { catalog_type, catalog_id },
    });
    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── DELETE /api/affiliate/affiliates/:id/assignments/:assignId ───
const removeAssignment = async (req, res) => {
  try {
    await pool.query(
      `UPDATE affiliate_assignments SET is_active=FALSE
       WHERE id=$1 AND affiliate_id=$2`,
      [req.params.assignId, req.params.id]
    );
    affiliateAuditLog({
      actorId: req.user.id,
      action: 'catalog_assignment_removed',
      affiliateId: Number(req.params.id),
      entityType: 'affiliate_assignment',
      entityId: Number(req.params.assignId),
    });
    res.json({ status: 'success', message: 'Assignment removed' });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── GET /api/affiliate/affiliates/:id/links ──────────────────────
const getLinks = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT al.*,
              p.name AS catalog_name,
              (SELECT COUNT(*) FROM affiliate_link_clicks alc WHERE alc.link_id=al.id) AS click_count,
              (SELECT COUNT(*) FROM affiliate_attributions aa
               WHERE aa.affiliate_link_id=al.id AND aa.status='active') AS registrations
       FROM affiliate_links al
       LEFT JOIN products p ON p.id = al.catalog_id
       WHERE al.affiliate_id=$1
       ORDER BY al.created_at DESC`,
      [req.params.id]
    );
    res.json({ status: 'success', data: rows });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── POST /api/affiliate/affiliates/:id/links ─────────────────────
// Generate a new affiliate tracking link
const createLink = async (req, res) => {
  try {
    const affiliateId = Number(req.params.id);
    const { catalog_id, label, utm_campaign } = req.body;
    let catalog_type = 'generic';
    let destination_path = '/';

    // Verify affiliate exists
    const { rows: affRows } = await pool.query(
      `SELECT id, ref_code FROM users WHERE id=$1 AND is_active=TRUE AND role_type IN ('AGENT','A_MANAGER') LIMIT 1`,
      [affiliateId]
    );
    if (!affRows.length) {
      return res.status(404).json({ status: 'fail', message: 'Affiliate not found' });
    }

    if (catalog_id) {
      const item = await require('../../services/affiliate/affiliate.catalog.service').assignedCatalog(affiliateId, catalog_id);
      if (!item) return res.status(403).json({ status: 'fail', message: 'This published catalog item is not assigned to the affiliate' });
      catalog_type = item.type;
      // Route by numeric id only. The marketplace product page resolves /:id by
      // products.id (or a matching seo_pages.page_url); products.slug is an
      // internal auto-generated "name-timestamp" string that is not routable and
      // can be stale, which lands affiliate clicks on "Product Not Found".
      destination_path = `/${item.type}/${item.id}`;
    } else if (req.user.role_type === 'AGENT') {
      return res.status(400).json({ status: 'fail', message: 'Choose an assigned catalog item' });
    }

    const refCode = await ensureRefCode(affiliateId);
    const slug = await generateLinkSlug();

    // Build UTM params
    const utmSource   = refCode;
    const utmMedium   = 'referral';
    const utmCampaignVal = utm_campaign || `affiliate_${affiliateId}`;

    const { rows } = await pool.query(
      `INSERT INTO affiliate_links
         (affiliate_id, catalog_id, catalog_type, slug, destination_path,
          utm_source, utm_medium, utm_campaign, label, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [affiliateId, catalog_id || null, catalog_type, slug,
       destination_path || null, utmSource, utmMedium, utmCampaignVal,
       label || null, req.user.id]
    );

    affiliateAuditLog({
      actorId: req.user.id,
      action: 'affiliate_link_created',
      affiliateId,
      entityType: 'affiliate_link',
      entityId: rows[0].id,
      newValue: { slug, catalog_id, catalog_type },
    });

    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── POST /api/affiliate/affiliates/:id/reassign-customer ─────────
// SuperAdmin / A_MANAGER explicit customer reassignment
const reassignCustomer = async (req, res) => {
  try {
    await require('../../services/affiliate/affiliate.registration.service').reassignCustomer({
      leadId: req.body.crm_lead_id, affiliateId: req.body.new_affiliate_id,
      previousAffiliateId: req.params.id, actorId: req.user.id, reason: req.body.reason,
    });
    res.json({ status: 'success', message: 'Customer reassigned' });
  } catch(e) { res.status(e.status || 500).json({ status: 'fail', message: e.message }); }
};

// ── GET /api/affiliate/affiliates/:id/attribution-conflicts ──────
const getAttributionConflicts = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT aa.*, u.name AS affiliate_name, u.name AS new_affiliate_name,
              l.affiliate_id AS previous_affiliate_id, previous.name AS previous_affiliate_name,
              l.name AS lead_name, l.email AS lead_email
       FROM affiliate_attributions aa
       JOIN users u ON u.id = aa.affiliate_id
       LEFT JOIN crm_leads l ON l.id = aa.crm_lead_id
       LEFT JOIN users previous ON previous.id = l.affiliate_id
       WHERE aa.status='conflict'
         AND ($1::int IS NULL OR aa.affiliate_id=$1)
       ORDER BY aa.created_at DESC`,
      [req.params.id !== 'all' ? req.params.id : null]
    );
    res.json({ status: 'success', data: rows });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── GET /api/affiliate/audit-log ─────────────────────────────────
const getAuditLog = async (req, res) => {
  try {
    const { affiliate_id, action, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (affiliate_id) { params.push(affiliate_id); conditions.push(`al.affiliate_id=$${params.length}`); }
    if (action)       { params.push(action); conditions.push(`al.action=$${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT al.*, u.name AS actor_name, a.name AS affiliate_name
       FROM affiliate_audit_log al
       LEFT JOIN users u ON u.id = al.actor_id
       LEFT JOIN users a ON a.id = al.affiliate_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    res.json({ status: 'success', data: rows });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

module.exports = {
  getAffiliates,
  getAffiliateById,
  createAffiliate,
  updateAffiliate,
  setAffiliateStatus,
  getAssignments,
  addAssignment,
  removeAssignment,
  getLinks,
  createLink,
  reassignCustomer,
  getAttributionConflicts,
  getAuditLog,
};
