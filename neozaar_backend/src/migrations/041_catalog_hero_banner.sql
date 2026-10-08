-- ============================================================================
-- MIGRATION: catalog_hero_banner
-- Drives the promo banner in the RIGHT (70%) panel of each marketplace catalog
-- listing page's hero (/marketplace/product, /marketplace/service,
-- /marketplace/solution) — the LEFT (30%) panel stays the existing
-- "<TYPE> CATALOG" heading + description. Same shape as hero_wide_banner, plus
-- catalog_type so one admin screen can target any of the three catalogs.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.catalog_hero_banner (
  id            SERIAL PRIMARY KEY,
  catalog_type  VARCHAR(20) NOT NULL CHECK (catalog_type IN ('product', 'service', 'solution')),
  banner        TEXT,
  mobile_banner TEXT,
  label         VARCHAR(100),
  link          TEXT,
  title         VARCHAR(255) NOT NULL,
  is_feature    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_catalog_hero_banner_type_feature
  ON public.catalog_hero_banner (catalog_type, is_feature);

COMMIT;
