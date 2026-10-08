-- All five marketing background workers/crons run blind today — nothing
-- records whether they're actually alive. A stuck or crashed worker would
-- go unnoticed until someone manually checks marketing_jobs for a growing
-- queue.
BEGIN;

CREATE TABLE IF NOT EXISTS marketing_worker_heartbeats (
  worker_name  VARCHAR(50) PRIMARY KEY,
  last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  meta         JSONB NOT NULL DEFAULT '{}'
);

COMMIT;
