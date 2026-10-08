/**
 * Affiliate Reporting / Dashboard Controller
 * ─────────────────────────────────────────────────────────────
 * Derives all metrics from existing CRM tables.
 * No duplicate data stores.
 */
const pool = require('../../config/database');

// ── GET /api/affiliate/dashboard ─────────────────────────────────
// Affiliate's own dashboard metrics
const getAffiliateDashboard = async (req, res) => {
  try {
    const affiliateId = req.affiliateScopeId || req.user.id;

    const [customers, opps, campaigns, contacts, links] = await Promise.all([
      // Customer stats
      pool.query(
        `SELECT
           COUNT(*) AS total_customers,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_this_month,
           (SELECT COUNT(DISTINCT aa.user_id) FROM affiliate_attributions aa
            JOIN users u ON u.id=aa.user_id
            WHERE aa.affiliate_id=$1 AND aa.status='pending' AND u.role_type='CLIENT'
              AND u.is_email_verified=FALSE) AS pending_verification
         FROM crm_leads
         WHERE affiliate_id=$1 AND is_deleted=FALSE`,
        [affiliateId]
      ),
      // Opportunity stats
      pool.query(
        `SELECT
           COUNT(*) AS total_opps,
           COUNT(*) FILTER (WHERE stage='Closed Won') AS won,
           COUNT(*) FILTER (WHERE stage='Closed Lost') AS lost,
           COUNT(*) FILTER (WHERE stage NOT IN ('Closed Won','Closed Lost')) AS active,
           COALESCE(SUM(deal_value) FILTER (WHERE stage NOT IN ('Closed Lost')),0) AS pipeline_value,
           COALESCE(SUM(final_deal_value) FILTER (WHERE stage='Closed Won'),0) AS won_revenue
         FROM crm_opportunities
         WHERE affiliate_id=$1 AND is_deleted=FALSE`,
        [affiliateId]
      ),
      // Campaign stats
      pool.query(
        `SELECT COUNT(*) AS total_campaigns,
                COUNT(*) FILTER (WHERE status='sent') AS sent_campaigns,
                COALESCE(SUM(sent_count),0) AS total_sent,
                COALESCE(SUM(registered_count),0) AS total_registered
         FROM affiliate_campaigns WHERE affiliate_id=$1`,
        [affiliateId]
      ),
      // Contact database stats
      pool.query(
        `SELECT COUNT(*) AS total_contacts,
                COUNT(*) FILTER (WHERE crm_lead_id IS NOT NULL) AS registered_contacts
         FROM affiliate_contacts WHERE affiliate_id=$1`,
        [affiliateId]
      ),
      // Link stats
      pool.query(
        `SELECT
           (SELECT COUNT(*) FROM affiliate_links al WHERE al.affiliate_id=$1) AS total_links,
           (SELECT COUNT(*) FROM affiliate_links al WHERE al.affiliate_id=$1 AND al.is_active=TRUE) AS active_links,
           COUNT(*) AS total_clicks,
           COUNT(*) FILTER (WHERE alc.clicked_at >= NOW()-INTERVAL '7 days') AS clicks_7_days,
           COUNT(*) FILTER (WHERE alc.clicked_at >= NOW()-INTERVAL '30 days') AS clicks_30_days,
           COUNT(DISTINCT COALESCE(alc.ip_hash,'click:'||alc.id::text)) AS unique_visitors,
           (SELECT COUNT(DISTINCT aa.user_id) FROM affiliate_attributions aa
             WHERE aa.affiliate_id=$1 AND aa.affiliate_link_id IS NOT NULL
               AND aa.user_id IS NOT NULL AND aa.status IN ('pending','active','superseded')) AS registrations,
           (SELECT COUNT(DISTINCT aa.crm_lead_id) FROM affiliate_attributions aa
             WHERE aa.affiliate_id=$1 AND aa.affiliate_link_id IS NOT NULL
               AND aa.crm_lead_id IS NOT NULL AND aa.status='active') AS verified_customers
         FROM affiliate_link_clicks alc WHERE alc.affiliate_id=$1`,
        [affiliateId]
      ),
    ]);

    const cust = customers.rows[0];
    const opp  = opps.rows[0];
    const camp = campaigns.rows[0];
    const cont = contacts.rows[0];
    const lnk  = links.rows[0];

    const totalOpps  = parseInt(opp.total_opps) || 0;
    const wonOpps    = parseInt(opp.won) || 0;
    const convRate   = totalOpps > 0 ? Math.round((wonOpps / totalOpps) * 100) : 0;
    const linkClicks = parseInt(lnk.total_clicks) || 0;
    const linkRegistrations = parseInt(lnk.registrations) || 0;
    const clickToRegistrationRate = linkClicks > 0
      ? Math.round((linkRegistrations / linkClicks) * 1000) / 10 : 0;

    // Average customer score
    const { rows: scoreRow } = await pool.query(
      `SELECT COALESCE(AVG(score),0)::numeric(10,1) AS avg_score
       FROM crm_leads WHERE affiliate_id=$1 AND is_deleted=FALSE`,
      [affiliateId]
    );

    res.json({
      status: 'success',
      data: {
        customers: {
          total: parseInt(cust.total_customers) || 0,
          new_this_month: parseInt(cust.new_this_month) || 0,
          pending_verification: parseInt(cust.pending_verification) || 0,
        },
        opportunities: {
          total: totalOpps,
          active: parseInt(opp.active) || 0,
          won: wonOpps,
          lost: parseInt(opp.lost) || 0,
          pipeline_value: parseFloat(opp.pipeline_value) || 0,
          won_revenue: parseFloat(opp.won_revenue) || 0,
          conversion_rate: convRate,
        },
        scoring: {
          avg_customer_score: parseFloat(scoreRow[0].avg_score) || 0,
        },
        campaigns: {
          total: parseInt(camp.total_campaigns) || 0,
          sent: parseInt(camp.sent_campaigns) || 0,
          emails_sent: parseInt(camp.total_sent) || 0,
          registrations: parseInt(camp.total_registered) || 0,
        },
        database: {
          total_contacts: parseInt(cont.total_contacts) || 0,
          registered: parseInt(cont.registered_contacts) || 0,
        },
        links: {
          total: parseInt(lnk.total_links) || 0,
          active: parseInt(lnk.active_links) || 0,
          total_clicks: linkClicks,
          clicks_7_days: parseInt(lnk.clicks_7_days) || 0,
          clicks_30_days: parseInt(lnk.clicks_30_days) || 0,
          unique_visitors: parseInt(lnk.unique_visitors) || 0,
          registrations: linkRegistrations,
          verified_customers: parseInt(lnk.verified_customers) || 0,
          click_to_registration_rate: clickToRegistrationRate,
        },
      },
    });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── GET /api/affiliate/manager-dashboard ─────────────────────────
// A_MANAGER / SUPER_ADMIN overview of all affiliates
const getManagerDashboard = async (req, res) => {
  try {
    const [overview, byAffiliate, recentActivity] = await Promise.all([
      // Global affiliate totals
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE role_type IN ('AGENT','A_MANAGER')) AS total_affiliates,
          (SELECT COUNT(*) FROM users WHERE role_type IN ('AGENT','A_MANAGER') AND is_active=TRUE) AS active_affiliates,
          (SELECT COUNT(*) FROM crm_leads WHERE affiliate_id IS NOT NULL AND is_deleted=FALSE) AS total_customers,
          (SELECT COUNT(*) FROM crm_leads WHERE affiliate_id IS NOT NULL AND is_deleted=FALSE
            AND created_at >= NOW()-INTERVAL '30 days') AS customers_this_month,
          (SELECT COUNT(*) FROM crm_opportunities WHERE affiliate_id IS NOT NULL AND is_deleted=FALSE) AS total_opps,
          (SELECT COUNT(*) FROM crm_opportunities WHERE affiliate_id IS NOT NULL AND is_deleted=FALSE
            AND stage NOT IN ('Closed Won','Closed Lost')) AS open_opps,
          (SELECT COUNT(*) FROM crm_opportunities WHERE affiliate_id IS NOT NULL AND is_deleted=FALSE
            AND stage='Closed Won') AS won_opps,
          (SELECT COUNT(*) FROM crm_opportunities WHERE affiliate_id IS NOT NULL AND is_deleted=FALSE
            AND stage='Closed Lost') AS lost_opps,
          (SELECT COALESCE(SUM(deal_value),0) FROM crm_opportunities
            WHERE affiliate_id IS NOT NULL AND is_deleted=FALSE
            AND stage NOT IN ('Closed Lost')) AS pipeline_value,
          (SELECT COALESCE(SUM(final_deal_value),0) FROM crm_opportunities
            WHERE affiliate_id IS NOT NULL AND is_deleted=FALSE AND stage='Closed Won') AS won_revenue,
          (SELECT COALESCE(AVG(score),0)::numeric(10,1) FROM crm_leads
            WHERE affiliate_id IS NOT NULL AND is_deleted=FALSE) AS avg_customer_score
      `),

      // Per-affiliate breakdown
      pool.query(`
        SELECT u.id, u.name, u.email, u.is_active, u.ref_code,
          (SELECT COUNT(*) FROM crm_leads l
           WHERE l.affiliate_id=u.id AND l.is_deleted=FALSE) AS customers,
          (SELECT COUNT(*) FROM crm_opportunities o
           WHERE o.affiliate_id=u.id AND o.is_deleted=FALSE) AS total_opps,
          (SELECT COUNT(*) FROM crm_opportunities o
           WHERE o.affiliate_id=u.id AND o.is_deleted=FALSE AND o.stage='Closed Won') AS won,
          (SELECT COALESCE(SUM(o.deal_value),0) FROM crm_opportunities o
           WHERE o.affiliate_id=u.id AND o.is_deleted=FALSE
           AND o.stage NOT IN ('Closed Lost')) AS pipeline,
          (SELECT COALESCE(AVG(l.score),0)::numeric(10,1) FROM crm_leads l
           WHERE l.affiliate_id=u.id AND l.is_deleted=FALSE) AS avg_score
        FROM users u
        WHERE u.role_type IN ('AGENT','A_MANAGER')
        ORDER BY customers DESC
        LIMIT 50
      `),

      // Recent attribution activity
      pool.query(`
        SELECT aa.id, aa.attributed_at, aa.attribution_type,
               u.name AS affiliate_name,
               l.name AS lead_name, l.email AS lead_email
        FROM affiliate_attributions aa
        JOIN users u ON u.id = aa.affiliate_id
        LEFT JOIN crm_leads l ON l.id = aa.crm_lead_id
        WHERE aa.status='active'
        ORDER BY aa.attributed_at DESC
        LIMIT 10
      `),
    ]);

    res.json({
      status: 'success',
      data: {
        overview: overview.rows[0],
        affiliates: byAffiliate.rows,
        recent_activity: recentActivity.rows,
      },
    });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── GET /api/affiliate/superadmin-progress ───────────────────────
// SuperAdmin's affiliate progress view (additive — existing dashboard unchanged)
const getSuperAdminAffiliateProgress = async (req, res) => {
  try {
    // Reuse manager dashboard data — same queries, just different endpoint
    const [summary, topAffiliates, stagePipeline, recentOpps, conflicts] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE role_type IN ('AGENT','A_MANAGER') AND is_active=TRUE) AS active_affiliates,
          (SELECT COUNT(*) FROM crm_leads WHERE affiliate_id IS NOT NULL AND is_deleted=FALSE) AS attributed_customers,
          (SELECT COUNT(*) FROM crm_opportunities WHERE affiliate_id IS NOT NULL AND is_deleted=FALSE
            AND stage='Closed Won') AS won_opportunities,
          (SELECT COALESCE(SUM(final_deal_value),0) FROM crm_opportunities
            WHERE affiliate_id IS NOT NULL AND is_deleted=FALSE AND stage='Closed Won') AS won_revenue,
          (SELECT COALESCE(SUM(deal_value),0) FROM crm_opportunities
            WHERE affiliate_id IS NOT NULL AND is_deleted=FALSE
            AND stage NOT IN ('Closed Lost')) AS total_pipeline,
          (SELECT COUNT(*) FROM affiliate_attributions WHERE status='conflict') AS pending_conflicts
      `),

      pool.query(`
        SELECT u.id, u.name,
          (SELECT COUNT(*) FROM crm_leads l WHERE l.affiliate_id=u.id AND l.is_deleted=FALSE) AS customers,
          (SELECT COUNT(*) FROM crm_opportunities o
           WHERE o.affiliate_id=u.id AND o.is_deleted=FALSE AND o.stage='Closed Won') AS won,
          (SELECT COALESCE(SUM(deal_value),0) FROM crm_opportunities o
           WHERE o.affiliate_id=u.id AND o.is_deleted=FALSE
           AND o.stage NOT IN ('Closed Lost')) AS pipeline
        FROM users u
        WHERE u.role_type IN ('AGENT','A_MANAGER') AND u.is_active=TRUE
        ORDER BY customers DESC LIMIT 10
      `),

      pool.query(`
        SELECT o.stage, COUNT(*) AS count, COALESCE(SUM(deal_value),0) AS value
        FROM crm_opportunities o
        WHERE o.affiliate_id IS NOT NULL AND o.is_deleted=FALSE
        GROUP BY o.stage ORDER BY value DESC
      `),

      pool.query(`
        SELECT o.id, o.name, o.stage, o.deal_value, o.created_at,
               a.name AS affiliate_name, c.name AS contact_name
        FROM crm_opportunities o
        JOIN users a ON a.id = o.affiliate_id
        LEFT JOIN crm_contacts c ON c.id = o.contact_id
        WHERE o.affiliate_id IS NOT NULL AND o.is_deleted=FALSE
        ORDER BY o.created_at DESC LIMIT 10
      `),

      pool.query(`
        SELECT aa.id, aa.attributed_at, aa.conflict_notes,
               a.name AS new_affiliate_name,
               l.name AS lead_name, l.email AS lead_email
        FROM affiliate_attributions aa
        JOIN users a ON a.id = aa.affiliate_id
        LEFT JOIN crm_leads l ON l.id = aa.crm_lead_id
        WHERE aa.status='conflict'
        ORDER BY aa.created_at DESC LIMIT 20
      `),
    ]);

    res.json({
      status: 'success',
      data: {
        summary: summary.rows[0],
        top_affiliates: topAffiliates.rows,
        stage_pipeline: stagePipeline.rows,
        recent_opportunities: recentOpps.rows,
        attribution_conflicts: conflicts.rows,
      },
    });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

module.exports = {
  getAffiliateDashboard,
  getManagerDashboard,
  getSuperAdminAffiliateProgress,
};
