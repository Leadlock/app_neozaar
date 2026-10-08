-- ============================================================
-- Migration 022: crm_opportunity_comments table
-- Idempotent — safe to run multiple times.
-- ============================================================
--
-- CONTEXT (Phase 2 — Comment Tracker)
-- ─────────────────────────────────────────────────────────────
-- The CRM Opportunities modal added a comment tracker in Phase 2:
-- a textarea + "Add" button that renders a timestamped timeline
-- with a "Latest" badge on the newest entry.
--
-- PROBLEM
-- ─────────────────────────────────────────────────────────────
-- The initial implementation stored comments only in the Angular
-- component's session-local `commentLog` array.  Comments were lost
-- every time the modal was closed — they were never persisted to the DB.
--
-- FIX
-- ─────────────────────────────────────────────────────────────
-- 1. New table: crm_opportunity_comments
--    • One row per comment entry.
--    • Links to crm_opportunities (cascade delete) and users (author).
--    • text — the comment body.
--    • created_at — used for timeline ordering + timestamp display.
--    • is_deleted — soft-delete so comments can be hidden without data loss.
--
-- 2. Indexes:
--    • Primary filter: opportunity_id (all comments for one opp).
--    • Timeline ordering: opportunity_id + created_at DESC.
--    • Author lookup: user_id (for "comments by me" queries).
--
-- BACKEND CHANGES NEEDED (no further DB migration required)
-- ─────────────────────────────────────────────────────────────
-- Add two endpoints to crm.routes.js / comments.controller.js:
--
--   GET  /crm/opportunities/:id/comments
--        → SELECT * FROM crm_opportunity_comments
--          WHERE opportunity_id = $1 AND is_deleted = FALSE
--          ORDER BY created_at DESC
--
--   POST /crm/opportunities/:id/comments
--        Body: { text: string }
--        → INSERT INTO crm_opportunity_comments
--            (opportunity_id, user_id, text, author_name)
--          VALUES ($1, $2, $3, $4) RETURNING *
--
-- FRONTEND CHANGES NEEDED (no further DB migration required)
-- ─────────────────────────────────────────────────────────────
-- In crm-opportunities.component.ts:
--   • openEdit()  → GET /crm/opportunities/:id/comments → populate commentLog
--   • addComment() → POST /crm/opportunities/:id/comments → append to commentLog
-- ============================================================

CREATE TABLE IF NOT EXISTS crm_opportunity_comments (
  id             SERIAL PRIMARY KEY,
  opportunity_id INTEGER NOT NULL
                   REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_name    VARCHAR(255),           -- snapshot of user's name at time of comment
  text           TEXT NOT NULL,
  is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Primary access pattern: all visible comments for one opportunity, newest first
CREATE INDEX IF NOT EXISTS idx_opp_comments_opp_time
  ON crm_opportunity_comments(opportunity_id, created_at DESC)
  WHERE is_deleted = FALSE;

-- Secondary: find all comments by a specific user
CREATE INDEX IF NOT EXISTS idx_opp_comments_user
  ON crm_opportunity_comments(user_id)
  WHERE is_deleted = FALSE;

-- Verify
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'crm_opportunity_comments';
