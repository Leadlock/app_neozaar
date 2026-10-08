-- ============================================================
-- Migration 011: CRM Complete Integration & Improvements
-- Idempotent — safe to run multiple times.
-- ============================================================

-- ── 1. Opportunity Products (Marketplace product ↔ Opportunity) ──
-- Links marketplace products/services to CRM opportunities.
-- Reuses existing products.id — no duplicate product records.
CREATE TABLE IF NOT EXISTS crm_opportunity_products (
  id               SERIAL PRIMARY KEY,
  opportunity_id   INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  product_id       INTEGER REFERENCES products(id),          -- marketplace product
  product_name     VARCHAR(255),                              -- snapshot at time of add
  product_type     VARCHAR(30),                               -- product | service | solution
  isv_id           INTEGER REFERENCES users(id),             -- ISV user (products.user_id)
  quantity         INTEGER DEFAULT 1,
  unit_price       DECIMAL(15,2) DEFAULT 0,
  discount         DECIMAL(15,2) DEFAULT 0,
  total            DECIMAL(15,2) DEFAULT 0,
  notes            TEXT,
  created_by       INTEGER REFERENCES users(id),
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE (opportunity_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_products_opp    ON crm_opportunity_products(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_products_isv    ON crm_opportunity_products(isv_id);
CREATE INDEX IF NOT EXISTS idx_opp_products_prod   ON crm_opportunity_products(product_id);

-- ── 2. Lead Ownership History ─────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_lead_ownership_history (
  id             SERIAL PRIMARY KEY,
  lead_id        INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  previous_owner INTEGER REFERENCES users(id),
  new_owner      INTEGER REFERENCES users(id),
  assigned_by    INTEGER REFERENCES users(id),
  reason         TEXT,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_ownership_lead ON crm_lead_ownership_history(lead_id);

-- ── 3. Opportunity follow-up & aging columns ──────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='next_action_date') THEN
    ALTER TABLE crm_opportunities ADD COLUMN next_action_date TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='last_activity_at') THEN
    ALTER TABLE crm_opportunities ADD COLUMN last_activity_at TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='last_contacted_at') THEN
    ALTER TABLE crm_opportunities ADD COLUMN last_contacted_at TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='stage_entered_at') THEN
    ALTER TABLE crm_opportunities ADD COLUMN stage_entered_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='follow_up_status') THEN
    ALTER TABLE crm_opportunities
      ADD COLUMN follow_up_status VARCHAR(30) DEFAULT 'No Follow-up Scheduled';
    -- Values: Follow-up Today | Overdue Follow-up | Upcoming Follow-up | No Follow-up Scheduled
  END IF;
END $$;

-- Win/Loss structured fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='final_deal_value') THEN
    ALTER TABLE crm_opportunities ADD COLUMN final_deal_value DECIMAL(15,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='is_reopened') THEN
    ALTER TABLE crm_opportunities ADD COLUMN is_reopened BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='reopened_at') THEN
    ALTER TABLE crm_opportunities ADD COLUMN reopened_at TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='reopened_by') THEN
    ALTER TABLE crm_opportunities ADD COLUMN reopened_by INTEGER REFERENCES users(id);
  END IF;
END $$;

-- ── 4. Stage history: stage_entered_at for aging ─────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunity_stage_history' AND column_name='stage_entered_at') THEN
    ALTER TABLE crm_opportunity_stage_history ADD COLUMN stage_entered_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- ── 5. Duplicate detection support columns ────────────────────
-- phone_normalized on crm_leads
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_leads' AND column_name='phone_normalized') THEN
    ALTER TABLE crm_leads
      ADD COLUMN phone_normalized TEXT
        GENERATED ALWAYS AS (REGEXP_REPLACE(COALESCE(phone,''), '[^0-9]', '', 'g')) STORED;
  END IF;
END $$;

