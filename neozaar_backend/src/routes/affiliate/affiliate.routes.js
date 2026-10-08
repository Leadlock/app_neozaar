/**
 * Affiliate Internal Routes
 * ─────────────────────────────────────────────────────────────
 * All routes require JWT + affiliate role verification.
 *
 * Route map:
 *
 * Dashboard
 *   GET  /dashboard              — Affiliate's own dashboard
 *   GET  /manager-dashboard      — A_MANAGER + SuperAdmin aggregate view
 *   GET  /superadmin-progress    — SuperAdmin Affiliate Progress view
 *
 * Affiliate Management (A_MANAGER / SuperAdmin)
 *   GET  /affiliates             — List affiliates
 *   GET  /affiliates/:id         — Get affiliate
 *   POST /affiliates             — Create affiliate
 *   PUT  /affiliates/:id         — Update affiliate
 *   POST /affiliates/:id/status  — Activate / deactivate
 *   POST /affiliates/:id/reassign-customer  — Explicit customer reassign
 *   GET  /affiliates/:id/attribution-conflicts
 *
 * Assignments
 *   GET  /affiliates/:id/assignments
 *   POST /affiliates/:id/assignments
 *   DELETE /affiliates/:id/assignments/:assignId
 *
 * Links
 *   GET  /affiliates/:id/links
 *   POST /affiliates/:id/links
 *
 * Customers (affiliate-scoped)
 *   GET  /customers              — Leads attributed to affiliate
 *   GET  /opportunities          — Opportunities for affiliated leads
 *   GET  /customer-scores        — Customer scores for affiliated leads
 *
 * Database
 *   GET  /database               — Contact list
 *   GET  /database/stats         — Database stats
 *   POST /database/contacts      — Add single contact
 *   POST /database/import        — Bulk import
 *   DELETE /database/contacts/:id
 *
 * Campaigns
 *   GET  /campaigns
 *   GET  /campaigns/:id
 *   POST /campaigns
 *   PUT  /campaigns/:id
 *   POST /campaigns/:id/send
 *   GET  /campaigns/:id/sends
 *
 * Admin
 *   GET  /audit-log              — Affiliate audit trail
 *   GET  /conflicts              — Attribution conflicts (all)
 */
const router = require('express').Router();
const verifyToken = require('../../middlewares/auth');
const {
  requireAffiliateAccess,
  requireAffiliateManager,
  resolveAffiliateScope,
  assertOwnAffiliate,
} = require('../../middlewares/affiliate.middleware');

const mgmtCtrl     = require('../../controllers/affiliate/affiliate.management.controller');
const custCtrl     = require('../../controllers/affiliate/affiliate.customers.controller');
const dbCtrl       = require('../../controllers/affiliate/affiliate.database.controller');
const campCtrl     = require('../../controllers/affiliate/affiliate.campaigns.controller');
const reportCtrl   = require('../../controllers/affiliate/affiliate.reporting.controller');

// All routes require JWT
router.use(verifyToken);
router.use(async (req, res, next) => {
  try {
    const { rows } = await require('../../config/database').query(
      'SELECT id,role_type FROM users WHERE id=$1 AND is_active=TRUE', [req.user.id]);
    if (!rows.length) return res.status(401).json({ status: 'fail', message: 'Account inactive or deleted. Please sign in again.' });
    req.user = { ...req.user, ...rows[0] };
    next();
  } catch(e) { res.status(503).json({ status: 'fail', message: 'Unable to validate account' }); }
});

// ── Dashboards ────────────────────────────────────────────────────
router.get('/dashboard',
  requireAffiliateAccess, resolveAffiliateScope,
  reportCtrl.getAffiliateDashboard
);
router.get('/manager-dashboard',
  requireAffiliateManager,
  reportCtrl.getManagerDashboard
);
router.get('/superadmin-progress',
  requireAffiliateManager,
  reportCtrl.getSuperAdminAffiliateProgress
);

