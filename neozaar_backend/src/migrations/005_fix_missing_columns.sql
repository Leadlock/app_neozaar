-- ============================================================
-- FIX: Add all missing columns & tables causing 500 errors
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards)
-- ============================================================

BEGIN;

-- 1. crm_accounts table (missing entirely from v2 schema)
CREATE TABLE IF NOT EXISTS crm_accounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'Prospect',
  industry VARCHAR(100),
  country VARCHAR(100),
  website VARCHAR(500),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  owner_id INTEGER REFERENCES users(id),
  annual_revenue DECIMAL(15,2),
  employee_count INTEGER,
  cloud_preference VARCHAR(50),
  edp_eligible BOOLEAN DEFAULT FALSE,
  macc_eligible BOOLEAN DEFAULT FALSE,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. crm_opportunities: missing columns
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS seller_id INTEGER REFERENCES users(id);
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS seller_assigned_at TIMESTAMP;
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS seller_assigned_by INTEGER REFERENCES users(id);
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS affiliate_id INTEGER REFERENCES users(id);
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES crm_accounts(id);

-- 3. crm_leads: missing columns added by code at runtime (add them here instead)
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS lead_stage VARCHAR(50) DEFAULT 'Cold Lead';
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES crm_accounts(id);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS converted_to_account_id INTEGER REFERENCES crm_accounts(id);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS converted_to_contact_id INTEGER REFERENCES crm_contacts(id);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS edp_macc_status VARCHAR(50);

-- 4. crm_contacts: account_id link
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES crm_accounts(id);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_opps_seller     ON crm_opportunities(seller_id);
CREATE INDEX IF NOT EXISTS idx_crm_opps_affiliate  ON crm_opportunities(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_crm_opps_account    ON crm_opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_email     ON crm_leads(email);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_email  ON crm_accounts(email);

-- 6. Role constraint: drop old, migrate stale values, re-add
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_type_check' AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_type_check;
  END IF;
END $$;

-- Migrate any legacy role_type values before adding constraint
UPDATE users SET role_type = 'M_SELLER'  WHERE role_type = 'COSELLER';
UPDATE users SET role_type = 'CLIENT'    WHERE role_type NOT IN (
  'CLIENT','ISV','ADMIN','SUPER_ADMIN','ROLE_MANAGER',
  'SUPPORT_PARTNER','M_SELLER','SELLER','AGENT','A_MANAGER','USER'
);

ALTER TABLE users ADD CONSTRAINT users_role_type_check
  CHECK (role_type::text = ANY (ARRAY[
    'CLIENT','ISV','ADMIN','SUPER_ADMIN','ROLE_MANAGER',
    'SUPPORT_PARTNER','M_SELLER','SELLER','AGENT','A_MANAGER','USER'
  ]::text[]));

COMMIT;
