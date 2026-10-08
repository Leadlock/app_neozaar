-- Migration: 016_add_zoho_campaign_tracking_to_products
-- Tracks whether a product/service/solution has already been pushed to Zoho Campaigns as a draft,
-- so the push action can be guarded against creating duplicate drafts for the same listing.
-- Run once against your PostgreSQL database

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS zoho_campaign_key TEXT;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS zoho_campaign_pushed_at TIMESTAMP;

COMMENT ON COLUMN products.zoho_campaign_key IS 'Campaign key returned by Zoho Campaigns when this listing was pushed as a draft; null if never pushed';
COMMENT ON COLUMN products.zoho_campaign_pushed_at IS 'When this listing was last pushed to Zoho Campaigns as a draft';