// ── Affiliate Management ──────────────────────────────────────────
router.get('/affiliates',
  requireAffiliateManager,
  mgmtCtrl.getAffiliates
);
router.get('/affiliates/:id',
  requireAffiliateManager,
  mgmtCtrl.getAffiliateById
);
router.post('/affiliates',
  requireAffiliateManager,
  mgmtCtrl.createAffiliate
);
router.put('/affiliates/:id',
  requireAffiliateManager,
  mgmtCtrl.updateAffiliate
);
router.post('/affiliates/:id/status',
  requireAffiliateManager,
  mgmtCtrl.setAffiliateStatus
);
router.post('/affiliates/:id/reassign-customer',
  requireAffiliateManager,
  mgmtCtrl.reassignCustomer
);
router.get('/affiliates/:id/attribution-conflicts',
  requireAffiliateManager,
  mgmtCtrl.getAttributionConflicts
);

// ── Assignments ──────────────────────────────────────────────────
router.get('/affiliates/:id/assignments',
  requireAffiliateManager,
  mgmtCtrl.getAssignments
);
router.post('/affiliates/:id/assignments',
  requireAffiliateManager,
  mgmtCtrl.addAssignment
);
router.delete('/affiliates/:id/assignments/:assignId',
  requireAffiliateManager,
  mgmtCtrl.removeAssignment
);

// ── Links ─────────────────────────────────────────────────────────
// Affiliate can view their own links; manager can view any
router.get('/affiliates/:id/links',
  requireAffiliateAccess, assertOwnAffiliate,
  mgmtCtrl.getLinks
);
router.post('/affiliates/:id/links',
  requireAffiliateAccess, assertOwnAffiliate,
  mgmtCtrl.createLink
);

// ── Affiliate-scoped Customer / Opportunity views ─────────────────
router.get('/registrations',
  requireAffiliateAccess, resolveAffiliateScope,
  custCtrl.getAffiliateRegistrations
);
router.get('/customers',
  requireAffiliateAccess, resolveAffiliateScope,
  custCtrl.getAffiliateCustomers
);
router.get('/opportunities',
  requireAffiliateAccess, resolveAffiliateScope,
  custCtrl.getAffiliateOpportunities
);
router.get('/customer-scores',
  requireAffiliateAccess, resolveAffiliateScope,
  custCtrl.getAffiliateCustomerScores
);

// ── Database ─────────────────────────────────────────────────────
router.get('/database',
  requireAffiliateAccess, resolveAffiliateScope,
  dbCtrl.getContacts
);
router.get('/database/stats',
  requireAffiliateAccess, resolveAffiliateScope,
  dbCtrl.getDatabaseStats
);
router.post('/database/contacts',
  requireAffiliateAccess, resolveAffiliateScope,
  dbCtrl.addContact
);
router.post('/database/import',
  requireAffiliateAccess, resolveAffiliateScope,
  dbCtrl.importContacts
);
router.delete('/database/contacts/:id',
  requireAffiliateAccess, resolveAffiliateScope,
  dbCtrl.deleteContact
);

// ── Campaigns ─────────────────────────────────────────────────────
router.get('/campaigns',
  requireAffiliateAccess, resolveAffiliateScope,
  campCtrl.getCampaigns
);
router.get('/campaigns/:id',
  requireAffiliateAccess, resolveAffiliateScope,
  campCtrl.getCampaignById
);
router.post('/campaigns',
  requireAffiliateAccess, resolveAffiliateScope,
  campCtrl.createCampaign
);
router.put('/campaigns/:id',
  requireAffiliateAccess, resolveAffiliateScope,
  campCtrl.updateCampaign
);
router.post('/campaigns/:id/send',
  requireAffiliateAccess, resolveAffiliateScope,
  campCtrl.sendCampaign
);
router.get('/campaigns/:id/sends',
  requireAffiliateAccess, resolveAffiliateScope,
  campCtrl.getCampaignSends
);

// ── Admin ─────────────────────────────────────────────────────────
router.get('/audit-log',
  requireAffiliateManager,
  mgmtCtrl.getAuditLog
);
router.get('/conflicts',
  requireAffiliateManager,
  (req, res) => {
    req.params.id = 'all';
    mgmtCtrl.getAttributionConflicts(req, res);
  }
);

module.exports = router;
