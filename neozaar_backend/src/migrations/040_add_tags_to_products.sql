-- ============================================================================
-- MIGRATION 040: add `tags` to products (covers product / service / solution)
-- Idempotent — safe to run multiple times.
--
-- CONTEXT
-- Products, services and solutions are all rows in the single `products` table,
-- distinguished by action_type. This adds one free-form, searchable tag list
-- that an admin or ISV can populate for any of the three, regardless of when the
-- row was created. Tags are independent of publish status — editing them does
-- not (and must not) change is_publish / is_drapt / is_approved / status.
--
-- Postgres TEXT[] matches the other list-like, searchable columns on this table
-- (target_audience, industry, category, ...). Defaults to an empty array so
-- existing rows read back as [] rather than NULL.
-- ============================================================================

BEGIN;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Backfill any pre-existing NULLs to an empty array for consistent reads.
UPDATE products SET tags = '{}' WHERE tags IS NULL;

-- GIN index makes tag containment / overlap searches (tags @> / && ) fast.
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN (tags);

COMMENT ON COLUMN products.tags IS
  'Free-form searchable tags for product/service/solution. Admin/ISV editable. Independent of publish status.';

COMMIT;
