/**
 * Schema for the WhatsApp conversation log (self-logging).
 *
 * Canonical migration: neozaar_backend/src/migrations/035_wa_conversation_log.sql.
 * This mirrors that DDL so the Next app is self-sufficient —
 * `ensureConversationTables()` runs the same CREATE TABLE / INDEX IF NOT EXISTS
 * once per process, so dev / preview environments need no manual migration step.
 *
 * Keep the statements below in step with migration 035.
 */

/** Ordered, individually-executable DDL statements. All idempotent. */
export const WA_CONVERSATION_DDL = [
  `CREATE TABLE IF NOT EXISTS wa_messages (
     id           bigserial    PRIMARY KEY,
     phone        varchar(32)  NOT NULL,
     direction    varchar(3)   NOT NULL CHECK (direction IN ('in','out')),
     wamid        varchar(128),
     msg_type     varchar(24)  NOT NULL,
     body         text,
     choice_id    varchar(256),
     choice_title varchar(256),
     state        varchar(64),
     profile_name varchar(255),
     meta_ts      timestamp,
     status       varchar(16),
     error        text,
     created_at   timestamp    NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_messages_wamid_in
     ON wa_messages (wamid) WHERE direction = 'in' AND wamid IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS ix_wa_messages_phone_created ON wa_messages (phone, created_at)`,
  `CREATE INDEX IF NOT EXISTS ix_wa_messages_created ON wa_messages (created_at)`,
  `CREATE TABLE IF NOT EXISTS wa_contacts (
     phone            varchar(32) PRIMARY KEY,
     profile_name     varchar(255),
     first_seen       timestamp   NOT NULL DEFAULT now(),
     last_seen        timestamp   NOT NULL DEFAULT now(),
     last_inbound_at  timestamp,
     last_outbound_at timestamp,
     message_count    integer     NOT NULL DEFAULT 0,
     last_state       varchar(64),
     last_intent      varchar(64),
     opted_out        boolean     NOT NULL DEFAULT false,
     created_at       timestamp   NOT NULL DEFAULT now(),
     updated_at       timestamp   NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS ix_wa_contacts_last_seen ON wa_contacts (last_seen DESC)`,
];

let ensurePromise = null;

/**
 * Ensure wa_messages / wa_contacts exist. Idempotent, done at most once per
 * process (resolved promise cached); the cache is cleared on failure so a
 * later call can retry.
 * @param {import('pg').Pool} pool
 * @returns {Promise<void>}
 */
export function ensureConversationTables(pool) {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    for (const stmt of WA_CONVERSATION_DDL) {
      await pool.query(stmt);
    }
    console.log("🗂️  wa_messages / wa_contacts ready");
  })().catch((err) => {
    ensurePromise = null;
    throw err;
  });

  return ensurePromise;
}
