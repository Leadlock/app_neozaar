-- ============================================================
-- Migration 023: Covering indexes for Revenue Tracker (Dashboard 2)
-- Idempotent — safe to run multiple times.
-- ============================================================
--
-- CONTEXT (Phase 1 — Scaffold + Phase 3 — filterOppsByUser fix)
-- ─────────────────────────────────────────────────────────────
-- Dashboard 2 (crm-dashboard-2) performs the following query patterns
-- on crm_opportunities for every page load and every picker-filter event:
--
--   1. Date-range filter            → closed_at / created_at range scan
--   2. Stage panel / KPI grid       → GROUP BY stage
--   3. Type panel                   → GROUP BY product_type  (new col, mig 021)
--   4. User-wise tracker table      → GROUP BY owner_id / seller_id / affiliate_id
--   5. filterOppsByUser() (Phase 3) → WHERE owner_id / seller_id / affiliate_id = $N
--                                     (role-aware ID match in JS; DB filters by FK)
--   6. "Total Received" KPI (Card 6 relabel) → WHERE stage = 'Payment Received'
--   7. Recent Won Deals list        → WHERE stage = 'Closed Won' ORDER BY closed_at
--   8. Weighted revenue             → score × deal_value (needs score scan)
--
-- INDEXES ADDED
-- ─────────────────────────────────────────────────────────────
-- All indexes use partial WHERE is_deleted = FALSE to stay compact.
-- No denormalised name columns exist on crm_opportunities; filtering
-- by user name is done client-side (Angular) after a full fetch — only
-- the FK integer columns (owner_id, seller_id, affiliate_id) are indexed.
-- ============================================================

-- ── 1. Date-range scans ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crm_opps_closed_at
  ON crm_opportunities(closed_at DESC)
  WHERE closed_at IS NOT NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_crm_opps_created_at
  ON crm_opportunities(created_at DESC)
  WHERE is_deleted = FALSE;

-- ── 2. Stage panel + KPI grid ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crm_opps_stage_active
  ON crm_opportunities(stage)
  WHERE is_deleted = FALSE;

-- ── 3. Product type panel (requires migration 021) ────────────
-- idx_crm_opps_product_type was created in migration 021.
-- Listed here for documentation completeness — no duplicate needed.

-- ── 4. User-wise tracker: owner_id / seller_id / affiliate_id ─
CREATE INDEX IF NOT EXISTS idx_crm_opps_owner_active
  ON crm_opportunities(owner_id)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_crm_opps_seller_active
  ON crm_opportunities(seller_id)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_crm_opps_affiliate_active
  ON crm_opportunities(affiliate_id)
  WHERE is_deleted = FALSE;

-- ── 5. "Total Received" (Card 6 relabel) ─────────────────────
-- Fast look-up of stage = 'Payment Received' rows with their deal_value
CREATE INDEX IF NOT EXISTS idx_crm_opps_payment_received
  ON crm_opportunities(deal_value)
  WHERE stage = 'Payment Received' AND is_deleted = FALSE;

-- ── 6. Recent Won Deals ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crm_opps_closed_won
  ON crm_opportunities(closed_at DESC)
  WHERE stage = 'Closed Won' AND is_deleted = FALSE;

-- ── 7. Score (weighted revenue: score × deal_value) ──────────
CREATE INDEX IF NOT EXISTS idx_crm_opps_score_active
  ON crm_opportunities(score DESC)
  WHERE is_deleted = FALSE;

-- Verify
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'crm_opportunities'
--   AND indexname LIKE 'idx_crm_opps_%'
-- ORDER BY indexname;
