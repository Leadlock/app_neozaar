const pool = require('../config/database');
// Matches UserRole.SUPERADMIN ('SUPER_ADMIN'), UserRole.MANAGER ('ROLE_MANAGER')
// and UserRole.MARKETING ('MARKETING') in the Angular route guard
// (app.routes.ts). Do not add "ADMIN" here: it is a real, broader role used
// across the app for non-marketing admin functions and was never intended to
// see Marketing contact data. MARKETING is a dedicated role whose entire
// purpose is Marketing + Catalog, so it is a full marketing manager here.
const MARKETING_ROLES = new Set(["SUPER_ADMIN", "ROLE_MANAGER", "MARKETING"]);

function requireMarketingManager(req, res, next) {
  if (!MARKETING_ROLES.has(req.user?.role_type)) {
    return res.status(403).json({
      status: "fail",
      message: "Access denied. Only Super Admin or Marketing Manager can access Marketing.",
    });
  }
  return next();
}

function requireMarketingPermission(permission) {
  return async (req,res,next) => {
    if (MARKETING_ROLES.has(req.user?.role_type)) return next();
    try {
      const granted=(await pool.query('SELECT 1 FROM marketing_user_permissions WHERE user_id=$1 AND permission IN($2,\'MARKETING_VIEW\')',[req.user?.id,permission])).rows[0];
      if(granted)return next();
    } catch (_) {}
    return res.status(403).json({status:'fail',message:`Missing Marketing permission: ${permission}`});
  };
}

module.exports = { requireMarketingManager, requireMarketingPermission, MARKETING_ROLES };
