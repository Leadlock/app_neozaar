const router = require('express').Router();
const verifyToken = require('../../middlewares/auth');
const { crmAccess, crmRole } = require('../../middlewares/crm.middleware');

const leadsCtrl        = require('../../controllers/crm/leads.controller');
const accountsCtrl     = require('../../controllers/crm/accounts.controller');
const contactsCtrl     = require('../../controllers/crm/contacts.controller');
const oppsCtrl         = require('../../controllers/crm/opportunities.controller');
const oppProdsCtrl     = require('../../controllers/crm/opportunity_products.controller');
const activitiesCtrl   = require('../../controllers/crm/activities.controller');
const dashCtrl         = require('../../controllers/crm/dashboard.controller');
const salesOrdersCtrl  = require('../../controllers/crm/sales-orders.controller');
const invoicesCtrl     = require('../../controllers/crm/invoices.controller');
const usersCtrl        = require('../../controllers/crm/users.controller');
const quotesCtrl       = require('../../controllers/crm/quotes.controller');
const rolesCtrl        = require('../../controllers/crm/roles.controller');
const scoringCtrl      = require('../../controllers/crm/scoring.controller');
const notifCtrl        = require('../../controllers/crm/notifications.controller');
const trashCtrl        = require('../../controllers/crm/trash.controller');

// All CRM routes require JWT + CRM role
router.use(verifyToken, crmAccess);
router.use(require('../../middlewares/affiliate-crm.middleware'));

// ── Dashboard ─────────────────────────────────────────────────
router.get('/dashboard', dashCtrl.getDashboard);
router.get('/audit-logs', crmRole(['SUPER_ADMIN']), dashCtrl.getAuditLogs);

// ── Leads ─────────────────────────────────────────────────────
// Specific routes before parameterised :id routes
router.get('/leads/duplicates', leadsCtrl.findDuplicateLeads);
router.get('/leads', leadsCtrl.getLeads);
router.get('/leads/:id', leadsCtrl.getLeadById);
router.post('/leads', leadsCtrl.createLead);
router.put('/leads/:id', leadsCtrl.updateLead);
router.delete('/leads/:id', crmRole(['SUPER_ADMIN','ADMIN']), leadsCtrl.deleteLead);
router.post('/leads/:id/assign', crmRole(['SUPER_ADMIN','ADMIN','M_SELLER']), leadsCtrl.assignLead);
router.get('/leads/:id/ownership-history', leadsCtrl.getLeadOwnershipHistory);
router.post('/leads/:id/convert', leadsCtrl.convertLead);

// ── Accounts ──────────────────────────────────────────────────
router.get('/accounts', accountsCtrl.getAccounts);
router.get('/accounts/:id', accountsCtrl.getAccountById);
router.post('/accounts', accountsCtrl.createAccount);
router.put('/accounts/:id', accountsCtrl.updateAccount);
router.delete('/accounts/:id', crmRole(['SUPER_ADMIN','ADMIN']), accountsCtrl.deleteAccount);

// ── Contacts ──────────────────────────────────────────────────
router.get('/contacts', contactsCtrl.getContacts);
router.get('/contacts/:id', contactsCtrl.getContactById);
router.post('/contacts', contactsCtrl.createContact);
router.put('/contacts/:id', contactsCtrl.updateContact);
router.delete('/contacts/:id', crmRole(['SUPER_ADMIN','ADMIN']), contactsCtrl.deleteContact);

// ── Opportunities ─────────────────────────────────────────────
// Specific routes before parameterised :id routes
router.get('/opportunities/follow-up', oppsCtrl.getFollowUpOpportunities);
router.get('/opportunities/aging', oppsCtrl.getAgingOpportunities);
router.get('/opportunities/valid-transitions/:stage', oppsCtrl.getValidTransitions);
router.get('/opportunities', oppsCtrl.getOpportunities);
router.get('/opportunities/:id', oppsCtrl.getOpportunityById);
router.post('/opportunities', oppsCtrl.createOpportunity);
router.put('/opportunities/:id', oppsCtrl.updateOpportunity);
router.delete('/opportunities/:id', oppsCtrl.deleteOpportunity);
router.post('/opportunities/:id/assign-seller', crmRole(['M_SELLER']), oppsCtrl.assignSellerToOpportunity);
router.get('/opportunities/:id/available-sellers', crmRole(['M_SELLER']), oppsCtrl.getAvailableSellers);
// Seller-to-seller hand-off: a SELLER shares an opp they own with another seller
router.get('/opportunities/:id/share-sellers', crmRole(['SELLER','M_SELLER']), oppsCtrl.getShareableSellers);
router.post('/opportunities/:id/share-seller', crmRole(['SELLER','M_SELLER']), oppsCtrl.shareOpportunityToSeller);
router.post('/opportunities/:id/reopen', crmRole(['SUPER_ADMIN','ADMIN','M_SELLER']), oppsCtrl.reopenOpportunity);
router.patch('/opportunities/:id/stage', oppsCtrl.changeStage);

