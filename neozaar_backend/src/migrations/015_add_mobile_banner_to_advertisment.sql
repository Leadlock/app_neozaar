-- Migration: 015_add_mobile_banner_to_advertisment
-- Adds mobile_banner column to the advertisment table
-- Run once against your PostgreSQL database

ALTER TABLE advertisment
  ADD COLUMN IF NOT EXISTS mobile_banner TEXT;

COMMENT ON COLUMN advertisment.mobile_banner IS 'URL of the mobile-optimised banner image for this advertisement';
