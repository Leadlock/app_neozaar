// CRUD for marketing_user_permissions — until now nothing wrote to this
// table at all, so requireMarketingPermission()'s granular-grant path in
// marketing.middleware.js was dead code: only full managers could ever do
// anything under /api/marketing/platform.
const pool = require("../../config/database");

// Matches every permission actually checked with requireMarketingPermission(...)
// across the platform routes, plus the "see everything" catch-all the
// middleware already treats as implicit view access.
const GRANTABLE_PERMISSIONS = ["MARKETING_VIEW", "MARKETING_JOURNEYS", "MARKETING_ANALYTICS", "MARKETING_AUTOMATIONS", "MARKETING_SETTINGS"];

async function list() {
  return (await pool.query(
    `SELECT p.user_id, p.permission, p.granted_by, p.created_at, u.name user_name, u.email user_email
     FROM marketing_user_permissions p JOIN users u ON u.id = p.user_id
     ORDER BY u.name, p.permission`,
  )).rows;
}

async function grant(userId, permission, grantedBy) {
  if (!GRANTABLE_PERMISSIONS.includes(permission)) throw Object.assign(new Error(`Unknown permission: ${permission}`), { statusCode: 400 });
  const user = (await pool.query("SELECT id FROM users WHERE id=$1", [userId])).rows[0];
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });
  return (await pool.query(
    `INSERT INTO marketing_user_permissions (user_id, permission, granted_by) VALUES ($1,$2,$3)
     ON CONFLICT (user_id, permission) DO UPDATE SET granted_by=EXCLUDED.granted_by RETURNING *`,
    [userId, permission, grantedBy],
  )).rows[0];
}

async function revoke(userId, permission) {
  const { rowCount } = await pool.query("DELETE FROM marketing_user_permissions WHERE user_id=$1 AND permission=$2", [userId, permission]);
  if (!rowCount) throw Object.assign(new Error("Permission grant not found"), { statusCode: 404 });
  return { userId, permission };
}

module.exports = { GRANTABLE_PERMISSIONS, list, grant, revoke };
