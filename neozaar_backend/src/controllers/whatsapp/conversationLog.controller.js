/**
 * Read API for the WhatsApp conversation log (self-logging — wa_messages /
 * wa_contacts, populated by the bot in Neozaareact/app/allapi/whatsapp).
 *
 * All routes are SUPER_ADMIN only (see routes/whatsapp.routes.js). CRM linkage
 * is a live join on crm_leads.phone_normalized — nothing is denormalised.
 */

const pool = require('../../config/database');
const { auditLog } = require('../crm/audit.helper');

const digits = (v) => String(v || '').replace(/[^0-9]/g, '');

/** GET /contacts?q=&page=&limit=&opted_out= — the "who has messaged us" list. */
exports.listContacts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const offset = (page - 1) * limit;
    const q = req.query.q ? `%${String(req.query.q).trim()}%` : null;
    const optedOut =
      req.query.opted_out === 'true' ? true : req.query.opted_out === 'false' ? false : null;

    const where = [];
    const params = [];
    if (q) {
      params.push(q);
      where.push(`(c.phone ILIKE $${params.length} OR c.profile_name ILIKE $${params.length})`);
    }
    if (optedOut !== null) {
      params.push(optedOut);
      where.push(`c.opted_out = $${params.length}`);
    }
    if (['HUMAN', 'BOT'].includes(req.query.mode)) {
      params.push(req.query.mode);
      where.push(`c.conversation_mode = $${params.length}`);
    }
    if (req.query.unread === 'true') where.push('c.unread = true');
    if (req.query.leads === 'true') where.push(`EXISTS (SELECT 1 FROM crm_leads lead
      WHERE lead.phone_normalized = regexp_replace(c.phone, '[^0-9]', '', 'g') AND lead.is_deleted = false)`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows: countRows } = await pool.query(
      `SELECT count(*)::int AS total FROM wa_contacts c ${whereSql}`,
      params
    );

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT
         c.phone, c.profile_name, c.first_seen, c.last_seen, c.last_inbound_at,
         c.message_count, c.last_state, c.last_intent, c.opted_out,
         c.conversation_mode, c.unread, c.assigned_agent_id, c.assigned_agent_name,
         l.id AS lead_id, l.name AS lead_name, l.stage AS lead_stage,
         (SELECT m.body FROM wa_messages m
            WHERE m.phone = c.phone ORDER BY m.created_at DESC LIMIT 1) AS last_message
       FROM wa_contacts c
       LEFT JOIN crm_leads l
         ON l.phone_normalized = regexp_replace(c.phone, '[^0-9]', '', 'g')
        AND l.is_deleted = false
       ${whereSql}
       ORDER BY c.last_seen DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      status: 'success',
      data: rows,
      pagination: { page, limit, total: countRows[0].total, pages: Math.ceil(countRows[0].total / limit) },
    });
  } catch (e) {
    console.error('listContacts error:', e.message);
    res.status(500).json({ status: 'fail', message: 'Failed to load contacts' });
  }
};

/** GET /conversations/:phone?before=&limit= — one thread, newest-first page. */
exports.getConversation = async (req, res) => {
  try {
    const phone = digits(req.params.phone);
    if (!phone) return res.status(400).json({ status: 'fail', message: 'phone required' });

    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const before = req.query.before ? parseInt(req.query.before, 10) : null;

    const { rows: header } = await pool.query(
      `SELECT c.*, l.id AS lead_id, l.name AS lead_name, l.stage AS lead_stage,
         EXISTS (SELECT 1 FROM wa_messages m WHERE m.phone = c.phone AND m.direction = 'in'
           AND COALESCE(m.meta_ts, m.created_at) > now() - interval '24 hours'
           AND COALESCE(m.meta_ts, m.created_at) <= now()) AS window_active
         FROM wa_contacts c
         LEFT JOIN crm_leads l
           ON l.phone_normalized = regexp_replace(c.phone, '[^0-9]', '', 'g')
          AND l.is_deleted = false
        WHERE c.phone = $1`,
      [phone]
    );

    const params = [phone];
    let cursor = '';
    if (before) {
      params.push(before);
      cursor = `AND id < $${params.length}`;
    }
    params.push(limit);
    const { rows } = await pool.query(
      `SELECT id, direction, wamid, msg_type, body, choice_id, choice_title,
              state, profile_name, meta_ts, status, error, created_at, sender_type, agent_id, agent_name
         FROM wa_messages
        WHERE phone = $1 ${cursor}
        ORDER BY id DESC
        LIMIT $${params.length}`,
      params
    );

    res.json({
      status: 'success',
      contact: header[0] || { phone },
      messages: rows.reverse(), // ascending for display
      has_more: rows.length === limit,
      next_before: rows.length ? rows[0].id : null,
    });
  } catch (e) {
    console.error('getConversation error:', e.message);
    res.status(500).json({ status: 'fail', message: 'Failed to load conversation' });
  }
};

