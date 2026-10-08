import getPool from "./db.js";
import { ensureConversationTables } from "./conversationSchema.js";

/**
 * Self-logging for the WhatsApp bot — writes every message (in and out) to
 * wa_messages and keeps the wa_contacts rollup. Every function here is
 * best-effort: it catches its own errors and never throws, so a logging
 * failure can't break a customer reply.
 *
 * See neozaar_backend/src/migrations/035_wa_conversation_log.sql.
 */

const BODY_MAX = 8000;

const clip = (s, n = BODY_MAX) => {
  const str = String(s ?? "");
  return str.length > n ? str.slice(0, n) : str;
};

/**
 * Render a readable one-line body + type for an outbound payload (the object
 * passed to whatsappService.sendPayload).
 * @returns {{ msg_type: string, body: string }}
 */
export function describeOutbound(payload = {}) {
  if (payload.type === "text") {
    return { msg_type: "text", body: payload.text?.body || "" };
  }
  const it = payload.interactive || {};
  const body = it.body?.text || "";
  if (it.type === "button") {
    const opts = (it.action?.buttons || []).map((b) => b.reply?.title).filter(Boolean);
    return { msg_type: "buttons", body: opts.length ? `${body}\n[${opts.join(" | ")}]` : body };
  }
  if (it.type === "list") {
    const rows = (it.action?.sections || [])
      .flatMap((s) => (s.rows || []).map((r) => r.title))
      .filter(Boolean);
    return { msg_type: "list", body: rows.length ? `${body}\n(list: ${rows.join(" | ")})` : body };
  }
  if (it.type === "cta_url") {
    const url = it.action?.parameters?.url;
    return { msg_type: "cta_url", body: url ? `${body}\n→ ${url}` : body };
  }
  return { msg_type: payload.type || "unknown", body };
}

/**
 * Log an inbound message and roll up wa_contacts.
 * @param {object} inbound  parseInbound() result
 * @param {{arrivalState?: string|null, state?: string|null, lastIntent?: string|null}} [ctx]
 *   arrivalState → stored on the message row (the state the message arrived into);
 *   state/lastIntent → stored on the contact rollup (current, post-routing).
 */
export async function logInbound(inbound, ctx = {}) {
  try {
    const pool = getPool();
    await ensureConversationTables(pool);

    const metaTs = inbound.timestamp ? new Date(Number(inbound.timestamp) * 1000) : null;

    const inserted = await pool.query(
      `WITH inserted AS (INSERT INTO wa_messages
         (phone, direction, wamid, msg_type, body, choice_id, choice_title, state, profile_name, meta_ts)
       VALUES ($1,'in',$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (wamid) WHERE direction = 'in' AND wamid IS NOT NULL DO NOTHING
       RETURNING phone)
       INSERT INTO wa_contacts
         (phone, profile_name, first_seen, last_seen, last_inbound_at, message_count, last_state, last_intent, updated_at)
       SELECT phone, $8, now(), now(), now(), 1, $10, $11, now() FROM inserted
       ON CONFLICT (phone) DO UPDATE SET
         profile_name = COALESCE(EXCLUDED.profile_name, wa_contacts.profile_name),
         last_seen = now(), last_inbound_at = now(),
         message_count = wa_contacts.message_count + 1,
         unread = wa_contacts.unread OR wa_contacts.conversation_mode = 'HUMAN',
         opted_out = CASE WHEN wa_contacts.conversation_mode = 'HUMAN'
           THEN COALESCE($12::boolean, wa_contacts.opted_out) ELSE wa_contacts.opted_out END,
         last_state = EXCLUDED.last_state,
         last_intent = COALESCE(EXCLUDED.last_intent, wa_contacts.last_intent), updated_at = now()`,
      [
        inbound.from,
        inbound.messageId || null,
        (inbound.type || "text").slice(0, 24),
        clip(inbound.text || ""),
        inbound.choiceId || null,
        inbound.choiceTitle || null,
        ctx.arrivalState || null,
        inbound.profileName || null,
        metaTs,
        ctx.state || null,
        ctx.lastIntent || null,
        ctx.humanOptOut ?? null,
      ]
    );

    return inserted.rowCount > 0;
  } catch (err) {
    console.warn("wa log inbound failed:", err.message);
  }
}

/**
 * Log an outbound message.
 * @param {{to: string, payload: object, wamid?: string, error?: string}} args
 */
export async function logOutbound({ to, payload, wamid, error, agent }) {
  try {
    const pool = getPool();
    await ensureConversationTables(pool);

    const { msg_type, body } = describeOutbound(payload);

    if (agent) {
      await pool.query(
        `INSERT INTO wa_messages (phone, direction, wamid, msg_type, body, error, sender_type, agent_id, agent_name)
         VALUES ($1,'out',$2,$3,$4,$5,'agent',$6,$7)`,
        [to, wamid || null, msg_type, clip(body), error || null, agent.id, agent.name]
      );
    } else await pool.query(
      `INSERT INTO wa_messages (phone, direction, wamid, msg_type, body, error)
       VALUES ($1,'out',$2,$3,$4,$5)`,
      [to, wamid || null, msg_type, clip(body), error || null]
    );

    await pool.query(
      `INSERT INTO wa_contacts (phone, first_seen, last_seen, last_outbound_at, updated_at)
       VALUES ($1, now(), now(), now(), now())
       ON CONFLICT (phone) DO UPDATE SET last_outbound_at = now(), updated_at = now()`,
      [to]
    );
    return true;
  } catch (err) {
    console.warn("wa log outbound failed:", err.message);
    return false;
  }
}

/** True if this number has opted out. Fails open (returns false) on any error. */
export async function isOptedOut(phone) {
  try {
    const pool = getPool();
    await ensureConversationTables(pool);
    const { rows } = await pool.query(`SELECT opted_out FROM wa_contacts WHERE phone = $1`, [phone]);
    return rows[0]?.opted_out === true;
  } catch (err) {
    console.warn("wa isOptedOut failed:", err.message);
    return false;
  }
}

/** Set (or clear) the opt-out flag for a number. */
export async function setOptOut(phone, value) {
  try {
    const pool = getPool();
    await ensureConversationTables(pool);
    await pool.query(
      `INSERT INTO wa_contacts (phone, first_seen, last_seen, opted_out, updated_at)
       VALUES ($1, now(), now(), $2, now())
       ON CONFLICT (phone) DO UPDATE SET opted_out = $2, updated_at = now()`,
      [phone, Boolean(value)]
    );
  } catch (err) {
    console.warn("wa setOptOut failed:", err.message);
  }
}
