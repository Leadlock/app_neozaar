-- ============================================================
-- MIGRATION 014: Add per-field text color & gradient controls
--                to home_master table
-- Safe to run multiple times (IF NOT EXISTS guards)
-- ============================================================

BEGIN;

-- Title
ALTER TABLE home_master
  ADD COLUMN IF NOT EXISTS title_color_type      VARCHAR(10)  DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS title_color           VARCHAR(20)  DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS title_color_end       VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS title_color_direction VARCHAR(20)  DEFAULT 'to right';

-- Color Title (the orange highlighted line)
ALTER TABLE home_master
  ADD COLUMN IF NOT EXISTS color_title_color_type      VARCHAR(10)  DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS color_title_color           VARCHAR(20)  DEFAULT '#F97316',
  ADD COLUMN IF NOT EXISTS color_title_color_end       VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS color_title_color_direction VARCHAR(20)  DEFAULT 'to right';

-- Subtitle
ALTER TABLE home_master
  ADD COLUMN IF NOT EXISTS subtitle_color_type      VARCHAR(10)  DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS subtitle_color           VARCHAR(20)  DEFAULT '#d1d5db',
  ADD COLUMN IF NOT EXISTS subtitle_color_end       VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subtitle_color_direction VARCHAR(20)  DEFAULT 'to right';

COMMIT;
