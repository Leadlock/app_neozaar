BEGIN;

ALTER TABLE marketing_events
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
  ADD COLUMN IF NOT EXISTS ingestion_source VARCHAR(30) NOT NULL DEFAULT 'management_api',
  ADD COLUMN IF NOT EXISTS schema_version SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) NOT NULL DEFAULT 'processed',
  ADD COLUMN IF NOT EXISTS failure_code VARCHAR(80),
  ADD COLUMN IF NOT EXISTS failure_message VARCHAR(500),
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_mkt_events_source_idempotency
  ON marketing_events(ingestion_source, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mkt_events_processing
  ON marketing_events(processing_status, received_at);

COMMIT;
