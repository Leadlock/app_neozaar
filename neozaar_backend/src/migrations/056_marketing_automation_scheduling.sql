-- Scheduled automations previously fired every single minute forever (the
-- worker calls dispatchScheduled() every 60s with no throttling of its own)
-- and only ever supported one hard-coded trigger_config.contactId — not a
-- segment. next_run_at gives real recurrence bookkeeping, matching the
-- existing marketing_jobs.available_at convention elsewhere in this schema.
BEGIN;

ALTER TABLE marketing_automations
  ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP;

COMMIT;
