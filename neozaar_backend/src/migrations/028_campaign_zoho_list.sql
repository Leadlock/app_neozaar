-- ============================================================
-- Migration 028: Campaign "For which list?" tracking
-- Idempotent — safe to run multiple times.
-- ============================================================
--
-- CONTEXT
-- ─────────────────────────────────────────────────────────────
-- Pushing a campaign to Zoho (campaigns.controller.js -> pushCampaign)
-- creates an unsent draft, but which Zoho mailing list that draft is
-- meant for is decided by hand inside Zoho afterward and never recorded
-- on our side. Ops wants a paper trail: at push time the admin now
-- answers "For which list?" in a mandatory modal, and that answer is
-- both emailed to tech-support@neozaar.com and stored here for tracking.
--
-- FIX
-- ─────────────────────────────────────────────────────────────
-- One nullable text column holding the admin's free-text answer from the
-- most recent push. Overwritten on each re-push, same as
-- zoho_campaign_key / zoho_campaign_pushed_at.
-- ============================================================

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS zoho_list_label TEXT;

COMMENT ON COLUMN campaigns.zoho_list_label IS 'Free-text answer to "For which list?" captured at the most recent Zoho push; also emailed to tech-support@neozaar.com for tracking';
