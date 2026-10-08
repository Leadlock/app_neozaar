-- ══════════════════════════════════════════════════════════════════════════
-- 042_marketing.sql — NeoZaar Marketing Automation (Phase 1–2 foundation)
--
-- Design principle (per non-regression rule): EXTEND > REUSE > INTEGRATE > CREATE.
-- Marketing does NOT duplicate contacts/leads/products. It layers a marketing
-- profile ON TOP of the existing crm_contacts entity via a foreign key, and
-- references existing catalog rows by id only. Every table is additive and
-- idempotent (CREATE TABLE IF NOT EXISTS) so re-running is safe and no existing
-- table is altered or dropped.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Marketing contact profile ─────────────────────────────────────────────
-- One marketing profile per CRM contact. crm_contact_id is the link back to the
-- single source of truth for identity (name/email/phone/company live there).
CREATE TABLE IF NOT EXISTS marketing_contacts (
  id                     SERIAL PRIMARY KEY,
  crm_contact_id         INTEGER UNIQUE REFERENCES crm_contacts(id) ON DELETE CASCADE,
  -- Denormalised identity kept only for anonymous visitors not yet in CRM.
  anonymous_id           VARCHAR(64),          -- cookie/visitor id before they are known
  email                  VARCHAR(255),
  phone                  VARCHAR(50),
  -- Marketing engagement scoring — SEPARATE from crm_leads.score (customer/opp score).
  marketing_score        INTEGER NOT NULL DEFAULT 0,
  score_updated_at       TIMESTAMP,
  lifecycle_stage        VARCHAR(40) NOT NULL DEFAULT 'subscriber',
                         -- visitor, subscriber, lead, mql, sql, customer
  -- Source / attribution (first + last touch). Affiliate attribution stays in the
  -- affiliate system; these are marketing-source fields only.
  first_source           VARCHAR(100),
  first_campaign         VARCHAR(255),
  last_source            VARCHAR(100),
  last_campaign          VARCHAR(255),
  utm_source             VARCHAR(150),
  utm_medium             VARCHAR(150),
  utm_campaign           VARCHAR(150),
  utm_content            VARCHAR(150),
  utm_term               VARCHAR(150),
  -- Consent / suppression (checked before any send; mirrors DPDPA consent console).
  email_consent          BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_consent       BOOLEAN NOT NULL DEFAULT FALSE,
  sms_consent            BOOLEAN NOT NULL DEFAULT FALSE,
  do_not_contact         BOOLEAN NOT NULL DEFAULT FALSE,
  unsubscribed_at        TIMESTAMP,
  last_activity_at       TIMESTAMP,
  is_deleted             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mkt_contacts_crm      ON marketing_contacts(crm_contact_id);
CREATE INDEX IF NOT EXISTS idx_mkt_contacts_anon     ON marketing_contacts(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_mkt_contacts_stage    ON marketing_contacts(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_mkt_contacts_email    ON marketing_contacts(email);

-- ── 2. Event tracking engine ────────────────────────────────────────────────
-- Central, extensible event log. High volume → indexed on contact + type + time.
-- ref_type/ref_id reference existing catalog rows (product/service/solution) by id,
-- never copying catalog data.
CREATE TABLE IF NOT EXISTS marketing_events (
  id                     BIGSERIAL PRIMARY KEY,
  marketing_contact_id   INTEGER REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  anonymous_id           VARCHAR(64),          -- set for events before contact is known
  event_type             VARCHAR(50) NOT NULL, -- PAGE_VIEW, PRODUCT_VIEW, FORM_SUBMIT, EMAIL_OPEN, ...
  ref_type               VARCHAR(30),          -- product | service | solution | email | form | asset | campaign
  ref_id                 INTEGER,              -- id of the referenced existing entity
  url                    TEXT,
  channel                VARCHAR(20),          -- web | email | whatsapp | sms | api
  score_delta            INTEGER NOT NULL DEFAULT 0,
  metadata               JSONB NOT NULL DEFAULT '{}',
  occurred_at            TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mkt_events_contact    ON marketing_events(marketing_contact_id);
CREATE INDEX IF NOT EXISTS idx_mkt_events_type       ON marketing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_mkt_events_occurred   ON marketing_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_mkt_events_anon       ON marketing_events(anonymous_id);

-- ── 3. Tags ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_tags (
  id                     SERIAL PRIMARY KEY,
  name                   VARCHAR(80) NOT NULL UNIQUE,
  color                  VARCHAR(20),
  auto_rule              JSONB,                -- optional rule for automatic tagging
  created_by             BIGINT REFERENCES users(id),
  created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_contact_tags (
  marketing_contact_id   INTEGER NOT NULL REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  tag_id                 INTEGER NOT NULL REFERENCES marketing_tags(id) ON DELETE CASCADE,
  added_at               TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (marketing_contact_id, tag_id)
);

-- ── 4. Segments (dynamic, rule-based) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_segments (
  id                     SERIAL PRIMARY KEY,
  name                   VARCHAR(120) NOT NULL,
  description            TEXT,
  -- Rule definition evaluated by the segmentation engine. Shape:
  -- { match: 'all'|'any', rules: [{ field, op, value }] }
  rules                  JSONB NOT NULL DEFAULT '{"match":"all","rules":[]}',
  is_dynamic             BOOLEAN NOT NULL DEFAULT TRUE,
  member_count           INTEGER NOT NULL DEFAULT 0,
  last_evaluated_at      TIMESTAMP,
  created_by             BIGINT REFERENCES users(id),
  created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_segment_members (
  segment_id             INTEGER NOT NULL REFERENCES marketing_segments(id) ON DELETE CASCADE,
  marketing_contact_id   INTEGER NOT NULL REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  added_at               TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (segment_id, marketing_contact_id)
);

-- ── 5. Scoring rules ─────────────────────────────────────────────────────────
-- Event → score change map. Positive and negative deltas both supported.
CREATE TABLE IF NOT EXISTS marketing_scoring_rules (
  id                     SERIAL PRIMARY KEY,
  event_type             VARCHAR(50) NOT NULL,
  score_delta            INTEGER NOT NULL DEFAULT 0,
  description            VARCHAR(255),
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_by             BIGINT REFERENCES users(id),
  created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed a sensible default scoring model (idempotent — only inserts if empty).
INSERT INTO marketing_scoring_rules (event_type, score_delta, description)
SELECT * FROM (VALUES
  ('PRODUCT_VIEW',     2,  'Viewed a product'),
  ('SERVICE_VIEW',     2,  'Viewed a service'),
  ('SOLUTION_VIEW',    2,  'Viewed a solution'),
  ('PRICING_VIEW',     5,  'Viewed pricing'),
  ('ASSET_DOWNLOAD',  10,  'Downloaded an asset'),
  ('FORM_SUBMIT',     15,  'Submitted a form'),
  ('EMAIL_OPEN',       2,  'Opened a marketing email'),
  ('EMAIL_CLICK',      5,  'Clicked a marketing email'),
  ('DEMO_REQUEST',    25,  'Requested a demo'),
  ('ASSESSMENT_REQUEST', 30, 'Requested an assessment')
) AS seed(event_type, score_delta, description)
WHERE NOT EXISTS (SELECT 1 FROM marketing_scoring_rules);
