BEGIN;

ALTER TABLE marketing_segments
  ADD COLUMN IF NOT EXISTS evaluation_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS evaluation_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evaluation_error VARCHAR(500),
  ADD COLUMN IF NOT EXISTS refresh_interval_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS next_refresh_at TIMESTAMP;

ALTER TABLE marketing_segment_members
  ADD COLUMN IF NOT EXISTS membership_reason JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evaluation_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_mkt_segments_refresh
  ON marketing_segments(next_refresh_at) WHERE is_dynamic = TRUE;
CREATE INDEX IF NOT EXISTS idx_mkt_segment_members_contact
  ON marketing_segment_members(marketing_contact_id);

CREATE TABLE IF NOT EXISTS marketing_tag_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  tag_id INTEGER NOT NULL REFERENCES marketing_tags(id) ON DELETE CASCADE,
  trigger_type VARCHAR(30) NOT NULL CHECK (trigger_type IN ('event','score','segment','lifecycle')),
  conditions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_tag_history (
  id BIGSERIAL PRIMARY KEY,
  marketing_contact_id INTEGER NOT NULL REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES marketing_tags(id) ON DELETE SET NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('added','removed')),
  source VARCHAR(30) NOT NULL,
  rule_id INTEGER REFERENCES marketing_tag_rules(id) ON DELETE SET NULL,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mkt_tag_history_contact ON marketing_tag_history(marketing_contact_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS marketing_segment_history (
  id BIGSERIAL PRIMARY KEY,
  marketing_contact_id INTEGER NOT NULL REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  segment_id INTEGER REFERENCES marketing_segments(id) ON DELETE SET NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('entered','exited')),
  evaluation_version INTEGER NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mkt_segment_history_contact ON marketing_segment_history(marketing_contact_id,occurred_at DESC);

COMMIT;
