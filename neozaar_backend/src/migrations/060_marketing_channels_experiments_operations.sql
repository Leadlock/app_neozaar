BEGIN;

ALTER TABLE marketing_channel_templates
  ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE marketing_experiments
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Queue timestamps must be timezone-aware. Without this, a process running in
-- Asia/Kolkata can write an immediate JavaScript Date 5:30 into the future
-- relative to a UTC PostgreSQL server.
ALTER TABLE marketing_jobs
  ALTER COLUMN available_at TYPE TIMESTAMPTZ USING available_at AT TIME ZONE 'UTC',
  ALTER COLUMN leased_at TYPE TIMESTAMPTZ USING leased_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE marketing_email_messages
  ALTER COLUMN scheduled_at TYPE TIMESTAMPTZ USING scheduled_at AT TIME ZONE 'UTC',
  ALTER COLUMN sent_at TYPE TIMESTAMPTZ USING sent_at AT TIME ZONE 'UTC';
ALTER TABLE marketing_crm_handoff_requests
  ALTER COLUMN available_at TYPE TIMESTAMPTZ USING available_at AT TIME ZONE 'UTC',
  ALTER COLUMN processed_at TYPE TIMESTAMPTZ USING processed_at AT TIME ZONE 'UTC';

CREATE INDEX IF NOT EXISTS idx_mkt_outbound_audit_channel_created
  ON marketing_outbound_audit(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_outbound_audit_status_created
  ON marketing_outbound_audit(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_experiment_events_experiment_time
  ON marketing_experiment_events(experiment_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_conversions_occurred
  ON marketing_conversions(occurred_at DESC);

COMMIT;
