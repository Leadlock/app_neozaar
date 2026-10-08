-- marketing_crm_handoff_requests had no consumer at all, and no retry
-- bookkeeping (unlike marketing_jobs, which every other worker in this
-- module already uses). Adding the same attempts/max_attempts/available_at
-- shape so the new handoff worker behaves consistently with the rest.
BEGIN;

ALTER TABLE marketing_crm_handoff_requests
  ADD COLUMN IF NOT EXISTS attempts     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS available_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_mkt_crm_handoff_status_available
  ON marketing_crm_handoff_requests(status, available_at);

COMMIT;
