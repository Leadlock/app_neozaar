-- ============================================================
-- Migration 025: Affiliate Program
-- Idempotent — safe to run multiple times.
--
-- Extends the existing CRM system with an attribution + access-
-- control + reporting layer.  NO existing tables are modified
-- except for two safe additions:
--   • crm_leads.affiliate_id (already present in lifecycle.engine
--     and public.leads.routes — this just formalises the FK)
--   • users.ref_code           (used in public.leads.routes already)
--
-- New tables:
--   affiliate_assignments    — catalog items assigned to an affiliate
--   affiliate_links          — generated trackable links
--   affiliate_link_clicks    — anonymous click/UTM capture
--   affiliate_tokens         — short-lived tokens for UTM→registration bridge
--   affiliate_attributions   — permanent customer↔affiliate record
--   affiliate_contacts       — uploaded database contacts
--   affiliate_campaigns      — email campaigns
--   affiliate_campaign_sends — per-contact send tracking
--   affiliate_audit_log      — audit trail for all affiliate events
-- ============================================================

-- ── 0. ref_code on users (used by public.leads.routes already) ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='ref_code') THEN
    ALTER TABLE users ADD COLUMN ref_code VARCHAR(32) UNIQUE;
    -- Backfill unique codes for existing AGENT / A_MANAGER users
    UPDATE users
      SET ref_code = LOWER(SUBSTR(MD5(id::text || email), 1, 12))
    WHERE role_type IN ('AGENT','A_MANAGER') AND ref_code IS NULL;
  END IF;
END $$;

-- ── 1. Affiliate role entry in roles table (safe insert) ─────────
-- AGENT role_id=7 already maps to 'AGENT' (affiliate).
-- A_MANAGER role_id=11 maps to 'A_MANAGER'.
-- No new roles needed — already seeded.

