/**
 * Schema for the WhatsApp bot's conversation-session store.
 *
 * The canonical migration is neozaar_backend/src/migrations/030_wa_sessions.sql
 * (run by the server migration runbook). This module mirrors that DDL so the
 * Next app is self-sufficient: `ensureSessionsTable()` runs the same
 * CREATE TABLE IF NOT EXISTS once per process, on first session access, which
 * removes a manual migration step in dev / preview environments.
 *
 * Keep the statements below byte-for-byte in step with migration 030.
 */

/** Ordered, individually-executable DDL statements. All idempotent. */
export const WA_SESSIONS_DDL = [
  `CREATE TABLE IF NOT EXISTS wa_sessions (
     phone         VARCHAR(32)  PRIMARY KEY,
     state         VARCHAR(64),
     context       JSONB        NOT NULL DEFAULT '{}'::jsonb,
     last_intent   VARCHAR(64),
     message_count INTEGER      NOT NULL DEFAULT 0,
     created_at    TIMESTAMP    NOT NULL DEFAULT now(),
     updated_at    TIMESTAMP    NOT NULL DEFAULT now(),
     expires_at    TIMESTAMP    NOT NULL DEFAULT (now() + INTERVAL '24 hours')
   )`,
  `CREATE INDEX IF NOT EXISTS idx_wa_sessions_expires_at ON wa_sessions (expires_at)`,
];

let ensurePromise = null;

/**
 * Ensure the wa_sessions table exists. Idempotent and cheap: the CREATE ...
 * IF NOT EXISTS statements are no-ops once the table is there, and the work is
 * done at most once per process (the resolved promise is cached). On failure
 * the cache is cleared so a later call can retry.
 *
 * @param {import('pg').Pool} pool
 * @returns {Promise<void>}
 */
export function ensureSessionsTable(pool) {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    for (const stmt of WA_SESSIONS_DDL) {
      await pool.query(stmt);
    }
    console.log("🗂️  wa_sessions table ready");
  })().catch((err) => {
    ensurePromise = null; // allow retry on the next call
    throw err;
  });

  return ensurePromise;
}
