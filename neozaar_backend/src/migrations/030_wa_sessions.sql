-- ============================================================
-- MIGRATION 030: WhatsApp bot conversation sessions (wa_sessions)
-- Idempotent — safe to run multiple times.
-- ============================================================
--
-- CONTEXT
-- ─────────────────────────────────────────────────────────────
-- The WhatsApp bot ("Neo", in Neozaareact/app/allapi/whatsapp)
-- used to keep conversation state in a plain in-memory object.
-- That state is lost on every redeploy and is not shared across
-- instances, so a returning customer drops back to the main menu
-- mid-journey. The new engagement/routing flow leans on context
-- surviving between messages that may be minutes or hours apart
-- ("don't make the customer repeat themselves"), so state now
-- lives here.
--
-- SHAPE
-- ─────────────────────────────────────────────────────────────
--   phone         E.164 digits (no '+'), the WhatsApp `from` — PK,
--                 one live session per number
--   state         current router position, e.g. 'main_menu',
--                 'offer_intent', 'solution_detail' (nullable while
--                 a session is being created)
--   context       accumulated journey data as JSONB: selected
--                 solution/product/service, vendor, catalog ids +
--                 status, commercial_route, commercial_intent,
--                 services_status, target_cloud, business_outcome,
--                 name/company/email, and a trimmed `history` array
--                 used for the "pass along what we discussed" handoff
--   last_intent   last detected direct intent (analytics / debugging)
--   message_count inbound messages handled in this session
--   expires_at    updated_at + 24h, bumped on every write; a session
--                 past this is treated as absent and swept
--
-- The bot also creates this table lazily on first use
-- (sessionSchema.js → ensureSessionsTable); this migration is the
-- formal record and the path used by the server migration runbook.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS wa_sessions (
  phone         VARCHAR(32)  PRIMARY KEY,
  state         VARCHAR(64),
  context       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  last_intent   VARCHAR(64),
  message_count INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT now(),
  expires_at    TIMESTAMP    NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Sweep of expired sessions: DELETE FROM wa_sessions WHERE expires_at < now()
CREATE INDEX IF NOT EXISTS idx_wa_sessions_expires_at ON wa_sessions (expires_at);

COMMENT ON TABLE  wa_sessions               IS 'Live conversation state for the WhatsApp bot (Neo). One row per phone number; rows past expires_at are stale and swept.';
COMMENT ON COLUMN wa_sessions.phone         IS 'E.164 digits without "+"; the WhatsApp message `from`.';
COMMENT ON COLUMN wa_sessions.state         IS 'Current router position, e.g. main_menu, offer_intent, solution_detail.';
COMMENT ON COLUMN wa_sessions.context       IS 'Accumulated journey data (selections, catalog ids/status, commercial route/intent, contact fields, trimmed history) as JSONB.';
COMMENT ON COLUMN wa_sessions.last_intent   IS 'Last detected direct intent — analytics/debugging only.';
COMMENT ON COLUMN wa_sessions.message_count IS 'Count of inbound messages handled in this session.';
COMMENT ON COLUMN wa_sessions.expires_at    IS 'updated_at + 24h, bumped on every write; session is treated as absent once past this.';

COMMIT;
