const pool = require('../../config/database');
const { auditLog } = require('./audit.helper');

const SELLER_ROLES = ['M_SELLER', 'ISV_SELLER', 'SELLER', 'AGENT', 'A_MANAGER', 'ISV', 'SUPPORT_PARTNER'];

// Roles restricted to only seeing their own/assigned data (M_SELLER sees all, SUPER_ADMIN/ADMIN see all)
const OWNERSHIP_RESTRICTED_ROLES = ['ISV_SELLER', 'SELLER', 'AGENT', 'A_MANAGER', 'ISV', 'SUPPORT_PARTNER'];

// Build ownership filter for sellers
const ownerFilter = (user) =>
  OWNERSHIP_RESTRICTED_ROLES.includes(user.role_type) ? ` AND l.owner_id = ${user.id}` : '';

// GET /api/internal/crm/leads
const getLeads = async (req, res) => {
  try {
    const { status, priority, owner_id, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['l.is_deleted = FALSE'];
    const params = [];

    if (['AGENT','A_MANAGER'].includes(req.user.role_type)) {
      conditions.push('l.affiliate_id IS NOT NULL');
      if(req.user.role_type==='AGENT') { params.push(req.user.id); conditions.push(`l.affiliate_id=$${params.length}`); }
    } else if (OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type)) {
      params.push(req.user.id);
      if (req.user.role_type === 'SELLER') {
        // SELLER sees leads linked to opportunities assigned to them
        conditions.push(`l.id IN (SELECT lead_id FROM crm_opportunities WHERE seller_id = $${params.length} AND is_deleted = FALSE AND lead_id IS NOT NULL)`);
      } else {
        conditions.push(`l.owner_id = $${params.length}`);
      }
    } else if (owner_id) {
      params.push(owner_id);
      conditions.push(`l.owner_id = $${params.length}`);
    }

    if (status) { params.push(status); conditions.push(`l.status = $${params.length}`); }
    if (priority) { params.push(priority); conditions.push(`l.priority = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(l.name ILIKE $${params.length} OR l.email ILIKE $${params.length} OR l.company ILIKE $${params.length})`);
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT l.*, u.name AS owner_name
       FROM crm_leads l
       LEFT JOIN users u ON u.id = l.owner_id
       WHERE ${where}
       ORDER BY l.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countParams = params.slice(0, -2);
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM crm_leads l WHERE ${where}`, countParams
    );

    res.json({ status: 'success', data: rows, total: parseInt(countRows[0].count), page: +page, limit: +limit });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// GET /api/internal/crm/leads/:id
const getLeadById = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, u.name AS owner_name, cb.name AS created_by_name
       FROM crm_leads l
       LEFT JOIN users u ON u.id = l.owner_id
       LEFT JOIN users cb ON cb.id = l.created_by
       WHERE l.id = $1 AND l.is_deleted = FALSE`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Lead not found' });

    const lead = rows[0];
    console.log('[getLeadById] user:', { id: req.user.id, id_type: typeof req.user.id, role: req.user.role_type }, 'lead.owner_id:', lead.owner_id, 'type:', typeof lead.owner_id);
    if (!['AGENT','A_MANAGER'].includes(req.user.role_type) && OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type) && lead.owner_id !== Number(req.user.id)) {
      // SELLER may access via an opportunity assigned to them
      if (req.user.role_type === 'SELLER') {
        const { rows: oppRows } = await pool.query(
          'SELECT id FROM crm_opportunities WHERE lead_id=$1 AND seller_id=$2 AND is_deleted=FALSE LIMIT 1',
          [req.params.id, Number(req.user.id)]
        );
        if (!oppRows.length) return res.status(403).json({ status: 'fail', message: 'Access denied' });
      } else {
        return res.status(403).json({ status: 'fail', message: 'Access denied' });
      }
    }

    const { rows: history } = await pool.query(
      `SELECT h.*, u.name AS changed_by_name FROM crm_lead_score_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.lead_id = $1 ORDER BY h.created_at DESC`, [req.params.id]
    );

    res.json({ status: 'success', data: { ...lead, score_history: history } });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// POST /api/internal/crm/leads
const createLead = async (req, res) => {
  try {
    const {
      name, email, phone, whatsapp, company, designation, country, industry,
      lead_source, campaign, product_interest, cloud_preference, edp_macc_status,
      budget, timeline, requirement, owner_id, score = 0, status = 'New',
      priority = 'Medium', next_followup, notes, consent_status = false,
      lead_stage = 'Cold Lead', original_lead_id
    } = req.body;

    // Determine owner: if original_lead_id provided, look up the affiliate/seller from lead_assigns
    let finalOwnerId = owner_id || null;
    if (!finalOwnerId && original_lead_id) {
      try {
        const { rows: assigns } = await pool.query(
          'SELECT assign_user_id FROM lead_assigns WHERE lead_id=$1 LIMIT 1', [original_lead_id]
        );
        if (assigns.length && assigns[0].assign_user_id) {
          finalOwnerId = assigns[0].assign_user_id;
        }
      } catch(e) { /* lead_assigns table might not exist in some setups */ }
    }
    if (!finalOwnerId) finalOwnerId = req.user.id;

    const { rows } = await pool.query(
      `INSERT INTO crm_leads
        (name,email,phone,whatsapp,company,designation,country,industry,lead_source,campaign,
         product_interest,cloud_preference,edp_macc_status,budget,timeline,requirement,
         owner_id,score,status,priority,next_followup,notes,consent_status,lead_stage,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$25)
       RETURNING *`,
      [name,email,phone,whatsapp,company,designation,country,industry,lead_source,campaign,
       product_interest,cloud_preference,edp_macc_status,budget,timeline,requirement,
       finalOwnerId,score,status,priority,next_followup||null,notes,consent_status,lead_stage,req.user.id]
    );

    await auditLog(req.user.id, 'CREATE_LEAD', 'Lead', rows[0].id, null, rows[0], req);
    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// PUT /api/internal/crm/leads/:id
const updateLead = async (req, res) => {
  try {
    const { rows: existing } = await pool.query(
      'SELECT * FROM crm_leads WHERE id=$1 AND is_deleted=FALSE', [req.params.id]
    );
    if (!existing.length) return res.status(404).json({ status: 'fail', message: 'Lead not found' });

    const old = existing[0];
    if (OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type) && old.owner_id !== Number(req.user.id)) {
      if (req.user.role_type === 'SELLER') {
        const { rows: oppRows } = await pool.query(
          'SELECT id FROM crm_opportunities WHERE lead_id=$1 AND seller_id=$2 AND is_deleted=FALSE LIMIT 1',
          [req.params.id, Number(req.user.id)]
        );
        if (!oppRows.length) return res.status(403).json({ status: 'fail', message: 'Access denied' });
      } else {
        return res.status(403).json({ status: 'fail', message: 'Access denied' });
      }
    }

    const fields = ['name','email','phone','whatsapp','company','designation','country','industry',
      'lead_source','campaign','product_interest','cloud_preference','edp_macc_status','budget',
      'timeline','requirement','owner_id','score','status','priority','next_followup','notes','consent_status'];

    const updates = [];
    const params = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        params.push(req.body[f]);
        updates.push(`${f}=$${params.length}`);
      }
    });
    params.push(req.user.id, new Date(), req.params.id);
    updates.push(`updated_by=$${params.length - 2}`, `updated_at=$${params.length - 1}`);

    const { rows } = await pool.query(
      `UPDATE crm_leads SET ${updates.join(',')} WHERE id=$${params.length} RETURNING *`, params
    );

    // Track score change
    if (req.body.score !== undefined && req.body.score !== old.score) {
      await pool.query(
        `INSERT INTO crm_lead_score_history (lead_id,old_score,new_score,changed_by,reason)
         VALUES ($1,$2,$3,$4,$5)`,
        [req.params.id, old.score, req.body.score, req.user.id, req.body.score_reason || null]
      );
    }

    await auditLog(req.user.id, 'UPDATE_LEAD', 'Lead', rows[0].id, old, rows[0], req);
    res.json({ status: 'success', data: rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// DELETE /api/internal/crm/leads/:id (soft delete)
const deleteLead = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE crm_leads SET is_deleted=TRUE, updated_by=$1, updated_at=NOW() WHERE id=$2 AND is_deleted=FALSE RETURNING id',
      [req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Lead not found' });
    await auditLog(req.user.id, 'DELETE_LEAD', 'Lead', req.params.id, null, null, req);
    res.json({ status: 'success', message: 'Lead deleted' });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// POST /api/internal/crm/leads/:id/assign
const assignLead = async (req, res) => {
  try {
    const { owner_id, reason } = req.body;
    if (!owner_id) return res.status(400).json({ status: 'fail', message: 'owner_id required' });

    const { rows: existing } = await pool.query(
      'SELECT * FROM crm_leads WHERE id=$1 AND is_deleted=FALSE', [req.params.id]
    );
    if (!existing.length) return res.status(404).json({ status: 'fail', message: 'Lead not found' });
    const old = existing[0];

    const { rows } = await pool.query(
      'UPDATE crm_leads SET owner_id=$1, updated_by=$2, updated_at=NOW() WHERE id=$3 AND is_deleted=FALSE RETURNING *',
      [owner_id, req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Lead not found' });

    // Track ownership history
    await pool.query(
      `INSERT INTO crm_lead_ownership_history
         (lead_id, previous_owner, new_owner, assigned_by, reason)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.params.id, old.owner_id, owner_id, req.user.id, reason || null]
    );

    // Notify new owner
    const { createNotification, createActivity } = require('./lifecycle.engine');
    await createActivity('lead', Number(req.params.id), null, 'note',
      `Lead reassigned to new owner (ID: ${owner_id})`, reason || null, req.user.id);
    await createNotification(owner_id, 'lead_assigned', 'Lead Assigned to You',
      `Lead "${old.name}" has been assigned to you.`, 'lead', Number(req.params.id));

    await auditLog(req.user.id, 'ASSIGN_LEAD', 'Lead', req.params.id,
      { owner_id: old.owner_id }, { owner_id }, req);
    res.json({ status: 'success', data: rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

/**
 * GET /api/internal/crm/leads/:id/ownership-history
 * Returns the ownership/assignment history for a lead.
 */
const getLeadOwnershipHistory = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT h.*,
              po.name AS previous_owner_name,
              no.name AS new_owner_name,
              ab.name AS assigned_by_name
       FROM crm_lead_ownership_history h
       LEFT JOIN users po ON po.id = h.previous_owner
       LEFT JOIN users no ON no.id = h.new_owner
       LEFT JOIN users ab ON ab.id = h.assigned_by
       WHERE h.lead_id=$1
       ORDER BY h.created_at DESC`,
      [req.params.id]
    );
    res.json({ status: 'success', data: rows });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * GET /api/internal/crm/leads/duplicates
 * Duplicate detection: finds leads that share email, phone, company, or domain.
 * Query: ?email=&phone=&company=&domain=
 * Returns grouped potential duplicates without creating anything.
 */
const findDuplicateLeads = async (req, res) => {
  try {
    const { email, phone, company, domain } = req.query;
    if (!email && !phone && !company && !domain) {
      return res.status(400).json({ status: 'fail', message: 'Provide at least one of: email, phone, company, domain' });
    }

    const conditions = ['l.is_deleted=FALSE'];
    const params = [];

    if (email) {
      params.push(email.trim().toLowerCase());
      conditions.push(`l.email_normalized = $${params.length}`);
    }
    if (phone) {
      const normalized = phone.replace(/[^0-9]/g, '');
      if (normalized.length >= 7) {
        params.push(normalized);
        conditions.push(`l.phone_normalized = $${params.length}`);
      }
    }
    if (company) {
      params.push(`%${company.trim().toLowerCase()}%`);
      conditions.push(`LOWER(l.company) LIKE $${params.length}`);
    }
    if (domain) {
      params.push(domain.trim().toLowerCase());
      conditions.push(`l.company_domain = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const { rows } = await pool.query(
      `SELECT l.id, l.name, l.email, l.phone, l.company, l.company_domain,
              l.score, l.score_label, l.status, l.lead_stage,
              l.converted_to_opportunity_id, l.created_at,
              u.name AS owner_name
       FROM crm_leads l
       LEFT JOIN users u ON u.id = l.owner_id
       WHERE ${where}
       ORDER BY l.created_at DESC
       LIMIT 20`,
      params
    );
    res.json({ status: 'success', data: rows, count: rows.length });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

// POST /api/internal/crm/leads/:id/convert
// Manual lead conversion by a CRM user — delegates entirely to the central
// conversion service so Account/Contact dedup, transaction safety, activity
// logging, and M_SELLER notifications are all handled consistently.
const convertLead = async (req, res) => {
  try {
    const { rows: leadRows } = await pool.query(
      'SELECT id FROM crm_leads WHERE id=$1 AND is_deleted=FALSE', [req.params.id]
    );
    if (!leadRows.length) return res.status(404).json({ status: 'fail', message: 'Lead not found' });

    const { convertCustomerToOpportunity } = require('./lifecycle.engine');
    await convertCustomerToOpportunity(Number(req.params.id), req.user.id, 'manual');

    // Read back the result so we can return the created IDs
    const { rows: converted } = await pool.query(
      `SELECT converted_to_opportunity_id, converted_to_account_id, converted_to_contact_id
       FROM crm_leads WHERE id=$1`, [req.params.id]
    );

    await auditLog(req.user.id, 'CONVERT_LEAD', 'Lead', req.params.id, null,
      { opportunity_id: converted[0].converted_to_opportunity_id }, req);

    res.json({
      status: 'success',
      data: {
        opportunity_id: converted[0].converted_to_opportunity_id,
        account_id:     converted[0].converted_to_account_id,
        contact_id:     converted[0].converted_to_contact_id,
      },
    });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

module.exports = { getLeads, getLeadById, createLead, updateLead, deleteLead, assignLead, convertLead, getLeadOwnershipHistory, findDuplicateLeads };
