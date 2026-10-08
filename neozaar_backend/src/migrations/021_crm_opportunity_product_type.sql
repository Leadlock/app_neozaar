-- ============================================================
-- Migration 021: Add product_type column to crm_opportunities
-- Idempotent — safe to run multiple times.
-- ============================================================
--
-- PROBLEM
-- ─────────────────────────────────────────────────────────────
-- Phase 2/3 of the CRM build stored "Product Type" (Product / Service /
-- Solution) in the existing `cloud` column as a pragmatic workaround to
-- avoid a schema change.  This creates two issues:
--
--   1. The `cloud` column semantically means "cloud provider preference"
--      (AWS / Azure / GCP / Multi-Cloud / On-Premise) not a product
--      category, so queries mixing both uses return meaningless results.
--
--   2. The Revenue Tracker (Dashboard 2) filters and groups opportunities
--      by type.  A dedicated column allows a proper index and avoids the
--      need for runtime NULL-coalescing in every query.
--
-- FIX
-- ─────────────────────────────────────────────────────────────
-- 1. Add product_type VARCHAR(30) to crm_opportunities.
-- 2. One-time backfill: if cloud currently holds one of the three known
--    type values (Product / Service / Solution), copy it to product_type
--    and set cloud = NULL so cloud can return to its correct purpose.
-- 3. Add an index for dashboard filter performance.
--
-- FRONTEND / BACKEND CHANGES (no additional DB migration needed)
-- ─────────────────────────────────────────────────────────────
-- • crm-opportunities.component.ts — oppPayload: replace `cloud` key
--   with `product_type` (already done in Phase 2 code).
-- • opportunities.controller.js — INSERT/UPDATE should write to
--   product_type instead of cloud.
-- ============================================================

-- Step 1: Add the dedicated column
ALTER TABLE crm_opportunities
  ADD COLUMN IF NOT EXISTS product_type VARCHAR(30) NULL;

-- Step 2: Backfill — copy cloud→product_type where cloud holds a type value
UPDATE crm_opportunities
SET    product_type = cloud,
       cloud        = NULL,
       updated_at   = NOW()
WHERE  cloud IN ('Product', 'Service', 'Solution')
  AND  product_type IS NULL
  AND  is_deleted = FALSE;

-- Step 3: Index for Revenue Tracker dashboard group-by / filter queries
CREATE INDEX IF NOT EXISTS idx_crm_opps_product_type
  ON crm_opportunities(product_type)
  WHERE product_type IS NOT NULL AND is_deleted = FALSE;

-- Verify
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'crm_opportunities'
--   AND column_name IN ('cloud', 'product_type');
