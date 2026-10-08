const pool = require('../../config/database');

const ADMIN_ROLES   = ['SUPER_ADMIN', 'ADMIN'];
const SELLER_ROLES  = ['ISV_SELLER', 'SELLER', 'AGENT', 'A_MANAGER', 'ISV', 'SUPPORT_PARTNER'];

// GET /api/internal/crm/dashboard[?view_as=<userId>]
//
// Scoping rules:
//   SUPER_ADMIN / ADMIN  → see all records by default.
//                          If ?view_as=<userId> supplied, scope to that user instead.
//   M_SELLER             → sees all records (no per-user restriction).
//   All other CRM roles  → always scoped to their own records; view_as ignored.
const getDashboard = async (req, res) => {
  try {
    const isAdmin    = ADMIN_ROLES.includes(req.user.role_type);
    const isMSeller  = req.user.role_type === 'M_SELLER';
    const isRestricted = SELLER_ROLES.includes(req.user.role_type);

    // Resolve the effective user ID to scope by (null = no restriction = all records)
    let scopeId  = null;
    let viewedUser = null;

    if (isAdmin && req.query.view_as) {
      // Admin requested a specific user's view
      const uid = parseInt(req.query.view_as, 10);
      if (!isNaN(uid) && uid > 0) {
        const { rows } = await pool.query(
          'SELECT id, name, email, role_type FROM users WHERE id=$1 LIMIT 1', [uid]
        );
        if (rows.length) { scopeId = uid; viewedUser = rows[0]; }
      }
    } else if (!isAdmin && !isMSeller) {
      // Restricted role — always scope to themselves
      scopeId = req.user.id;
    }
    // isAdmin (no view_as) or isMSeller → scopeId stays null → all records

    // Build WHERE fragments — table-qualified to avoid ambiguity in JOINed queries
    const leadFilter   = scopeId
      ? `AND (l.owner_id = ${scopeId} OR l.created_by = ${scopeId})`
      : '';
    const oppFilter    = scopeId
      ? `AND (o.owner_id = ${scopeId} OR o.seller_id = ${scopeId} OR o.created_by = ${scopeId})`
      : '';
    const taskFilter   = scopeId ? `AND t.owner_id = ${scopeId}` : '';
    const actFilter    = scopeId ? `AND a.owner_id = ${scopeId}` : '';

    const [leads, opps, tasks, activities, pipeline, topSellers, recentOpps] = await Promise.all([
      pool.query(
        `SELECT l.status, COUNT(*) FROM crm_leads l
         WHERE l.is_deleted=FALSE ${leadFilter} GROUP BY l.status ORDER BY COUNT(*) DESC`
      ),
      pool.query(
        `SELECT o.stage, COUNT(*), COALESCE(SUM(o.deal_value),0) AS total_value
         FROM crm_opportunities o WHERE o.is_deleted=FALSE ${oppFilter}
         GROUP BY o.stage ORDER BY COUNT(*) DESC`
      ),
      pool.query(
        `SELECT t.status, COUNT(*) FROM crm_tasks t
         WHERE t.is_deleted=FALSE ${taskFilter} GROUP BY t.status`
      ),
      pool.query(
        `SELECT a.type, COUNT(*) FROM crm_activities a
         WHERE 1=1 ${actFilter} GROUP BY a.type ORDER BY COUNT(*) DESC`
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(o.deal_value),0)       AS total_pipeline,
           COALESCE(SUM(o.neozaar_revenue),0)  AS total_revenue,
           COUNT(*)                            AS total_opportunities,
           COUNT(*) FILTER (WHERE o.stage='Closed Won')  AS won_count,
           COUNT(*) FILTER (WHERE o.stage='Closed Lost') AS lost_count
         FROM crm_opportunities o
         WHERE o.is_deleted=FALSE AND o.stage NOT IN ('Closed Lost') ${oppFilter}`
      ),
      // Top sellers by deal_value — only meaningful for admin/global view
      !scopeId ? pool.query(
        `SELECT u.name, u.role_type,
           COUNT(o.id) AS opp_count,
           COALESCE(SUM(o.deal_value),0) AS total_value
         FROM crm_opportunities o
         JOIN users u ON u.id = o.seller_id
         WHERE o.is_deleted=FALSE AND o.stage NOT IN ('Closed Lost')
         GROUP BY u.id, u.name, u.role_type
         ORDER BY total_value DESC LIMIT 5`
      ) : Promise.resolve({ rows: [] }),
      // 5 most recent opportunities for the scoped view
      pool.query(
        `SELECT o.name, o.stage, o.deal_value, o.created_at,
                c.name AS contact_name, c.company AS contact_company,
                u.name AS owner_name
         FROM crm_opportunities o
         LEFT JOIN crm_contacts c ON c.id = o.contact_id
         LEFT JOIN users u ON u.id = o.owner_id
         WHERE o.is_deleted=FALSE ${oppFilter}
         ORDER BY o.created_at DESC LIMIT 5`
      ),
    ]);

    res.json({
      status: 'success',
      data: {
        leads_by_status:       leads.rows,
        opportunities_by_stage: opps.rows,
        tasks_by_status:       tasks.rows,
        activities_by_type:    activities.rows,
        pipeline_summary:      pipeline.rows[0],
        top_sellers:           topSellers.rows,
        recent_opportunities:  recentOpps.rows,
        // Meta — tells the frontend whose data this is
        scope: scopeId
          ? { type: 'user', user: viewedUser }
          : { type: isRestricted ? 'self' : 'all' },
      }
    });
  } catch (e) {
    console.error('[CRM Dashboard] Error:', e.message);
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// GET /api/internal/crm/audit-logs (SUPER_ADMIN only)
const getAuditLogs = async (req, res) => {
  try {
    const { entity_type, entity_id, user_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (entity_type) { params.push(entity_type); conditions.push(`entity_type = $${params.length}`); }
    if (entity_id) { params.push(entity_id); conditions.push(`entity_id = $${params.length}`); }
    if (user_id) { params.push(user_id); conditions.push(`al.user_id = $${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT al.*, u.name AS user_name, u.email AS user_email FROM crm_audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${where} ORDER BY al.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`, params
    );
    res.json({ status: 'success', data: rows });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

module.exports = { getDashboard, getAuditLogs };
