const router = require('express').Router();
const verifyToken = require('../../middlewares/auth');
const { getAdminTrash, purgeAdminTrash } = require('../../controllers/crm/trash.controller');

// SUPERADMIN only
function superAdminOnly(req, res, next) {
  if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user?.role_type)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}

router.use(verifyToken, superAdminOnly);

router.get('/',           getAdminTrash);
router.delete('/purge',   purgeAdminTrash);

module.exports = router;
