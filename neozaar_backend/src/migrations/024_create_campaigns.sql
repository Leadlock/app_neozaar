-- ============================================================
-- Migration 024: Campaigns composer
-- Idempotent — safe to run multiple times.
-- ============================================================
--
-- PROBLEM
-- ─────────────────────────────────────────────────────────────
-- The single-listing "Push to Zoho" flow (products/services/solutions'
-- zoho_campaign_key columns, added in migration 016) only ever renders
-- exactly one listing per email. There's no way to combine several
-- products/services/solutions into a single composed campaign.
--
-- FIX
-- ─────────────────────────────────────────────────────────────
-- A `campaigns` table: a title, optional intro description, and an
-- ordered `blocks` array (JSONB) — each block references one listing
-- and carries its own layout/image/field-selection config. Mirrors the
-- crm_quotes.items convention (single JSONB array column, replace-all
-- on update) rather than a normalized child table, since no ordering
-- column (order_index/position) exists anywhere else in this schema to
-- extend instead.
--
-- Content is never snapshotted into `blocks` — only the listing id,
-- action_type, and the admin's chosen layout/image/fields are stored.
-- The actual name/description/etc. are re-read live from `products` (and
-- `product_other_details` for services) at preview/push time, same as
-- the existing single-listing flow.
-- ============================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  blocks JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft' | 'pushed'
  zoho_campaign_key TEXT,
  zoho_campaign_pushed_at TIMESTAMP,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN campaigns.blocks IS 'Ordered array of {listingId, actionType, layout, image, includeFields} — array order is the display order';
COMMENT ON COLUMN campaigns.status IS 'draft until pushed to Zoho at least once; stays editable/re-pushable afterward (force semantics, same as the single-listing flow)';

-- Verify the table was created
-- \d campaigns
