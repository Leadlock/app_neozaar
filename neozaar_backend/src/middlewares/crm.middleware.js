const CRM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'AGENT', 'A_MANAGER', 'M_SELLER', 'ISV_SELLER', 'SELLER', 'ISV', 'SUPPORT_PARTNER'];

const crmAccess = (req, res, next) => {
  if (!req.user || !CRM_ROLES.includes(req.user.role_type)) {
    return res.status(403).json({ message: 'CRM access denied' });
  }
  next();
};

const crmRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role_type)) {
    return res.status(403).json({ message: 'Insufficient CRM role' });
  }
  next();
};

module.exports = { crmAccess, crmRole };
