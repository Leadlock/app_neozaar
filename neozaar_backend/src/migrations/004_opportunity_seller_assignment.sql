-- ============================================================================
-- MIGRATION: Add seller assignment to opportunities
-- When an opportunity score reaches 40, M_SELLER can assign a SELLER to it
-- ============================================================================

BEGIN;

-- Add seller_id column to crm_opportunities
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS seller_id INTEGER REFERENCES users(id);
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS seller_assigned_at TIMESTAMP;
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS seller_assigned_by INTEGER REFERENCES users(id);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_crm_opps_seller ON crm_opportunities(seller_id);

COMMIT;