/** GET /conversations/:phone/export?format=csv|json — full thread. */
exports.exportConversation = async (req, res) => {
  try {
    const phone = digits(req.params.phone);
    if (!phone) return res.status(400).json({ status: 'fail', message: 'phone required' });
    const format = req.query.format === 'json' ? 'json' : 'csv';

    const { rows } = await pool.query(
      `SELECT created_at, direction, msg_type, body
         FROM wa_messages WHERE phone = $1 ORDER BY id ASC`,
      [phone]
    );

    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="wa_${phone}.json"`);
      return res.json({ phone, messages: rows });
    }

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      'created_at,direction,type,body',
      ...rows.map((r) => [r.created_at.toISOString(), r.direction, r.msg_type, esc(r.body)].join(',')),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="wa_${phone}.csv"`);
    res.send(csv);
  } catch (e) {
    console.error('exportConversation error:', e.message);
    res.status(500).json({ status: 'fail', message: 'Failed to export' });
  }
};

/** DELETE /conversations/:phone?contact=true — purge a thread (deletion request). */
exports.deleteConversation = async (req, res) => {
  try {
    const phone = digits(req.params.phone);
    if (!phone) return res.status(400).json({ status: 'fail', message: 'phone required' });
    const alsoContact = req.query.contact === 'true';
    const reason = (req.body && req.body.reason) || req.query.reason || null;

    const { rowCount: messagesDeleted } = await pool.query(
      `DELETE FROM wa_messages WHERE phone = $1`,
      [phone]
    );
    let contactDeleted = 0;
    if (alsoContact) {
      ({ rowCount: contactDeleted } = await pool.query(
        `DELETE FROM wa_contacts WHERE phone = $1`,
        [phone]
      ));
    }

    await auditLog(
      req.user?.id,
      'DELETE_WA_CONVERSATION',
      'wa_conversation',
      null,
      null,
      { phone, messages_deleted: messagesDeleted, contact_deleted: contactDeleted, reason },
      req
    );

    res.json({ status: 'success', messages_deleted: messagesDeleted, contact_deleted: contactDeleted });
  } catch (e) {
    console.error('deleteConversation error:', e.message);
    res.status(500).json({ status: 'fail', message: 'Failed to delete conversation' });
  }
};

/** GET /stats — headline counts for the dashboard. */
exports.stats = async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT count(*)::int FROM wa_contacts) AS contacts,
        (SELECT count(*)::int FROM wa_contacts WHERE first_seen > now() - interval '7 days') AS new_7d,
        (SELECT count(*)::int FROM wa_contacts WHERE opted_out) AS opted_out,
        (SELECT count(*)::int FROM wa_contacts WHERE unread) AS unread,
        (SELECT count(*)::int FROM wa_messages WHERE direction = 'in')  AS msgs_in,
        (SELECT count(*)::int FROM wa_messages WHERE direction = 'out') AS msgs_out
    `);
    res.json({ status: 'success', data: rows[0] });
  } catch (e) {
    console.error('wa stats error:', e.message);
    res.status(500).json({ status: 'fail', message: 'Failed to load stats' });
  }
};
