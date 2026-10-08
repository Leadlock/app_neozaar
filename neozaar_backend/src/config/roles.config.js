const roleMap = {
  1: 'CLIENT',
  2: 'ISV',
  3: 'ADMIN',
  4: 'SUPER_ADMIN',
  5: 'ROLE_MANAGER',
  6: 'ISV_SELLER',
  7: 'AGENT',
  8: 'SUPPORT_PARTNER',
  9: 'SELLER',
  10: 'M_SELLER',
  11: 'A_MANAGER',
  12: 'MARKETING',
};

const reverseRoleMap = Object.fromEntries(
  Object.entries(roleMap).map(([id, type]) => [type, parseInt(id)])
);

module.exports = { roleMap, reverseRoleMap };
