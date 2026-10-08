-- ============================================================================
-- MIGRATION 041: add `primary_business_outcome` to products (solutions)
-- Idempotent — safe to run multiple times.
--
-- CONTEXT
-- The Angular solution-create form has always collected "Business Outcomes"
-- and posted them as `primary_business_outcome`, and solution-detail has
-- always rendered them if present. But the `products` table (which holds
-- product/service/solution rows, discriminated by action_type) never had
-- this column — it only existed on the unrelated `bundles` table. The
-- backend silently dropped the field on create/update, so outcomes entered
-- during solution creation were never persisted and never showed on view.
--
-- Postgres TEXT[] matches the other list-like columns on this table
-- (customer_challenges, use_cases, ...). Defaults to an empty array so
-- existing rows read back as [] rather than NULL.
-- ============================================================================

BEGIN;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS primary_business_outcome TEXT[] DEFAULT '{}';

-- Backfill any pre-existing NULLs to an empty array for consistent reads.
UPDATE products SET primary_business_outcome = '{}' WHERE primary_business_outcome IS NULL;

COMMENT ON COLUMN products.primary_business_outcome IS
  'Business outcomes for a solution (multi-select). Independent of publish status.';

COMMIT;
