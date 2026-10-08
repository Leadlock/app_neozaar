-- Seed all roles into the roles table (idempotent - won't duplicate)
INSERT INTO roles (role_id, role_type) VALUES
  (1, 'CLIENT'),
  (2, 'ISV'),
  (3, 'ADMIN'),
  (4, 'SUPER_ADMIN'),
  (5, 'ROLE_MANAGER'),
  (6, 'M_SELLER'),
  (7, 'AGENT'),
  (8, 'SUPPORT_PARTNER'),
  (9, 'SELLER'),
  (10, 'A_MANAGER'),
  (12, 'MARKETING')
ON CONFLICT (role_id) DO NOTHING;

-- Also add COSELLER if it exists as a separate role (check your DB)
-- INSERT INTO roles (role_id, role_type) VALUES (11, 'COSELLER') ON CONFLICT (role_id) DO NOTHING;

-- Verify
SELECT role_id, role_type FROM roles ORDER BY role_id;
