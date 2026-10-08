-- ============================================================
-- Migration 014: Seller Opportunity Visibility Fix
-- Date: 2025
-- Idempotent — safe to run multiple times.
-- ============================================================
--
-- PROBLEM
-- ─────────────────────────────────────────────────────────────
-- getOpportunities filtered SELLER visibility using only:
--
--   o.seller_id = <user_id>
--
-- This caused two blind spots:
--
--   1. Opportunities a SELLER created directly (created_by = their id)
--      but where seller_id was not yet set (e.g. before M_SELLER
--      assigns them, or legacy records) were invisible to the seller.
--
--   2. Lead-converted opportunities (lifecycle.engine.convertCustomerToOpportunity)
--      inserted with owner_id = seller but seller_id = NULL, making them
--      completely invisible to the seller at any score — including score = 0
--      (Closed Lost) where the deal is still historically theirs.
--
-- FIX — two parts
-- ─────────────────────────────────────────────────────────────
--
-- Part A: Backend query change (no DB change needed)
--   opportunities.controller.js — getOpportunities SELLER filter changed from:
--     o.seller_id = $N
--   to:
--     (o.seller_id = $N OR o.created_by = $N)
--
--   This ensures a SELLER always sees:
--     • Opportunities explicitly assigned to them (seller_id)
--     • Opportunities they created themselves (created_by)
--   regardless of stage or score value (including Closed Lost / score = 0).
--
-- Part B: lifecycle.engine.js — convertCustomerToOpportunity
--   When a lead's effective owner is a SELLER, the converted opportunity
--   now has seller_id set to that owner so it is immediately visible on
--   their dashboard without requiring an explicit M_SELLER assignment.
--
-- DB CHANGES
-- ─────────────────────────────────────────────────────────────
-- No new columns required.
--   • seller_id  — already added by migration 004
--   • created_by — exists in base schema (crm_v2_full_schema.sql)
--
-- Only a supporting index is added below to make the OR condition
-- on created_by perform efficiently at scale.
-- ============================================================

-- Index: speed up the (seller_id OR created_by) filter for SELLER queries
CREATE INDEX IF NOT EXISTS idx_crm_opps_created_by
  ON crm_opportunities(created_by)
  WHERE is_deleted = FALSE;

-- Backfill: for any existing opportunities where the creator is a SELLER
-- but seller_id is NULL, set seller_id = created_by so they appear on the
-- seller's dashboard immediately after this migration runs.
-- This is a one-time data fix; future records are handled by the controller.
UPDATE crm_opportunities o
SET    seller_id = o.created_by,
       updated_at = NOW()
WHERE  o.seller_id IS NULL
  AND  o.is_deleted = FALSE
  AND  EXISTS (
         SELECT 1 FROM users u
         WHERE  u.id = o.created_by
           AND  u.role_type = 'SELLER'
           AND  u.is_active = TRUE
       );