-- ── 2. Catalog assignments — what items an affiliate can promote ──
CREATE TABLE IF NOT EXISTS affiliate_assignments (
  id            SERIAL PRIMARY KEY,
  affiliate_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  catalog_type  VARCHAR(20) NOT NULL DEFAULT 'product', -- product | service | solution
  assigned_by   INTEGER NOT NULL REFERENCES users(id),
  assigned_at   TIMESTAMP DEFAULT NOW(),
  is_active     BOOLEAN DEFAULT TRUE,
  notes         TEXT,
  UNIQUE (affiliate_id, catalog_id)
);
CREATE INDEX IF NOT EXISTS idx_aff_assign_affiliate ON affiliate_assignments(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_assign_catalog   ON affiliate_assignments(catalog_id);

-- ── 3. Affiliate links — generated trackable URLs ─────────────────
CREATE TABLE IF NOT EXISTS affiliate_links (
  id            SERIAL PRIMARY KEY,
  affiliate_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_id    INTEGER REFERENCES products(id),
  catalog_type  VARCHAR(20),              -- product | service | solution | generic
  slug          VARCHAR(64) NOT NULL UNIQUE,  -- random unique slug for the link
  destination_path TEXT,                  -- e.g. /product/awesome-product
  utm_source    VARCHAR(255),             -- usually affiliate ref_code
  utm_medium    VARCHAR(100) DEFAULT 'referral',
  utm_campaign  VARCHAR(255),
  label         TEXT,                     -- friendly name
  is_active     BOOLEAN DEFAULT TRUE,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aff_links_affiliate ON affiliate_links(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_links_slug      ON affiliate_links(slug);

-- ── 4. Link clicks — anonymous UTM hit log ───────────────────────
CREATE TABLE IF NOT EXISTS affiliate_link_clicks (
  id            BIGSERIAL PRIMARY KEY,
  link_id       INTEGER NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  affiliate_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_hash       VARCHAR(64),   -- hashed, not raw IP
  user_agent    TEXT,
  referer       TEXT,
  clicked_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_link      ON affiliate_link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_affiliate ON affiliate_link_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_at        ON affiliate_link_clicks(clicked_at);

-- ── 5. Attribution tokens — bridge anonymous click → registration ─
-- Short-lived (7 days).  Backend generates on click; frontend passes
-- back on registration so the backend can recover affiliate identity
-- without trusting any client-supplied affiliate_id.
CREATE TABLE IF NOT EXISTS affiliate_tokens (
  token         VARCHAR(64) PRIMARY KEY,
  affiliate_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  link_id       INTEGER REFERENCES affiliate_links(id) ON DELETE SET NULL,
  campaign_id   INTEGER,                  -- FK to affiliate_campaigns added below
  contact_id    INTEGER,                  -- FK to affiliate_contacts added below
  expires_at    TIMESTAMP NOT NULL,
  consumed      BOOLEAN DEFAULT FALSE,
  consumed_at   TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aff_tokens_affiliate ON affiliate_tokens(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_tokens_expires   ON affiliate_tokens(expires_at) WHERE NOT consumed;

-- ── 6. Affiliate attributions — permanent customer↔affiliate record ─
-- Primary attribution store. One row per (customer + attribution event).
-- "First wins" rule: multiple rows allowed but only the first active one
-- is the authoritative attribution. Conflicts flagged for admin resolution.
CREATE TABLE IF NOT EXISTS affiliate_attributions (
  id              SERIAL PRIMARY KEY,
  affiliate_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- customer is identified by crm_leads.id (the CRM source of truth)
  crm_lead_id     INTEGER REFERENCES crm_leads(id) ON DELETE SET NULL,
  -- also link to users.id if the contact registered a portal account
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  affiliate_link_id INTEGER REFERENCES affiliate_links(id) ON DELETE SET NULL,
  campaign_id     INTEGER,
  contact_id      INTEGER,
  attribution_type VARCHAR(30) NOT NULL, -- utm_link | email_campaign | manual_assignment
  utm_source      VARCHAR(255),
  utm_medium      VARCHAR(100),
  utm_campaign    VARCHAR(255),
  attributed_at   TIMESTAMP DEFAULT NOW(),
  -- conflict tracking
  status          VARCHAR(20) DEFAULT 'active',  -- pending | active | conflict | superseded | rejected
  conflict_notes  TEXT,
  resolved_by     INTEGER REFERENCES users(id),
  resolved_at     TIMESTAMP,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aff_attr_affiliate  ON affiliate_attributions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_attr_lead       ON affiliate_attributions(crm_lead_id);
CREATE INDEX IF NOT EXISTS idx_aff_attr_user       ON affiliate_attributions(user_id);
CREATE INDEX IF NOT EXISTS idx_aff_attr_status     ON affiliate_attributions(status);

-- ── 7. Affiliate contacts — uploaded prospect database ────────────
CREATE TABLE IF NOT EXISTS affiliate_contacts (
  id            SERIAL PRIMARY KEY,
  affiliate_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  phone         VARCHAR(50),
  company       VARCHAR(255),
  designation   VARCHAR(255),
  country       VARCHAR(100),
  industry      VARCHAR(100),
  notes         TEXT,
  -- Lifecycle tracking
  status        VARCHAR(30) DEFAULT 'prospect',  -- prospect | emailed | clicked | registered | customer
  email_bounced BOOLEAN DEFAULT FALSE,
  unsubscribed  BOOLEAN DEFAULT FALSE,
  -- CRM cross-reference (set when contact registers / is identified as existing customer)
  crm_lead_id   INTEGER REFERENCES crm_leads(id) ON DELETE SET NULL,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- Dedup
  is_duplicate  BOOLEAN DEFAULT FALSE,
  duplicate_of  INTEGER REFERENCES affiliate_contacts(id),
  -- Import metadata
  import_batch  VARCHAR(64),
  imported_at   TIMESTAMP DEFAULT NOW(),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aff_contacts_affiliate ON affiliate_contacts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_contacts_email     ON affiliate_contacts(LOWER(TRIM(email)));
CREATE INDEX IF NOT EXISTS idx_aff_contacts_crm_lead  ON affiliate_contacts(crm_lead_id) WHERE crm_lead_id IS NOT NULL;

-- ── 8. Affiliate campaigns — email campaigns ──────────────────────
CREATE TABLE IF NOT EXISTS affiliate_campaigns (
  id            SERIAL PRIMARY KEY,
  affiliate_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  subject       TEXT NOT NULL,
  body_html     TEXT,
  body_text     TEXT,
  -- Tracking link config
  affiliate_link_id INTEGER REFERENCES affiliate_links(id),
  -- Status
  status        VARCHAR(20) DEFAULT 'draft',  -- draft | scheduled | sending | sent | partial | failed | cancelled
  scheduled_at  TIMESTAMP,
  sent_at       TIMESTAMP,
  -- Stats (denormalised for performance — updated by triggers/jobs)
  total_contacts INTEGER DEFAULT 0,
  sent_count    INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  opened_count  INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  registered_count INTEGER DEFAULT 0,
  -- Meta
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aff_campaigns_affiliate ON affiliate_campaigns(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_campaigns_status    ON affiliate_campaigns(status);

-- Now backfill FK that affiliate_tokens references (deferred FK not
-- supported easily in Postgres without deferrable, so we add it now).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name='aff_tokens_campaign_fk'
  ) THEN
    ALTER TABLE affiliate_tokens
      ADD CONSTRAINT aff_tokens_campaign_fk
        FOREIGN KEY (campaign_id) REFERENCES affiliate_campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name='aff_tokens_contact_fk'
  ) THEN
    ALTER TABLE affiliate_tokens
      ADD CONSTRAINT aff_tokens_contact_fk
        FOREIGN KEY (contact_id) REFERENCES affiliate_contacts(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name='aff_attr_campaign_fk'
  ) THEN
    ALTER TABLE affiliate_attributions
      ADD CONSTRAINT aff_attr_campaign_fk
        FOREIGN KEY (campaign_id) REFERENCES affiliate_campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name='aff_attr_contact_fk'
  ) THEN
    ALTER TABLE affiliate_attributions
      ADD CONSTRAINT aff_attr_contact_fk
        FOREIGN KEY (contact_id) REFERENCES affiliate_contacts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 9. Campaign sends — per-contact send tracking ─────────────────
CREATE TABLE IF NOT EXISTS affiliate_campaign_sends (
  id            BIGSERIAL PRIMARY KEY,
  campaign_id   INTEGER NOT NULL REFERENCES affiliate_campaigns(id) ON DELETE CASCADE,
  contact_id    INTEGER NOT NULL REFERENCES affiliate_contacts(id) ON DELETE CASCADE,
  affiliate_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id      VARCHAR(64) REFERENCES affiliate_tokens(token) ON DELETE SET NULL,
  -- Delivery status
  status        VARCHAR(20) DEFAULT 'queued', -- queued | sent | delivered | bounced | failed
  sent_at       TIMESTAMP,
  delivered_at  TIMESTAMP,
  bounced_at    TIMESTAMP,
  -- Engagement
  opened        BOOLEAN DEFAULT FALSE,
  opened_at     TIMESTAMP,
  clicked       BOOLEAN DEFAULT FALSE,
  clicked_at    TIMESTAMP,
  -- Conversion
  registered    BOOLEAN DEFAULT FALSE,
  registered_at TIMESTAMP,
  UNIQUE (campaign_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_aff_sends_campaign   ON affiliate_campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_aff_sends_contact    ON affiliate_campaign_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_aff_sends_affiliate  ON affiliate_campaign_sends(affiliate_id);

-- ── 10. Affiliate audit log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_audit_log (
  id            BIGSERIAL PRIMARY KEY,
  actor_id      INTEGER REFERENCES users(id),
  action        VARCHAR(100) NOT NULL,
  -- entity
  affiliate_id  INTEGER REFERENCES users(id),
  entity_type   VARCHAR(50),
  entity_id     INTEGER,
  -- change tracking
  previous_value JSONB,
  new_value     JSONB,
  ip_address    VARCHAR(50),
  created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aff_audit_affiliate ON affiliate_audit_log(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_audit_actor     ON affiliate_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_aff_audit_action    ON affiliate_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_aff_audit_at        ON affiliate_audit_log(created_at DESC);

-- ── 11. Attribution config (singleton row — rule engine) ─────────
-- Stores the active attribution rule so it can be changed by admin
-- without a code deploy.
CREATE TABLE IF NOT EXISTS affiliate_attribution_config (
  id            SERIAL PRIMARY KEY,
  rule          VARCHAR(50) DEFAULT 'first_wins',  -- first_wins | last_wins | highest_value
  token_ttl_days INTEGER DEFAULT 7,
  allow_reassign BOOLEAN DEFAULT FALSE,
  updated_by    INTEGER REFERENCES users(id),
  updated_at    TIMESTAMP DEFAULT NOW()
);
-- Seed default config (idempotent)
INSERT INTO affiliate_attribution_config (rule, token_ttl_days, allow_reassign)
  SELECT 'first_wins', 7, FALSE
  WHERE NOT EXISTS (SELECT 1 FROM affiliate_attribution_config LIMIT 1);

-- ── 12. crm_leads.affiliate_id FK formalisation ──────────────────
-- The column already exists from the schema; we just add the index
-- if missing (the FK was defined in the original crm_v2_full_schema).
CREATE INDEX IF NOT EXISTS idx_crm_leads_affiliate
  ON crm_leads(affiliate_id) WHERE affiliate_id IS NOT NULL;

-- ── 13. Verify final state ────────────────────────────────────────
DO $$
DECLARE
  t text;
  expected text[] := ARRAY[
    'affiliate_assignments','affiliate_links','affiliate_link_clicks',
    'affiliate_tokens','affiliate_attributions','affiliate_contacts',
    'affiliate_campaigns','affiliate_campaign_sends','affiliate_audit_log',
    'affiliate_attribution_config'
  ];
BEGIN
  FOREACH t IN ARRAY expected LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name=t) THEN
      RAISE EXCEPTION 'Migration 025: Table % was not created', t;
    END IF;
  END LOOP;
  RAISE NOTICE 'Migration 025 affiliate_program: all tables verified OK';
END $$;
