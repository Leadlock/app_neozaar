-- ============================================================================
-- MIGRATION: hero_wide_banner
-- New Master Data set that drives the homepage masthead's LEFT (wide, ~62%)
-- panel. Same shape as hero_carousel (which drives the narrow ~38% panel), so
-- the storefront can render both with the same cross-fade carousel treatment.
-- When no row here is featured, the masthead falls back to the GradientWaves
-- animation + hero title/subtitle text.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.hero_wide_banner (
  id            SERIAL PRIMARY KEY,
  banner        TEXT,
  mobile_banner TEXT,
  label         VARCHAR(100),
  link          TEXT,
  title         VARCHAR(255) NOT NULL,
  is_feature    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hero_wide_banner_feature ON public.hero_wide_banner (is_feature);

COMMIT;
