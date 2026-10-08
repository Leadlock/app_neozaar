-- ============================================================
-- MIGRATION 008: Add solution-specific fields to products table
-- Safe to run multiple times (IF NOT EXISTS guards)
-- ============================================================

BEGIN;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS customer_challenges                TEXT[]       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS use_cases                          TEXT[]       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS slug                               VARCHAR(255),
  ADD COLUMN IF NOT EXISTS select_isv_products                BIGINT[]     DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS select_spectrum_partner_services   BIGINT[]     DEFAULT '{}';

-- Unique index on slug (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products (slug) WHERE slug IS NOT NULL;

COMMIT;
