-- ============================================================
-- Migration 020: Featured flag for categories
-- Idempotent — safe to run multiple times.
-- ============================================================
--
-- PROBLEM
-- ─────────────────────────────────────────────────────────────
-- The home page "Explore by Category" section (below Ask The Champ)
-- needs the admin to choose which categories to surface, independent
-- of the per-item `products.is_feature` flag used by the Featured page's
-- Product/Service/Solution tabs.
--
-- FIX
-- ─────────────────────────────────────────────────────────────
-- Add is_feature to categories. Toggled via the Featured page's new
-- "Category" tab (POST /api/categories/:id/feature) and read by
-- GET /api/catalog/get-category-showcase, which only returns categories
-- with is_feature = true.
-- ============================================================

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS is_feature BOOLEAN NOT NULL DEFAULT false;

-- Verify the column was added
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'is_feature';
