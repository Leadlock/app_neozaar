const pool = require('../config/database');

// Affiliate users consume the existing CRM through the dedicated scoped reports.
// Protect legacy CRM URLs too; hiding navigation alone is not authorization.
module.exports = async (req, res, next) => {
  const role = req.user?.role_type;
  if (!['AGENT','A_MANAGER'].includes(role)) return next();
  const deny = () => res.status(403).json({ status: 'fail', message: 'Use the affiliate CRM views for your authorized customers and opportunities' });
  if (/^\/notifications(?:\/|$)/.test(req.path)) return next();
  if (req.method !== 'GET') return deny();
  if (req.path === '/opportunities' || req.path === '/leads') return next();
  const match = req.path.match(/^\/(opportunities|leads)\/(\d+)(?:\/products|\/ownership-history)?$/);
  const score = req.path.match(/^\/scoring\/history\/(\d+)$/);
  if (!match && !score) return deny();
  const table = match?.[1] === 'opportunities' ? 'crm_opportunities' : 'crm_leads';
  const id = match?.[2] || score[1];
  try {
    const { rows } = await pool.query(`SELECT id FROM ${table} WHERE id=$1 AND is_deleted=FALSE
      AND affiliate_id IS NOT NULL AND ($2::int IS NULL OR affiliate_id=$2)`, [id,role === 'AGENT' ? req.user.id : null]);
    if (!rows.length) return deny();
    next();
  } catch(e) { res.status(503).json({ status: 'fail', message: 'Unable to validate CRM access' }); }
};
