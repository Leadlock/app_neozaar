-- ============================================================
-- Migration 010: CRM Reliability & Architecture Improvements
-- Run once against the live database.
-- All statements are idempotent (IF NOT EXISTS / DO NOTHING).
-- ============================================================

-- ── 1. email_normalized generated column on crm_leads ────────
-- Stores LOWER(TRIM(email)) so the unique partial index works
-- even when callers insert mixed-case emails.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_leads' AND column_name='email_normalized'
  ) THEN
    ALTER TABLE crm_leads
      ADD COLUMN email_normalized TEXT
        GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED;
  END IF;
END $$;

-- Unique partial index: one active lead per email
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_leads_email_active
  ON crm_leads (email_normalized)
  WHERE is_deleted = FALSE;

-- ── 2. email_normalized on crm_accounts ──────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_accounts' AND column_name='email_normalized'
  ) THEN
    ALTER TABLE crm_accounts
      ADD COLUMN email_normalized TEXT
        GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_accounts_email_active
  ON crm_accounts (email_normalized)
  WHERE is_deleted = FALSE AND email IS NOT NULL AND TRIM(email) <> '';

-- ── 3. email_normalized on crm_contacts ──────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_contacts' AND column_name='email_normalized'
  ) THEN
    ALTER TABLE crm_contacts
      ADD COLUMN email_normalized TEXT
        GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_contacts_email_active
  ON crm_contacts (email_normalized)
  WHERE is_deleted = FALSE AND email IS NOT NULL AND TRIM(email) <> '';

-- ── 4. Sales Order number unique constraint ───────────────────
-- order_number already has UNIQUE in the schema DDL; this ensures
-- it exists on databases created from the older crm_migration.sql.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='crm_sales_orders'
      AND constraint_type='UNIQUE'
      AND constraint_name='crm_sales_orders_order_number_key'
  ) THEN
    ALTER TABLE crm_sales_orders
      ADD CONSTRAINT crm_sales_orders_order_number_key UNIQUE (order_number);
  END IF;
END $$;

-- ── 5. idempotency_key on crm_lead_score_history ─────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_lead_score_history' AND column_name='idempotency_key'
  ) THEN
    ALTER TABLE crm_lead_score_history ADD COLUMN idempotency_key TEXT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_score_history_idempotency
  ON crm_lead_score_history (lead_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ── 6. Reporting columns on crm_leads ────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_leads' AND column_name='conversion_source'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN conversion_source VARCHAR(30);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_leads' AND column_name='score_label'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN score_label VARCHAR(30) DEFAULT 'Not Scored';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_leads' AND column_name='lead_stage'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN lead_stage VARCHAR(100) DEFAULT 'New Inquiry';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_leads' AND column_name='affiliate_id'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN affiliate_id INTEGER REFERENCES users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_leads' AND column_name='account_id'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN account_id INTEGER REFERENCES crm_accounts(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_leads' AND column_name='contact_id'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN contact_id INTEGER REFERENCES crm_contacts(id);
  END IF;
END $$;

-- ── 7. Reporting columns on crm_opportunities ────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='conversion_source'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN conversion_source VARCHAR(30);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='customer_score_at_conversion'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN customer_score_at_conversion INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='converted_at'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN converted_at TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='score'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN score INTEGER DEFAULT 10;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='seller_id'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN seller_id INTEGER REFERENCES users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='affiliate_id'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN affiliate_id INTEGER REFERENCES users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='seller_assigned_at'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN seller_assigned_at TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='seller_assigned_by'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN seller_assigned_by INTEGER REFERENCES users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='closed_at'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN closed_at TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='win_loss_notes'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN win_loss_notes TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='contact_id'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN contact_id INTEGER REFERENCES crm_contacts(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='lead_id'
  ) THEN
    ALTER TABLE crm_opportunities ADD COLUMN lead_id INTEGER REFERENCES crm_leads(id);
  END IF;
END $$;

-- ── 8. crm_quotes full columns ────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_quotes' AND column_name='opportunity_id'
  ) THEN
    ALTER TABLE crm_quotes ADD COLUMN opportunity_id INTEGER REFERENCES crm_opportunities(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_quotes' AND column_name='contact_id'
  ) THEN
    ALTER TABLE crm_quotes ADD COLUMN contact_id INTEGER REFERENCES crm_contacts(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_quotes' AND column_name='subtotal'
  ) THEN
    ALTER TABLE crm_quotes ADD COLUMN subtotal DECIMAL(15,2) DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_quotes' AND column_name='discount'
  ) THEN
    ALTER TABLE crm_quotes ADD COLUMN discount DECIMAL(15,2) DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_quotes' AND column_name='tax'
  ) THEN
    ALTER TABLE crm_quotes ADD COLUMN tax DECIMAL(15,2) DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_quotes' AND column_name='accepted_at'
  ) THEN
    ALTER TABLE crm_quotes ADD COLUMN accepted_at TIMESTAMP;
  END IF;
