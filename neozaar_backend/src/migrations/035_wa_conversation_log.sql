-- ============================================================
-- MIGRATION 035: WhatsApp conversation log (wa_messages, wa_contacts)
-- Idempotent — safe to run multiple times.
-- ============================================================
--
-- CONTEXT
-- ─────────────────────────────────────────────────────────────
-- Meta's Cloud API gives no way to fetch past messages, and the
-- number is API-only (no Business App / Coexistence inbox), so
-- there is no record of who messaged the WhatsApp bot ("Neo") or
-- what was said once a session ends. `wa_sessions` is live state
-- only — rows are deleted on submit/reset and after 24h.
--
-- This adds self-logging: the bot writes one row per message as it
-- flows (Neozaareact → lib/messageLog.js), and a per-number rollup.
--   wa_messages  — full transcript, inbound + outbound
--   wa_contacts  — every number that has messaged, with last-seen
--                  and counts; the "who" list
--
-- Retention: a daily job hard-deletes wa_messages older than
-- WA_MSG_RETENTION_DAYS (default 545 ≈ 18 months). wa_contacts is
-- kept indefinitely (minimal, low-sensitivity), pruned only on a
-- data-subject deletion request.
--
-- CRM linkage is done at read time by joining crm_leads on the
-- normalised phone — no denormalised lead_id here.
--
-- The bot also creates these tables lazily on first use
-- (conversationSchema.js → ensureConversationTables); this
-- migration is the formal record and the server-runbook path.
-- ============================================================

BEGIN;

-- ── transcript ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_messages (
  id           bigserial    PRIMARY KEY,
  phone        varchar(32)  NOT NULL,                                   -- customer, E.164 digits, no '+'
  direction    varchar(3)   NOT NULL CHECK (direction IN ('in','out')),
  wamid        varchar(128),                                           -- Meta message id
  msg_type     varchar(24)  NOT NULL,                                   -- text | button_reply | list_reply | template | image | ...
  body         text,                                                   -- readable content (typed text, chosen option, rendered outbound body)
  choice_id    varchar(256),                                           -- reply id for taps: menu_product, route_aws, cat_...
  choice_title varchar(256),
  state        varchar(64),                                            -- router state the message belongs to (inbound only for now)
  profile_name varchar(255),                                           -- WhatsApp display name (inbound), denormalised
  meta_ts      timestamp,                                              -- Meta's message timestamp (inbound)
  status       varchar(16),                                            -- reserved: sent|delivered|read|failed (outbound)
  error        text,                                                   -- populated if an outbound send failed
  created_at   timestamp    NOT NULL DEFAULT now()
);

-- Meta retries inbound webhooks — keep one row per inbound wamid.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_messages_wamid_in
  ON wa_messages (wamid) WHERE direction = 'in' AND wamid IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_wa_messages_phone_created ON wa_messages (phone, created_at);
CREATE INDEX IF NOT EXISTS ix_wa_messages_created       ON wa_messages (created_at);  -- retention sweep

-- ── per-number rollup ("who has messaged us") ───────────────
CREATE TABLE IF NOT EXISTS wa_contacts (
  phone            varchar(32) PRIMARY KEY,
  profile_name     varchar(255),
  first_seen       timestamp   NOT NULL DEFAULT now(),
  last_seen        timestamp   NOT NULL DEFAULT now(),
  last_inbound_at  timestamp,
  last_outbound_at timestamp,
  message_count    integer     NOT NULL DEFAULT 0,   -- inbound messages handled
  last_state       varchar(64),
  last_intent      varchar(64),
  opted_out        boolean     NOT NULL DEFAULT false,
  created_at       timestamp   NOT NULL DEFAULT now(),
  updated_at       timestamp   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_wa_contacts_last_seen ON wa_contacts (last_seen DESC);

COMMENT ON TABLE  wa_messages              IS 'Full WhatsApp transcript (inbound + outbound), written by the bot as messages flow. Swept after WA_MSG_RETENTION_DAYS.';
COMMENT ON COLUMN wa_messages.direction    IS 'in = from the customer; out = sent by the bot.';
COMMENT ON COLUMN wa_messages.body         IS 'Readable content: typed text, chosen option title, media caption, or the rendered outbound message body.';
COMMENT ON COLUMN wa_messages.state        IS 'Router state the message belongs to (set for inbound; outbound left null in v1).';
COMMENT ON COLUMN wa_messages.status       IS 'Reserved for delivery status from status webhooks; unused in v1.';

COMMENT ON TABLE  wa_contacts              IS 'Every phone number that has messaged the WhatsApp bot, with last-seen, counts and opt-out. Kept indefinitely; pruned only on a deletion request.';
COMMENT ON COLUMN wa_contacts.message_count IS 'Count of inbound messages handled from this number.';
COMMENT ON COLUMN wa_contacts.opted_out    IS 'Set true when the customer sent stop/unsubscribe; the bot then stays silent until they send START.';

COMMIT;
