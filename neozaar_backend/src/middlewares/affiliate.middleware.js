/**
 * Affiliate Middleware
 * ─────────────────────────────────────────────────────────────
 * requireAffiliate — verifies the authenticated user is AGENT or A_MANAGER.
 * requireAffiliateManager — A_MANAGER or SUPER_ADMIN.
 * requireAffiliateOrManager — AGENT | A_MANAGER | SUPER_ADMIN | ADMIN.
 * assertOwnAffiliate — AGENT can only access their own data; A_MANAGER
 *   sees all affiliates; SUPER_ADMIN/ADMIN see all.
 */

const AFFILIATE_ROLES   = ['AGENT', 'A_MANAGER'];
const MANAGER_ROLES     = ['A_MANAGER', 'SUPER_ADMIN', 'ADMIN'];
const ALL_AFFILIATE_ROLES = ['AGENT', 'A_MANAGER', 'SUPER_ADMIN', 'ADMIN'];

/**
 * Only AGENT users (affiliates themselves).
 */
const requireAffiliate = (req, res, next) => {
  if (!req.user || !AFFILIATE_ROLES.includes(req.user.role_type)) {
    return res.status(403).json({ status: 'fail', message: 'Affiliate access required' });
  }
  next();
};

/**
 * A_MANAGER, SUPER_ADMIN, or ADMIN.
 */
const requireAffiliateManager = (req, res, next) => {
  if (!req.user || !MANAGER_ROLES.includes(req.user.role_type)) {
    return res.status(403).json({ status: 'fail', message: 'Affiliate manager access required' });
  }
  next();
};

/**
 * Any affiliate-related role: AGENT, A_MANAGER, SUPER_ADMIN, ADMIN.
 */
const requireAffiliateAccess = (req, res, next) => {
  if (!req.user || !ALL_AFFILIATE_ROLES.includes(req.user.role_type)) {
    return res.status(403).json({ status: 'fail', message: 'Affiliate module access required' });
  }
  next();
};

/**
 * Resolve the effective affiliate_id for scoped queries.
 *
 * - AGENT: always their own id; any ?affiliate_id param is IGNORED.
 * - A_MANAGER: can see any affiliate (pass ?affiliate_id=N or defaults to all).
 * - SUPER_ADMIN/ADMIN: same as A_MANAGER.
 *
 * Sets req.affiliateScopeId:
 *   number  → filter to this affiliate
 *   null    → no filter (all affiliates)
 *
 * Also sets req.isSelfScope = true when the user is their own affiliate.
 */
const resolveAffiliateScope = async (req, res, next) => {
  const role = req.user?.role_type;

  if (role === 'AGENT') {
    // Agents always and only see their own data
    req.affiliateScopeId = Number(req.user.id);
    req.isSelfScope = true;
  } else if (MANAGER_ROLES.includes(role)) {
    const raw = req.query.affiliate_id ?? req.params.affiliate_id;
    const requestedId = raw == null ? null : Number(raw);
    if (raw != null && (!Number.isSafeInteger(requestedId) || requestedId <= 0)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid affiliate selection' });
    }
    req.affiliateScopeId = requestedId;
    if (requestedId) {
      try {
        const { rows } = await require('../config/database').query(
          "SELECT id FROM users WHERE id=$1 AND role_type IN ('AGENT','A_MANAGER')", [requestedId]);
        if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Affiliate not found' });
      } catch(e) { return res.status(503).json({ status: 'fail', message: 'Unable to validate affiliate' }); }
    }
    req.isSelfScope = false;
  } else {
    return res.status(403).json({ status: 'fail', message: 'Access denied' });
  }
  next();
};

/**
 * Guard that an AGENT can only modify their own records.
 * For routes where :affiliate_id is in the path.
 */
const assertOwnAffiliate = (req, res, next) => {
  const role = req.user?.role_type;
  if (role === 'AGENT') {
    const targetId = parseInt(req.params.affiliate_id || req.params.id, 10);
    if (!targetId || targetId !== Number(req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Access denied: cannot access other affiliates\' data' });
    }
  }
  next();
};

module.exports = {
  requireAffiliate,
  requireAffiliateManager,
  requireAffiliateAccess,
  resolveAffiliateScope,
  assertOwnAffiliate,
  AFFILIATE_ROLES,
  MANAGER_ROLES,
  ALL_AFFILIATE_ROLES,
};
