-- ============================================================================
-- MIGRATION: Seller-to-seller opportunity sharing / hand-off
-- Lets a SELLER hand an opportunity they own to another SELLER once their own
-- work is done / not done / not started. Keeps a full hand-off audit trail
-- (the existing design overwrites crm_opportunities.seller_id in place, so
-- without this table the prior owner is only recoverable from the generic
-- audit log).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS crm_opportunity_seller_history (
  id                 SERIAL PRIMARY KEY,
  opportunity_id     INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  from_seller_id     INTEGER REFERENCES users(id),   -- seller who shared (NULL if none)
  to_seller_id       INTEGER NOT NULL REFERENCES users(id), -- seller who received
  shared_by          INTEGER REFERENCES users(id),   -- user who performed the action
  -- Snapshot of the sharing seller's task state at hand-off time:
  -- 'done' | 'in_progress' | 'not_started'
  task_status        VARCHAR(20),
  open_task_count    INTEGER DEFAULT 0,
  done_task_count    INTEGER DEFAULT 0,
  note               TEXT,
  created_at         TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_opp_seller_hist_opp    ON crm_opportunity_seller_history(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_opp_seller_hist_to     ON crm_opportunity_seller_history(to_seller_id);
CREATE INDEX IF NOT EXISTS idx_crm_opp_seller_hist_from   ON crm_opportunity_seller_history(from_seller_id);

COMMIT;
