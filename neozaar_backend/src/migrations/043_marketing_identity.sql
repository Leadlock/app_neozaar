BEGIN;

CREATE TABLE IF NOT EXISTS marketing_visitors (
  id BIGSERIAL PRIMARY KEY,
  visitor_id VARCHAR(64) NOT NULL UNIQUE,
  marketing_contact_id INTEGER REFERENCES marketing_contacts(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  page_count INTEGER NOT NULL DEFAULT 0,
  landing_page TEXT,
  exit_page TEXT,
  referrer TEXT,
  first_utm JSONB NOT NULL DEFAULT '{}',
  latest_utm JSONB NOT NULL DEFAULT '{}',
  device JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS marketing_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL UNIQUE,
  visitor_id BIGINT NOT NULL REFERENCES marketing_visitors(id) ON DELETE CASCADE,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  page_count INTEGER NOT NULL DEFAULT 0,
  landing_page TEXT,
  exit_page TEXT,
  referrer TEXT,
  utm JSONB NOT NULL DEFAULT '{}',
  device JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_mkt_sessions_visitor ON marketing_sessions(visitor_id, last_seen_at DESC);

ALTER TABLE marketing_contacts
  ADD COLUMN IF NOT EXISTS email_normalized VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone_normalized VARCHAR(32),
  ADD COLUMN IF NOT EXISTS merged_into_contact_id INTEGER,
  ADD COLUMN IF NOT EXISTS identified_at TIMESTAMP;

ALTER TABLE marketing_events
  ADD COLUMN IF NOT EXISTS marketing_session_id BIGINT REFERENCES marketing_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS utm_source VARCHAR(150),
  ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(150),
  ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(150),
  ADD COLUMN IF NOT EXISTS utm_term VARCHAR(150),
  ADD COLUMN IF NOT EXISTS utm_content VARCHAR(150),
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS landing_page TEXT;

UPDATE marketing_contacts
SET email_normalized = LOWER(TRIM(email))
WHERE email IS NOT NULL AND email_normalized IS NULL;

UPDATE marketing_contacts
SET phone_normalized = REGEXP_REPLACE(phone, '[^0-9+]', '', 'g')
WHERE phone IS NOT NULL AND phone_normalized IS NULL;

CREATE INDEX IF NOT EXISTS idx_mkt_contacts_email_normalized
  ON marketing_contacts(email_normalized) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_mkt_contacts_phone_normalized
  ON marketing_contacts(phone_normalized) WHERE is_deleted = FALSE;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'marketing_contacts'
      AND constraint_name = 'marketing_contacts_merged_into_fkey'
  ) THEN
    ALTER TABLE marketing_contacts ADD CONSTRAINT marketing_contacts_merged_into_fkey
      FOREIGN KEY (merged_into_contact_id) REFERENCES marketing_contacts(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
DECLARE v_constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
  WHERE tc.table_schema = 'public' AND tc.table_name = 'marketing_contacts'
    AND tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'crm_contacts'
    AND ccu.column_name = 'id' LIMIT 1;
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE marketing_contacts DROP CONSTRAINT %I', v_constraint_name);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'marketing_contacts'
      AND constraint_name = 'marketing_contacts_crm_contact_id_fkey'
  ) THEN
    ALTER TABLE marketing_contacts ADD CONSTRAINT marketing_contacts_crm_contact_id_fkey
      FOREIGN KEY (crm_contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS marketing_identity_keys (
  id BIGSERIAL PRIMARY KEY,
  marketing_contact_id INTEGER NOT NULL REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  identity_type VARCHAR(30) NOT NULL CHECK (identity_type IN ('anonymous_id', 'email', 'phone')),
  identity_value VARCHAR(255) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (identity_type, identity_value)
);
CREATE INDEX IF NOT EXISTS idx_mkt_identity_contact ON marketing_identity_keys(marketing_contact_id);

CREATE TABLE IF NOT EXISTS marketing_identity_merges (
  id BIGSERIAL PRIMARY KEY,
  source_contact_id INTEGER REFERENCES marketing_contacts(id) ON DELETE SET NULL,
  target_contact_id INTEGER REFERENCES marketing_contacts(id) ON DELETE SET NULL,
  reason VARCHAR(100) NOT NULL,
  merged_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

COMMIT;
