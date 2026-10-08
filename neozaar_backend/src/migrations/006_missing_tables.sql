-- ============================================================
-- MIGRATION 006: All missing tables & role updates
-- Safe to run multiple times (IF NOT EXISTS guards)
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. user_activity_logs (analytics tracking)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type  VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id   INTEGER,
  page_url    TEXT,
  metadata    JSONB DEFAULT '{}',
  utm         JSONB DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ual_user_id     ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ual_event_type  ON user_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_ual_entity      ON user_activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ual_created_at  ON user_activity_logs(created_at);

-- ══════════════════════════════════════════════════════════════
-- 2. user_consents (GDPR / analytics consent)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_consents (
  id            BIGSERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  consent_type  VARCHAR(50) NOT NULL DEFAULT 'analytics',
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);

-- ══════════════════════════════════════════════════════════════
-- 3. lead_assigns (affiliate / seller lead assignment)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lead_assigns (
  id               BIGSERIAL PRIMARY KEY,
  lead_id          INTEGER NOT NULL REFERENCES lead_details(id) ON DELETE CASCADE,
  user_id          INTEGER REFERENCES users(id),
  assign_user_id   INTEGER REFERENCES users(id),
  assign_user_type VARCHAR(50),
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE (lead_id, assign_user_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_assigns_lead_id        ON lead_assigns(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assigns_assign_user_id ON lead_assigns(assign_user_id);

-- ══════════════════════════════════════════════════════════════
-- 4. seller_assignments (products/categories assigned to sellers/affiliates)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS seller_assignments (
  id            BIGSERIAL PRIMARY KEY,
  seller_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type     VARCHAR(50) NOT NULL,   -- product | service | solution | category | isv
  item_id       INTEGER NOT NULL,
  allowed_types TEXT[],                 -- optional filter for category assignments
  assigned_by   INTEGER REFERENCES users(id),
  assigned_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE (seller_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_assignments_seller_id ON seller_assignments(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_assignments_item      ON seller_assignments(item_type, item_id);

-- ══════════════════════════════════════════════════════════════
-- 5. commissions
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS commissions (
  id                    BIGSERIAL PRIMARY KEY,
  isv_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commission_percentage FLOAT NOT NULL,
  approved_by           INTEGER REFERENCES users(id),
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE (isv_id)
);

-- ══════════════════════════════════════════════════════════════
-- 6. Add ISV_SELLER to users role_type constraint
-- ══════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_type_check' AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_type_check;
  END IF;
END $$;

ALTER TABLE users ADD CONSTRAINT users_role_type_check
  CHECK (role_type::text = ANY (ARRAY[
    'CLIENT','ISV','ADMIN','SUPER_ADMIN','ROLE_MANAGER',
    'SUPPORT_PARTNER','M_SELLER','SELLER','AGENT','A_MANAGER',
    'ISV_SELLER','USER'
  ]::text[]));

-- Add ISV_SELLER to roles table if not present
INSERT INTO roles (role_type) VALUES ('ISV_SELLER') ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 7. crm_leads: add affiliate_id if missing (used by lifecycle engine)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS affiliate_id INTEGER REFERENCES users(id);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS whatsapp     VARCHAR(50);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS designation  VARCHAR(255);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS cloud_preference VARCHAR(50);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS expected_close_date DATE;

CREATE INDEX IF NOT EXISTS idx_crm_leads_affiliate ON crm_leads(affiliate_id);

COMMIT;
