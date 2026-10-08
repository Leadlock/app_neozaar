BEGIN;

CREATE TABLE IF NOT EXISTS marketing_assets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  category VARCHAR(80),
  asset_type VARCHAR(30) NOT NULL DEFAULT 'document',
  file_url TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_landing_pages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN('draft','published','archived')),
  blocks JSONB NOT NULL DEFAULT '[]',
  seo JSONB NOT NULL DEFAULT '{}',
  form_id INTEGER REFERENCES marketing_forms(id) ON DELETE SET NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_custom_fields (
  id SERIAL PRIMARY KEY,
  label VARCHAR(120) NOT NULL,
  field_key VARCHAR(60) NOT NULL UNIQUE,
  field_type VARCHAR(20) NOT NULL CHECK(field_type IN('text','number','date','boolean','select')),
  options JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}';
ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS owner_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS marketing_contact_notes (
  id BIGSERIAL PRIMARY KEY,
  marketing_contact_id INTEGER NOT NULL REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS segment_id INTEGER REFERENCES marketing_segments(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS email_template_id INTEGER REFERENCES marketing_email_templates(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS automation_id INTEGER REFERENCES marketing_automations(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS goal_event VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_marketing_pages_status ON marketing_landing_pages(status,updated_at);
CREATE INDEX IF NOT EXISTS idx_marketing_notes_contact ON marketing_contact_notes(marketing_contact_id,created_at DESC);

COMMIT;
