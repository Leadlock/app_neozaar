-- ============================================================
-- Migration 029: Campaign header (banner) image
-- Idempotent — safe to run multiple times.
-- ============================================================
--
-- CONTEXT
-- ─────────────────────────────────────────────────────────────
-- A campaign currently renders only: title, optional intro
-- description, then the ordered listing blocks. There is no way
-- to put one banner/hero image under the title+description and
-- above the listings — the same wide, gradient-framed image slot
-- the single-listing push uses (campaignTemplate.js galleryBlockHtml).
--
-- FIX
-- ─────────────────────────────────────────────────────────────
-- Two nullable columns on `campaigns`:
--   header_image — hosted URL of the uploaded banner (optional)
--   header_link  — where a click on that banner should go
--                  (only meaningful when header_image is set;
--                   the API nulls it out whenever header_image is empty)
-- ============================================================

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS header_image TEXT,
  ADD COLUMN IF NOT EXISTS header_link  TEXT;

COMMENT ON COLUMN campaigns.header_image IS 'Optional banner image shown below the title/description and above the listings; same style as the single-listing gallery image';
COMMENT ON COLUMN campaigns.header_link IS 'Optional target URL opened when the header_image is clicked; only stored when header_image is set';
