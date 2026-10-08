/**
 * Internal WhatsApp conversation-log API — SUPER_ADMIN only.
 * Mounted at /api/internal/whatsapp.
 */
const router = require('express').Router();
const verifyToken = require('../middlewares/auth');
const { crmAccess, crmRole } = require('../middlewares/crm.middleware');
const ctrl = require('../controllers/whatsapp/conversationLog.controller');
const inbox = require('../controllers/whatsapp/agentInbox.controller');

router.use(verifyToken, crmAccess, crmRole(['SUPER_ADMIN']));

for (const action of ['takeover', 'release', 'messages', 'read']) {
  router.post(`/conversations/:phone/${action}`, inbox.action(action));
}

router.get('/stats', ctrl.stats);
router.get('/contacts', ctrl.listContacts);
router.get('/conversations/:phone/export', ctrl.exportConversation);
router.get('/conversations/:phone', ctrl.getConversation);
router.delete('/conversations/:phone', ctrl.deleteConversation);

module.exports = router;
