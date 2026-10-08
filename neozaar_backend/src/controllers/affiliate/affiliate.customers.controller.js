/**
 * Affiliate Customer / Opportunity / Scoring Controller
 * ─────────────────────────────────────────────────────────────
 * Read-only views of existing CRM data, filtered by affiliate.
 *
 * CRITICAL: No existing CRM data is duplicated or overwritten.
 * All data comes from the existing crm_leads and crm_opportunities tables.
 */
const pool = require('../../config/database');

// Signups are visible immediately, but are not counted as CRM customers until
// email verification activates their attribution through the existing CRM flow.
const getAffiliateRegistrations = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const params = [req.affiliateScopeId || null];
    const conditions = ["aa.status='pending'", "u.role_type='CLIENT'", 'u.is_email_verified=FALSE',
      '($1::int IS NULL OR aa.affiliate_id=$1)'];
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    const where = conditions.join(' AND ');
    const count = await pool.query(`SELECT COUNT(*) FROM affiliate_attributions aa JOIN users u ON u.id=aa.user_id WHERE ${where}`, params);
    params.push(limit, (page - 1) * limit);
    const { rows } = await pool.query(`SELECT aa.id,aa.user_id,aa.affiliate_id,u.name,u.email,
        aa.attribution_type,aa.created_at AS registered_at,'Awaiting verification' AS registration_status,
        a.name AS affiliate_name,p.name AS catalog_name
      FROM affiliate_attributions aa JOIN users u ON u.id=aa.user_id
      JOIN users a ON a.id=aa.affiliate_id
      LEFT JOIN affiliate_links l ON l.id=aa.affiliate_link_id
      LEFT JOIN products p ON p.id=l.catalog_id
      WHERE ${where} ORDER BY aa.created_at DESC,aa.id DESC
      LIMIT $${params.length-1} OFFSET $${params.length}`, params);
    res.json({ status: 'success', data: rows, total: Number(count.rows[0].count) });
  } catch(e) { res.status(500).json({ status: 'fail', message: 'Unable to load referred registrations' }); }
};

// ── GET /api/affiliate/customers ─────────────────────────────────
// Returns CRM leads attributed to the requesting affiliate (or all for manager).
const getAffiliateCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, stage } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['l.is_deleted = FALSE', 'l.affiliate_id IS NOT NULL'];
    const params = [];

    // Server-enforced scope — NEVER trust client-supplied affiliate_id
    if (req.affiliateScopeId) {
      params.push(req.affiliateScopeId);
      conditions.push(`l.affiliate_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(l.name ILIKE $${params.length} OR l.email ILIKE $${params.length} OR l.company ILIKE $${params.length})`);
    }
    if (stage) {
      params.push(stage);
      conditions.push(`l.lead_stage = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT l.*,
              u.name AS affiliate_name,
              aa.attribution_type,
              aa.attributed_at,
              aa.utm_source,
              aa.utm_campaign,
              (SELECT h.reason FROM crm_lead_score_history h
               WHERE h.lead_id=l.id ORDER BY h.created_at DESC,h.id DESC LIMIT 1) AS latest_activity,
              (SELECT h.created_at FROM crm_lead_score_history h
               WHERE h.lead_id=l.id ORDER BY h.created_at DESC,h.id DESC LIMIT 1) AS latest_activity_at,
              -- Most recent opportunity for this lead
              (SELECT o.stage FROM crm_opportunities o
               WHERE o.lead_id=l.id AND o.is_deleted=FALSE
               ORDER BY o.created_at DESC LIMIT 1) AS latest_opp_stage,
              (SELECT o.deal_value FROM crm_opportunities o
               WHERE o.lead_id=l.id AND o.is_deleted=FALSE
               ORDER BY o.created_at DESC LIMIT 1) AS latest_opp_value
       FROM crm_leads l
       LEFT JOIN users u ON u.id = l.affiliate_id
       LEFT JOIN LATERAL (
         SELECT attribution_type, attributed_at, utm_source, utm_campaign
         FROM affiliate_attributions
         WHERE crm_lead_id=l.id AND status='active'
         ORDER BY attributed_at ASC LIMIT 1
       ) aa ON TRUE
       WHERE ${where}
       ORDER BY l.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*) FROM crm_leads l WHERE ${where}`, params.slice(0, -2)
    );
    res.json({ status: 'success', data: rows, total: parseInt(cnt[0].count) });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── GET /api/affiliate/opportunities ─────────────────────────────
// Returns CRM opportunities for affiliate-attributed leads.
const getAffiliateOpportunities = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, stage } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['o.is_deleted = FALSE', 'o.affiliate_id IS NOT NULL'];
    const params = [];

    if (req.affiliateScopeId) {
      params.push(req.affiliateScopeId);
      conditions.push(`o.affiliate_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`o.name ILIKE $${params.length}`);
    }
    if (stage) {
      params.push(stage);
      conditions.push(`o.stage = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT o.*,
              c.name AS contact_name, c.company AS contact_company,
              u.name AS owner_name, a.name AS affiliate_name,
              l.score AS customer_score, l.score_label AS customer_score_label
       FROM crm_opportunities o
       LEFT JOIN crm_contacts c ON c.id = o.contact_id
       LEFT JOIN users u ON u.id = o.owner_id
       LEFT JOIN users a ON a.id = o.affiliate_id
       LEFT JOIN crm_leads l ON l.id = o.lead_id
       WHERE ${where}
       ORDER BY o.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*) FROM crm_opportunities o WHERE ${where}`, params.slice(0, -2)
    );
    res.json({ status: 'success', data: rows, total: parseInt(cnt[0].count) });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── GET /api/affiliate/customer-scores ───────────────────────────
// Affiliate view of customer scoring — reuses existing crm_leads scores.
const getAffiliateCustomerScores = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['l.is_deleted = FALSE', 'l.affiliate_id IS NOT NULL'];
    const params = [];

    if (req.affiliateScopeId) {
      params.push(req.affiliateScopeId);
      conditions.push(`l.affiliate_id = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT l.id, l.name, l.email, l.company, l.score, l.score_label,
              l.lead_stage, l.converted_to_opportunity_id, l.created_at,
              u.name AS affiliate_name
       FROM crm_leads l
       LEFT JOIN users u ON u.id = l.affiliate_id
       WHERE ${where}
       ORDER BY l.score DESC, l.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    res.json({ status: 'success', data: rows });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

module.exports = {
  getAffiliateRegistrations,
  getAffiliateCustomers,
  getAffiliateOpportunities,
  getAffiliateCustomerScores,
};