// ── Opportunity Products (Marketplace ↔ CRM) ─────────────────
router.get('/opportunities/:id/products', oppProdsCtrl.getOpportunityProducts);
router.post('/opportunities/:id/products', oppProdsCtrl.addOpportunityProduct);
router.put('/opportunities/:id/products/:productId', oppProdsCtrl.updateOpportunityProduct);
router.delete('/opportunities/:id/products/:productId', oppProdsCtrl.removeOpportunityProduct);

// ── Activities ────────────────────────────────────────────────
router.get('/activities', activitiesCtrl.getActivities);
router.post('/activities', activitiesCtrl.createActivity);
router.delete('/activities/:id', crmRole(['SUPER_ADMIN','ADMIN']), activitiesCtrl.deleteActivity);

// ── Tasks ─────────────────────────────────────────────────────
router.get('/tasks', activitiesCtrl.getTasks);
router.post('/tasks', activitiesCtrl.createTask);
router.put('/tasks/:id', activitiesCtrl.updateTask);
router.delete('/tasks/:id', crmRole(['SUPER_ADMIN','ADMIN']), activitiesCtrl.deleteTask);

// ── Users & Permissions ───────────────────────────────────────
router.get('/users', crmRole(['SUPER_ADMIN','ADMIN']), usersCtrl.getUsers);
router.put('/users/:id/role', crmRole(['SUPER_ADMIN']), usersCtrl.updateUserRole);
router.get('/users/:id/permissions', crmRole(['SUPER_ADMIN','ADMIN']), usersCtrl.getUserPermissions);
router.put('/users/:id/permissions', crmRole(['SUPER_ADMIN','ADMIN']), usersCtrl.updateUserPermissions);

// ── CRM Roles ─────────────────────────────────────────────────
router.get('/roles', crmRole(['SUPER_ADMIN','ADMIN']), rolesCtrl.getRoles);
router.post('/roles', crmRole(['SUPER_ADMIN','ADMIN']), rolesCtrl.createRole);
router.put('/roles/:id', crmRole(['SUPER_ADMIN','ADMIN']), rolesCtrl.updateRole);
router.delete('/roles/:id', crmRole(['SUPER_ADMIN']), rolesCtrl.deleteRole);
router.get('/roles/:id/users', crmRole(['SUPER_ADMIN','ADMIN']), rolesCtrl.getRoleUsers);
router.post('/roles/:id/users', crmRole(['SUPER_ADMIN','ADMIN']), rolesCtrl.addUserToRole);
router.delete('/roles/:id/users/:userId', crmRole(['SUPER_ADMIN','ADMIN']), rolesCtrl.removeUserFromRole);

// ── Sales Orders ──────────────────────────────────────────────
router.get('/sales-orders',        salesOrdersCtrl.getSalesOrders);
router.post('/sales-orders',       salesOrdersCtrl.createSalesOrder);
router.put('/sales-orders/:id',    salesOrdersCtrl.updateSalesOrder);
router.delete('/sales-orders/:id', crmRole(['SUPER_ADMIN','ADMIN']), salesOrdersCtrl.deleteSalesOrder);

// ── Invoices ──────────────────────────────────────────────────
router.get('/invoices',        invoicesCtrl.getInvoices);
router.post('/invoices',       invoicesCtrl.createInvoice);
router.put('/invoices/:id',    invoicesCtrl.updateInvoice);
router.delete('/invoices/:id', crmRole(['SUPER_ADMIN','ADMIN']), invoicesCtrl.deleteInvoice);

// ── Quotes ────────────────────────────────────────────────────
router.get('/quotes', quotesCtrl.getQuotes);
router.post('/quotes', quotesCtrl.createQuote);
router.put('/quotes/:id', quotesCtrl.updateQuote);
router.delete('/quotes/:id', quotesCtrl.deleteQuote);
router.post('/quotes/:id/send', quotesCtrl.sendQuote);
router.post('/quotes/:id/accept', quotesCtrl.acceptQuote);

// ── Customer Scoring (authenticated) ─────────────────────────
router.post('/scoring/event', scoringCtrl.recordScoringEvent);
router.get('/scoring/history/:lead_id', scoringCtrl.getScoringHistory);

// ── Trash (SUPER_ADMIN only — hard-delete soft-deleted records) ──
router.get('/trash',        crmRole(['SUPER_ADMIN']), trashCtrl.getTrash);
router.delete('/trash/purge', crmRole(['SUPER_ADMIN']), trashCtrl.purgeTrash);

// ── Notifications ─────────────────────────────────────────────
router.get('/notifications', notifCtrl.getNotifications);
router.put('/notifications/read-all', notifCtrl.markAllAsRead);
router.put('/notifications/:id/read', notifCtrl.markAsRead);
router.put('/notifications/:id/unread', notifCtrl.markAsUnread);

module.exports = router;
