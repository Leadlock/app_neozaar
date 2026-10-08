-- ============================================================
-- NEOZAAR PENDING MIGRATIONS
-- Run on server: PGPASSWORD=NeoDevTeam psql -h localhost -p 5432 -U devuser -d proddb -f run_pending_migrations.sql
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 1. Add seller columns to crm_opportunities (Migration 004)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS seller_id INTEGER REFERENCES users(id);
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS seller_assigned_at TIMESTAMP;
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS seller_assigned_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_crm_opps_seller ON crm_opportunities(seller_id);

-- ──────────────────────────────────────────────────────────────
-- 2. Add service_sub_options to isv_details
-- ──────────────────────────────────────────────────────────────
ALTER TABLE isv_details ADD COLUMN IF NOT EXISTS service_sub_options JSONB DEFAULT NULL;

-- ──────────────────────────────────────────────────────────────
-- 3. Create seller_assignments table (missing entirely)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_assignments (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL,
  item_id INTEGER NOT NULL,
  assigned_by INTEGER REFERENCES users(id),
  allowed_types TEXT[],
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (seller_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_assignments_seller ON seller_assignments(seller_id);

-- ──────────────────────────────────────────────────────────────
-- 4. Fix roles table on server to match local DB
--    Server has wrong IDs: 6=M_SELLER, 10=A_MANAGER, no 11
--    Local (correct):      6=ISV_SELLER, 10=M_SELLER, 11=A_MANAGER
-- ──────────────────────────────────────────────────────────────
UPDATE roles SET role_type = 'ISV_SELLER' WHERE role_id = 6 AND role_type = 'M_SELLER';
UPDATE roles SET role_type = 'M_SELLER'   WHERE role_id = 10 AND role_type = 'A_MANAGER';
INSERT INTO roles (role_id, role_type) VALUES (11, 'A_MANAGER') ON CONFLICT (role_id) DO NOTHING;

-- Also update any users who had role_id=6 (M_SELLER) — keep their role_type
-- but update role_id to 10 so it matches the new M_SELLER position
UPDATE users SET role_id = 10 WHERE role_id = 6 AND role_type = 'M_SELLER';

-- ──────────────────────────────────────────────────────────────
-- 5. Recreate users role_type constraint (was missing on server)
--    Includes all roles: ISV_SELLER, M_SELLER, A_MANAGER etc.
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_type_check' AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_type_check;
  END IF;

  ALTER TABLE users ADD CONSTRAINT users_role_type_check
    CHECK (role_type::text = ANY (ARRAY[
      'CLIENT','ISV','ADMIN','SUPER_ADMIN','ROLE_MANAGER',
      'SUPPORT_PARTNER','M_SELLER','SELLER','AGENT','A_MANAGER','USER',
      'ISV_SELLER'
    ]::text[]));
END $$;

-- ──────────────────────────────────────────────────────────────
-- 6. Recreate lead_assigns constraint (was missing on server)
--    Includes ISV_SELLER, M_SELLER, A_MANAGER
-- ──────────────────────────────────────────────────────────────
ALTER TABLE lead_assigns DROP CONSTRAINT IF EXISTS lead_assigns_assign_user_type_check;

ALTER TABLE lead_assigns ADD CONSTRAINT lead_assigns_assign_user_type_check
  CHECK ((assign_user_type)::text = ANY (ARRAY[
    'isv'::text,
    'client'::text,
    'SUPPORT_PARTNER'::text,
    'COSELLER'::text,
    'AGENT'::text,
    'M_SELLER'::text,
    'SELLER'::text,
    'A_MANAGER'::text,
    'ISV_SELLER'::text
  ]));

COMMIT;

-- ──────────────────────────────────────────────────────────────
-- VERIFY everything applied correctly
-- ──────────────────────────────────────────────────────────────
SELECT '=== VERIFY: crm_opportunities seller columns ===' AS check;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'crm_opportunities' AND column_name IN ('seller_id','seller_assigned_at','seller_assigned_by');

SELECT '=== VERIFY: isv_details service_sub_options ===' AS check;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'isv_details' AND column_name = 'service_sub_options';

SELECT '=== VERIFY: seller_assignments table ===' AS check;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'seller_assignments';

SELECT '=== VERIFY: users role_type constraint ===' AS check;
SELECT check_clause FROM information_schema.check_constraints
WHERE constraint_name = 'users_role_type_check';

SELECT '=== VERIFY: lead_assigns constraint ===' AS check;
SELECT check_clause FROM information_schema.check_constraints
WHERE constraint_name = 'lead_assigns_assign_user_type_check';

SELECT '=== VERIFY: roles table (should have 11 rows incl ISV_SELLER) ===' AS check;
SELECT role_id, role_type FROM roles ORDER BY role_id;
