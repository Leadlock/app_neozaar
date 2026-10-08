-- ============================================================================
-- MIGRATION: Update Roles Structure
-- 1. Rename COSELLER → M_SELLER (Master Seller)
-- 2. Add SELLER role (under Master Seller)
-- 3. Add A_MANAGER role (Affiliate Manager, under Affiliate/AGENT)
-- ============================================================================

BEGIN;

-- Step 1: Update constraint to allow new role types
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_role_type_check' AND table_name = 'users') THEN
    ALTER TABLE users DROP CONSTRAINT users_role_type_check;
  END IF;
  ALTER TABLE users ADD CONSTRAINT users_role_type_check
    CHECK (role_type::text = ANY (ARRAY['CLIENT','ISV','ADMIN','SUPER_ADMIN','ROLE_MANAGER','SUPPORT_PARTNER','M_SELLER','SELLER','AGENT','A_MANAGER','USER']::text[]));
END $$;

-- Step 2: Rename COSELLER → M_SELLER in roles table
UPDATE roles SET role_type = 'M_SELLER' WHERE role_id = 6;

-- Step 3: Rename COSELLER → M_SELLER in users table
UPDATE users SET role_type = 'M_SELLER' WHERE role_type = 'COSELLER';

-- Step 4: Add new roles
INSERT INTO roles (role_id, role_type) VALUES (9, 'SELLER') ON CONFLICT (role_id) DO NOTHING;
INSERT INTO roles (role_id, role_type) VALUES (10, 'A_MANAGER') ON CONFLICT (role_id) DO NOTHING;

-- Step 5: Verify
SELECT role_id, role_type FROM roles ORDER BY role_id;

COMMIT;