-- company_domain on crm_leads (extracted from email)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_leads' AND column_name='company_domain') THEN
    ALTER TABLE crm_leads
      ADD COLUMN company_domain TEXT
        GENERATED ALWAYS AS (
          CASE WHEN email IS NOT NULL AND POSITION('@' IN email) > 0
               THEN LOWER(TRIM(SPLIT_PART(email, '@', 2)))
               ELSE NULL END
        ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_leads_phone_norm   ON crm_leads(phone_normalized) WHERE phone_normalized IS NOT NULL AND phone_normalized <> '';
CREATE INDEX IF NOT EXISTS idx_crm_leads_company       ON crm_leads(LOWER(company))   WHERE company IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_domain        ON crm_leads(company_domain)   WHERE company_domain IS NOT NULL;

-- phone_normalized on crm_contacts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_contacts' AND column_name='phone_normalized') THEN
    ALTER TABLE crm_contacts
      ADD COLUMN phone_normalized TEXT
        GENERATED ALWAYS AS (REGEXP_REPLACE(COALESCE(phone,''), '[^0-9]', '', 'g')) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_phone_norm ON crm_contacts(phone_normalized) WHERE phone_normalized IS NOT NULL AND phone_normalized <> '';

-- ── 6. Notifications: ensure all required columns exist ───────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_notifications' AND column_name='is_read') THEN
    ALTER TABLE crm_notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_notifications' AND column_name='read_at') THEN
    ALTER TABLE crm_notifications ADD COLUMN read_at TIMESTAMP;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_notif_user_unread
  ON crm_notifications(user_id, is_read, created_at DESC);

-- ── 7. Aging threshold config (per-stage, configurable) ───────
CREATE TABLE IF NOT EXISTS crm_stage_aging_thresholds (
  id         SERIAL PRIMARY KEY,
  stage      VARCHAR(50) NOT NULL UNIQUE,
  threshold_days INTEGER NOT NULL DEFAULT 7,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed defaults (idempotent)
INSERT INTO crm_stage_aging_thresholds (stage, threshold_days) VALUES
  ('Discovery',           7),
  ('Qualification',       7),
  ('Assessment',         10),
  ('Demo',               10),
  ('Trial',              14),
  ('Scoping',            10),
  ('Technical Validation',14),
  ('Proposal Shared',    14),
  ('Negotiation',        21),
  ('Private Offer',      14),
  ('Procurement',        21),
  ('PO Received',        14),
  ('Delivered',          14),
  ('Payment Pending',    14),
  ('Payment Received',    7)
ON CONFLICT (stage) DO NOTHING;

-- ── 8. Mandatory fields validation config ─────────────────────
-- Stored as JSONB so it can be updated without a migration.
CREATE TABLE IF NOT EXISTS crm_stage_required_fields (
  id             SERIAL PRIMARY KEY,
  stage          VARCHAR(50) NOT NULL UNIQUE,
  required_fields JSONB NOT NULL DEFAULT '[]',
  updated_by     INTEGER REFERENCES users(id),
  updated_at     TIMESTAMP DEFAULT NOW()
);

INSERT INTO crm_stage_required_fields (stage, required_fields) VALUES
  ('Qualification',        '["requirement"]'),
  ('Demo',                 '["product_interest"]'),
  ('Assessment',           '["product_interest","requirement"]'),
  ('Proposal Shared',      '["deal_value"]'),
  ('Negotiation',          '["deal_value","expected_close_date"]'),
  ('Procurement',          '["deal_value","expected_close_date"]'),
  ('PO Received',          '["deal_value"]'),
  ('Payment Pending',      '["deal_value","final_deal_value"]'),
  ('Closed Won',           '["deal_value","final_deal_value"]'),
  ('Closed Lost',          '["win_loss_reason","win_loss_notes"]')
ON CONFLICT (stage) DO NOTHING;

-- ── 9. Valid stage transitions (adjacency list) ───────────────
CREATE TABLE IF NOT EXISTS crm_stage_transitions (
  id         SERIAL PRIMARY KEY,
  from_stage VARCHAR(50) NOT NULL,
  to_stage   VARCHAR(50) NOT NULL,
  UNIQUE (from_stage, to_stage)
);

INSERT INTO crm_stage_transitions (from_stage, to_stage) VALUES
  -- Forward
  ('Discovery','Qualification'),
  ('Discovery','Assessment'),('Discovery','Demo'),('Discovery','Trial'),
  ('Discovery','Scoping'),('Discovery','Technical Validation'),
  ('Qualification','Assessment'),('Qualification','Demo'),('Qualification','Trial'),
  ('Qualification','Scoping'),('Qualification','Technical Validation'),
  ('Assessment','Proposal Shared'),('Demo','Proposal Shared'),
  ('Trial','Proposal Shared'),('Scoping','Proposal Shared'),
  ('Technical Validation','Proposal Shared'),
  ('Proposal Shared','Negotiation'),('Proposal Shared','Private Offer'),
  ('Negotiation','Private Offer'),('Negotiation','Procurement'),
  ('Private Offer','Procurement'),
  ('Procurement','PO Received'),
  ('PO Received','Delivered'),
  ('Delivered','Payment Pending'),
  ('Payment Pending','Payment Received'),
  ('Payment Received','Closed Won'),
  -- Backward (limited — allow going back one tier)
  ('Qualification','Discovery'),
  ('Assessment','Qualification'),('Demo','Qualification'),
  ('Trial','Qualification'),('Scoping','Qualification'),
  ('Technical Validation','Qualification'),
  ('Proposal Shared','Assessment'),('Proposal Shared','Demo'),
  ('Negotiation','Proposal Shared'),
  ('Private Offer','Negotiation'),('Private Offer','Proposal Shared'),
  ('Procurement','Negotiation'),('Procurement','Private Offer'),
  ('PO Received','Procurement'),
  -- Closed Lost from any active stage
  ('Discovery','Closed Lost'),('Qualification','Closed Lost'),
  ('Assessment','Closed Lost'),('Demo','Closed Lost'),('Trial','Closed Lost'),
  ('Scoping','Closed Lost'),('Technical Validation','Closed Lost'),
  ('Proposal Shared','Closed Lost'),('Negotiation','Closed Lost'),
  ('Private Offer','Closed Lost'),('Procurement','Closed Lost'),
  ('PO Received','Closed Lost'),('Delivered','Closed Lost'),
  ('Payment Pending','Closed Lost'),('Payment Received','Closed Lost'),
  -- Reopen: Closed Lost → Discovery
  ('Closed Lost','Discovery')
ON CONFLICT (from_stage, to_stage) DO NOTHING;

-- ── 10. ISV notification preference (reuse existing infra) ────
-- No new table needed — crm_notifications already has user_id.
-- ISV users are identified by users.role_type = 'ISV'.
-- crm_opportunity_products.isv_id links opp → ISV user.

-- ── 11. Indexes for follow-up & aging queries ─────────────────
CREATE INDEX IF NOT EXISTS idx_crm_opps_next_action_date
  ON crm_opportunities(next_action_date) WHERE next_action_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_opps_stage_entered
  ON crm_opportunities(stage_entered_at) WHERE stage_entered_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_opps_follow_up_status
  ON crm_opportunities(follow_up_status);
