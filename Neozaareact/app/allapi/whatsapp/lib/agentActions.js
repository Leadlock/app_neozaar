import { withConversationLock } from "./conversationControl.js";
import { sendWhatsAppMessage, markAsRead } from "./whatsappService.js";

export class AgentError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function validateAgentRequest(phone, action, body, agent) {
  if (!agent || agent.role_type !== 'SUPER_ADMIN' || !/^\d+$/.test(String(agent.id)))
    throw new AgentError(403, 'SUPER_ADMIN access required');
  if (!/^\+?[1-9]\d{6,14}$/.test(phone)) throw new AgentError(400, 'Invalid phone');
  if (!['takeover', 'release', 'messages', 'read'].includes(action)) throw new AgentError(404, 'Unknown action');
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AgentError(400, 'JSON object required');
  const allowed = action === 'messages' ? ['message'] : action === 'read' ? ['through_id'] : [];
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new AgentError(400, 'Unexpected request field');
  if (action === 'messages' && (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 4096))
    throw new AgentError(400, 'Message must contain 1–4096 characters');
  if (action === 'read' && !/^[1-9]\d*$/.test(String(body.through_id || '')))
    throw new AgentError(400, 'through_id must identify a displayed inbound message');
  return phone.replace(/^\+/, '');
}

export function assertSendAllowed(contact) {
  if (contact.conversation_mode !== 'HUMAN') throw new AgentError(409, 'Take over this conversation before sending');
  if (contact.opted_out) throw new AgentError(409, 'Customer has opted out; sending is blocked');
  if (!contact.window_active) throw new AgentError(409, 'Customer-service window expired. An approved WhatsApp template may be required');
}

async function audit(client, agent, action, phone, details = {}) {
  // Same audit table/shape as the Express helper, but errors must propagate for
  // human actions. Message bodies and tokens are deliberately excluded.
  await client.query(
    `INSERT INTO crm_audit_logs (user_id, action, entity_type, entity_id, new_values)
     VALUES ($1,$2,'wa_conversation',NULL,$3::jsonb)`,
    [agent.id, action, JSON.stringify({ phone, ...details })]
  );
}

export async function performAgentAction(phone, action, body, user) {
  phone = validateAgentRequest(phone, action, body, user);
  const agent = { id: user.id, name: String(user.name || `Agent ${user.id}`).slice(0, 255) };
  return withConversationLock(phone, async client => {
    const { rows } = await client.query(
      `SELECT c.*, EXISTS (SELECT 1 FROM wa_messages m WHERE m.phone = c.phone AND m.direction = 'in'
         AND COALESCE(m.meta_ts, m.created_at) > now() - interval '24 hours'
         AND COALESCE(m.meta_ts, m.created_at) <= now()) AS window_active
       FROM wa_contacts c WHERE c.phone = $1`, [phone]);
    const contact = rows[0];
    if (!contact) throw new AgentError(404, 'Conversation not found');

    if (action === 'messages') {
      assertSendAllowed(contact);
      // Persist intent before touching Meta. A failed audit prevents a send.
      await audit(client, agent, 'WHATSAPP_AGENT_MESSAGE', phone, { outcome: 'attempt' });
      let result;
      try {
        result = await sendWhatsAppMessage(phone, body.message.trim(), { agent });
      } catch (error) {
        await audit(client, agent, 'WHATSAPP_AGENT_MESSAGE', phone, { outcome: 'failed_or_unknown' });
        throw new AgentError(502, 'WhatsApp send failed or delivery is uncertain. Refresh the transcript before retrying');
      }
      const wamid = result?.messages?.[0]?.id || null;
      try {
        await audit(client, agent, 'WHATSAPP_AGENT_MESSAGE', phone, { outcome: 'accepted', wamid });
      } catch (error) {
        // Meta already accepted: never invite an automatic retry on an audit failure.
        return { phone, wamid, warning: 'Message accepted; completion audit failed. The attempt remains audited' };
      }
      return { phone, wamid, ...(result.loggingWarning ? { warning: result.loggingWarning } : {}) };
    }

    await client.query('BEGIN');
    try {
      let updated;
      if (action === 'read') {
        const { rows: viewed } = await client.query(
          "SELECT wamid FROM wa_messages WHERE phone = $1 AND id = $2 AND direction = 'in'", [phone, body.through_id]);
        if (!viewed.length) throw new AgentError(400, 'Read watermark does not belong to this conversation');
        updated = await client.query(
          `UPDATE wa_contacts SET unread = unread AND EXISTS (SELECT 1 FROM wa_messages
             WHERE phone = $1 AND direction = 'in' AND id > $2), updated_at = now()
           WHERE phone = $1 RETURNING *`, [phone, body.through_id]);
        await audit(client, agent, 'WHATSAPP_AGENT_READ', phone, { through_id: body.through_id });
        await client.query('COMMIT');
        await markAsRead(viewed[0].wamid);
      } else {
        const mode = action === 'takeover' ? 'HUMAN' : 'BOT';
        updated = await client.query(
          `UPDATE wa_contacts SET conversation_mode = $2, assigned_agent_id = $3,
             assigned_agent_name = $4, updated_at = now() WHERE phone = $1 RETURNING *`,
          [phone, mode, mode === 'HUMAN' ? agent.id : null, mode === 'HUMAN' ? agent.name : null]);
        await audit(client, agent, action === 'takeover' ? 'WHATSAPP_HUMAN_TAKEOVER' : 'WHATSAPP_HUMAN_RELEASE', phone);
        await client.query('COMMIT');
      }
      return { ...updated.rows[0], window_active: contact.window_active };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}
