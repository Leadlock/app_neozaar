import getPool, { conversationConnection } from "./db.js";
import { ensureConversationTables } from "./conversationSchema.js";

// Cross-process lock shared by bot turns and agent actions. A takeover waits
// for an already-running turn; once it returns, no bot turn can still send.
export async function withConversationLock(phone, work) {
  const client = await getPool().connect();
  let locked = false;
  let broken;
  try {
    await client.query("SELECT pg_advisory_lock(hashtextextended($1, 739))", [phone]);
    locked = true;
    return await conversationConnection.run(client, () => work(client));
  } finally {
    try {
      if (locked) await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 739))", [phone]);
    } catch (error) { broken = error; }
    client.release(broken);
  }
}

export async function isHumanConversation(phone) {
  const pool = getPool();
  await ensureConversationTables(pool);
  // Fail closed on schema/database failure. Never assume BOT after a failed read.
  const { rows } = await pool.query("SELECT conversation_mode FROM wa_contacts WHERE phone = $1", [phone]);
  return rows[0]?.conversation_mode === "HUMAN";
}

export function humanOptOutChange(msg, optOutWords, optInWords) {
  // Reuse the frozen router's vocabulary. The inbound log applies this only
  // for HUMAN contacts, atomically with the message and unread rollup.
  if (msg.choiceId) return null;
  const word = (msg.text || "").trim().toLowerCase();
  if (optOutWords.includes(word)) return true;
  if (optInWords.includes(word)) return false;
  return null;
}
