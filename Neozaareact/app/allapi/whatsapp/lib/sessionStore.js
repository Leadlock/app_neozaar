import getPool from "./db.js";
import { ensureSessionsTable } from "./sessionSchema.js";

/**
 * Persistence layer for the WhatsApp bot's conversation state, backed by the
 * wa_sessions table (migration 030). The router treats a session as a plain
 * mutable object for the duration of a turn, then calls saveSession() once.
 *
 *   const session = await getSession(from);
 *   session.messageCount += 1;
 *   // ...router mutates session.state / session.context...
 *   await saveSession(session);
 *
 * A row past its expires_at (updated_at + 24h) is treated as absent, so a
 * customer returning after a day starts a fresh journey.
 *
 * @typedef {Object} Session
 * @property {string}  phone         E.164 digits, no '+'
 * @property {string|null} state     router position, e.g. 'main_menu'
 * @property {Object}  context       accumulated journey data; always has a
 *                                   `history` array
 * @property {string|null} lastIntent  last detected direct intent
 * @property {number}  messageCount  inbound messages handled in this session
 * @property {boolean} isNew         true when no live row existed (fresh start)
 */

/** Max turns kept in context.history — enough for the expert-handoff summary. */
export const HISTORY_LIMIT = 40;

/** ~1 read in 50 also sweeps expired rows, so no cron is required. */
const SWEEP_PROBABILITY = 0.02;

/** Shared TTL clause so getSession / saveSession stay in lockstep. */
const TTL = "now() + INTERVAL '24 hours'";

function newSession(phone) {
  return {
    phone,
    state: null,
    context: { history: [] },
    lastIntent: null,
    messageCount: 0,
    isNew: true,
  };
}

function normaliseContext(context) {
  const ctx = context && typeof context === "object" && !Array.isArray(context) ? context : {};
  if (!Array.isArray(ctx.history)) ctx.history = [];
  return ctx;
}

/**
 * Load the live session for a phone number, or a fresh one if none exists or
 * the previous session has expired. Always resolves to a Session object.
 * @param {string} phone
 * @returns {Promise<Session>}
 */
export async function getSession(phone) {
  const pool = getPool();
  await ensureSessionsTable(pool);

  const { rows } = await pool.query(
    `SELECT state, context, last_intent, message_count
       FROM wa_sessions
      WHERE phone = $1 AND expires_at > now()`,
    [phone]
  );

  if (SWEEP_PROBABILITY && Math.random() < SWEEP_PROBABILITY) {
    sweepExpiredSessions().catch((e) => console.warn("session sweep failed:", e.message));
  }

  if (!rows.length) return newSession(phone);

  const row = rows[0];
  return {
    phone,
    state: row.state || null,
    context: normaliseContext(row.context),
    lastIntent: row.last_intent || null,
    messageCount: row.message_count || 0,
    isNew: false,
  };
}

/**
 * Upsert the session. Refreshes updated_at / expires_at every call, so any
 * activity keeps the journey alive for another 24h. Trims context.history to
 * HISTORY_LIMIT before writing.
 * @param {Session} session
 * @returns {Promise<void>}
 */
export async function saveSession(session) {
  if (!session || !session.phone) {
    throw new Error("saveSession: session.phone is required");
  }

  const pool = getPool();
  await ensureSessionsTable(pool);

  const context = normaliseContext(session.context);
  if (context.history.length > HISTORY_LIMIT) {
    context.history = context.history.slice(-HISTORY_LIMIT);
  }

  await pool.query(
    `INSERT INTO wa_sessions
        (phone, state, context, last_intent, message_count, created_at, updated_at, expires_at)
     VALUES ($1, $2, $3::jsonb, $4, $5, now(), now(), ${TTL})
     ON CONFLICT (phone) DO UPDATE SET
        state         = EXCLUDED.state,
        context       = EXCLUDED.context,
        last_intent   = EXCLUDED.last_intent,
        message_count = EXCLUDED.message_count,
        updated_at    = now(),
        expires_at    = ${TTL}`,
    [
      session.phone,
      session.state || null,
      JSON.stringify(context),
      session.lastIntent || null,
      Number.isFinite(session.messageCount) ? session.messageCount : 0,
    ]
  );
}

/**
 * Delete the session outright — used for `reset`/`start` and once a commercial
 * request has been submitted (the next message begins a new journey).
 * @param {string} phone
 * @returns {Promise<void>}
 */
export async function clearSession(phone) {
  const pool = getPool();
  await ensureSessionsTable(pool);
  await pool.query(`DELETE FROM wa_sessions WHERE phone = $1`, [phone]);
}

/**
 * Hard-delete every expired row. Called opportunistically from getSession and
 * safe to wire to a cron / maintenance route.
 * @returns {Promise<number>} rows removed
 */
export async function sweepExpiredSessions() {
  const pool = getPool();
  await ensureSessionsTable(pool);
  const { rowCount } = await pool.query(`DELETE FROM wa_sessions WHERE expires_at <= now()`);
  if (rowCount) console.log(`🧹 swept ${rowCount} expired wa_session(s)`);
  return rowCount;
}

/**
 * Append a turn to the running history the expert handoff summarises. Mutates
 * and returns the session; trims to HISTORY_LIMIT. `entry` shape is the
 * router's choice — suggested: { role: 'user' | 'neo', text, at: <iso8601> }.
 * @param {Session} session
 * @param {any} entry
 * @returns {Session}
 */
export function pushHistory(session, entry) {
  session.context = normaliseContext(session.context);
  session.context.history.push(entry);
  if (session.context.history.length > HISTORY_LIMIT) {
    session.context.history = session.context.history.slice(-HISTORY_LIMIT);
  }
  return session;
}
