-- ============================================================
-- Migration 019: Structured fields for Private Offer leads
-- Idempotent — safe to run multiple times.
-- ============================================================
--
-- PROBLEM
-- ─────────────────────────────────────────────────────────────
-- The "Request Private Offer" landing page (/private-offer) submits
-- Target Cloud Environment, AWS Account ID / Azure Billing ID, and
-- Procurement Stage via POST /api/public/leads/cta-action. That endpoint
-- had no dedicated columns for these, so they were folded into the
-- free-text `requirement` field — readable, but not filterable/reportable
-- (e.g. "show me all Azure MPO requests still in Budgeting stage" required
-- a text search, not a real filter).
--
-- FIX
-- ─────────────────────────────────────────────────────────────
-- Add three dedicated columns to crm_leads. Not reusing the existing
-- generic `cloud_preference` / `budget` / `timeline` columns because
-- those are already populated by other CRM flows (leads.controller.js,
-- opportunities.controller.js, analytics.service.js) with their own
-- meaning — overloading them would mix incompatible values.
-- ============================================================

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS cloud_environment VARCHAR(100);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS cloud_account_id VARCHAR(100);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS procurement_stage VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_crm_leads_procurement_stage ON crm_leads(procurement_stage) WHERE procurement_stage IS NOT NULL;
