-- ============================================================================
-- MIGRATION: hero_carousel
-- New Master Data set that drives the homepage masthead's right-hand panel
-- (the slot previously occupied by the AskTheChamp advertisement). Same shape
-- as ask_the_champ so the storefront carousel component is reused as-is.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.hero_carousel (
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

CREATE INDEX IF NOT EXISTS idx_hero_carousel_feature ON public.hero_carousel (is_feature);

COMMIT;