END $$;

-- ── 9. crm_opportunity_stage_history: previous score ─────────
-- Preserves the score/probability at the time of the transition
-- so Closed Lost reporting can show peak stage reached.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunity_stage_history' AND column_name='old_score'
  ) THEN
    ALTER TABLE crm_opportunity_stage_history ADD COLUMN old_score INTEGER;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunity_stage_history' AND column_name='new_score'
  ) THEN
    ALTER TABLE crm_opportunity_stage_history ADD COLUMN new_score INTEGER;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunity_stage_history' AND column_name='win_loss_reason'
  ) THEN
    ALTER TABLE crm_opportunity_stage_history ADD COLUMN win_loss_reason TEXT;
  END IF;
END $$;

-- ── 10. user_activity_logs: idempotency_key column ───────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='user_activity_logs' AND column_name='idempotency_key'
  ) THEN
    ALTER TABLE user_activity_logs ADD COLUMN idempotency_key TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ual_idempotency
  ON user_activity_logs (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ── 11. crm_contacts missing columns (original schema gap) ─────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_contacts' AND column_name='industry') THEN
    ALTER TABLE crm_contacts ADD COLUMN industry VARCHAR(100);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_contacts' AND column_name='type') THEN
    ALTER TABLE crm_contacts ADD COLUMN type VARCHAR(30) DEFAULT 'lead';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_contacts' AND column_name='company') THEN
    ALTER TABLE crm_contacts ADD COLUMN company VARCHAR(255);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_contacts' AND column_name='website') THEN
    ALTER TABLE crm_contacts ADD COLUMN website VARCHAR(500);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_contacts' AND column_name='whatsapp') THEN
    ALTER TABLE crm_contacts ADD COLUMN whatsapp VARCHAR(50);
  END IF;
END $$;

-- ── 12. crm_opportunities missing columns (original schema gap) ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='account_id') THEN
    ALTER TABLE crm_opportunities ADD COLUMN account_id INTEGER REFERENCES crm_accounts(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='expected_revenue') THEN
    ALTER TABLE crm_opportunities ADD COLUMN expected_revenue DECIMAL(15,2) DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='neozaar_revenue') THEN
    ALTER TABLE crm_opportunities ADD COLUMN neozaar_revenue DECIMAL(15,2) DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='next_followup') THEN
    ALTER TABLE crm_opportunities ADD COLUMN next_followup TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_opportunities' AND column_name='updated_by') THEN
    ALTER TABLE crm_opportunities ADD COLUMN updated_by INTEGER REFERENCES users(id);
  END IF;
END $$;

-- ── 13. crm_leads missing columns (original schema gap) ──────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_leads' AND column_name='edp_macc_status') THEN
    ALTER TABLE crm_leads ADD COLUMN edp_macc_status VARCHAR(100);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_leads' AND column_name='expected_close_date') THEN
    ALTER TABLE crm_leads ADD COLUMN expected_close_date DATE;
  END IF;
END $$;

-- ── 14. crm_lead_score_history: points column ────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='crm_lead_score_history' AND column_name='points') THEN
    ALTER TABLE crm_lead_score_history ADD COLUMN points INTEGER;
  END IF;
END $$;

-- ── 15. Reporting indexes ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crm_leads_conversion_source
  ON crm_leads (conversion_source) WHERE conversion_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_opps_conversion_source
  ON crm_opportunities (conversion_source) WHERE conversion_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_opps_seller
  ON crm_opportunities (seller_id) WHERE seller_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_opps_affiliate
  ON crm_opportunities (affiliate_id) WHERE affiliate_id IS NOT NULL;
