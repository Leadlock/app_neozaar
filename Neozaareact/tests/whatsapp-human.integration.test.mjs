// Real PostgreSQL, isolated database, mocked ALL HTTP. No application env files.
// Start a disposable cluster at 127.0.0.1:55439, user wa_test, before running.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import pg from 'pg';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import vm from 'node:vm';

test('private sender bridge rejects missing/invalid JWT and unauthorized roles', async () => {
  const { POST } = await import('../app/allapi/whatsapp/internal/conversations/[phone]/[action]/route.js');
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'bridge-test-secret';
  const context = { params: Promise.resolve({ phone: '919999000001', action: 'takeover' }) };
  const call = token => POST(new Request('https://example.test/internal', { method: 'POST', body: '{}',
    headers: token ? { Authorization: `Bearer ${token}` } : {} }), context);
  try {
    assert.equal((await call()).status, 401);
    assert.equal((await call('bad')).status, 401);
    const token = jwt.sign({ id: 42, role_type: 'ADMIN' }, process.env.JWT_SECRET);
    assert.equal((await call(token)).status, 403);
    const expired = jwt.sign({ id: 42, role_type: 'SUPER_ADMIN' }, process.env.JWT_SECRET, { expiresIn: -1 });
    assert.equal((await call(expired)).status, 401);
    delete process.env.JWT_SECRET; assert.equal((await call()).status, 503);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous;
  }
});

test('Human Mode and frozen bot pipeline with real PostgreSQL', async t => {
  const database = `wa_human_test_${Date.now()}`;
  const admin = new pg.Pool({ host: '127.0.0.1', port: 55439, user: 'wa_test', database: 'postgres' });
  await admin.query(`CREATE DATABASE ${database}`);
  await admin.end();
  Object.assign(process.env, { WA_DB_HOST: '127.0.0.1', WA_DB_PORT: '55439', WA_DB_USER: 'wa_test', WA_DB_NAME: database });
  const sent = [];
  const oldAdapter = axios.defaults.adapter;
  const oldFetch = globalThis.fetch;
  axios.defaults.adapter = async config => {
    const body = JSON.parse(config.data || '{}');
    if (!String(config.url).includes('graph.facebook.com')) throw new Error('Unexpected outbound HTTP');
    if (body.status !== 'read') sent.push(body);
    return { status: 200, data: { messages: [{ id: `wamid.out.${sent.length}` }] }, headers: {}, config };
  };
  globalThis.fetch = async () => { throw new Error('HUMAN mode must never call LLM/CRM/fetch'); };
  const lib = name => import(new URL(`../app/allapi/whatsapp/lib/${name}.js`, import.meta.url));
  const pool = (await lib('db')).default();
  const { ensureConversationTables } = await lib('conversationSchema');
  const { handleMessage } = await lib('botService');
  const { performAgentAction, validateAgentRequest } = await lib('agentActions');
  const { withConversationLock } = await lib('conversationControl');
  const { logInbound } = await lib('messageLog');
  const agent = { id: 42, name: 'Test Agent', role_type: 'SUPER_ADMIN' };
  const phone = '919999000001';
  const contact = async () => (await pool.query('SELECT * FROM wa_contacts WHERE phone=$1', [phone])).rows[0];
  const rows = async () => (await pool.query('SELECT * FROM wa_messages WHERE phone=$1 ORDER BY id', [phone])).rows;
  let sequence = 0;
  const inbound = (text, extra = {}) => ({ from: phone, text, type: 'text', profileName: 'Test Customer',
    messageId: `wamid.test.${++sequence}`, timestamp: String(Math.floor(Date.now() / 1000)), ...extra });
  const feed = async msg => handleMessage(msg.from, msg.text, msg);
  const action = (name, body = {}) => performAgentAction(phone, name, body, agent);
  try {
    await ensureConversationTables(pool);
    await pool.query('INSERT INTO wa_contacts(phone) VALUES ($1)', [phone]);
    await pool.query(`CREATE TABLE crm_audit_logs (id bigserial PRIMARY KEY, user_id bigint, action text,
      entity_type text, entity_id bigint, new_values jsonb, created_at timestamp DEFAULT now())`);
    const migration = await fs.readFile(new URL('../../neozaar_backend/src/migrations/039_wa_human_mode.sql', import.meta.url), 'utf8');
    await t.test('migration preserves existing rows and is idempotent', async () => {
      await pool.query(migration); await pool.query(migration);
      assert.equal((await contact()).conversation_mode, 'BOT');
      assert.equal((await contact()).unread, false);
      await assert.rejects(pool.query("UPDATE wa_contacts SET conversation_mode='INVALID' WHERE phone=$1", [phone]));
    });
    await t.test('BOT menu, reset, opt-out and opt-in still use the existing router', async () => {
      for (const text of ['hi', 'menu', 'reset', 'stop', 'start']) {
        const count = sent.length; await feed(inbound(text)); assert.ok(sent.length > count, text);
      }
      assert.equal((await contact()).opted_out, false);
      assert.ok(sent.some(m => m.type === 'interactive'));
    });
    await t.test('new contacts default BOT and historical outbound metadata stays null', async () => {
      await feed(inbound('hi', { from: '919999000002' }));
      const result = await pool.query('SELECT conversation_mode FROM wa_contacts WHERE phone=$1', ['919999000002']);
      assert.equal(result.rows[0].conversation_mode, 'BOT');
      assert.ok((await rows()).filter(m => m.direction === 'out').every(m => m.sender_type === null));
    });
    await t.test('takeover is persistent and does not send a customer message', async () => {
      const count = sent.length; const state = await action('takeover');
      assert.equal(state.conversation_mode, 'HUMAN'); assert.equal(state.assigned_agent_name, agent.name);
      assert.equal(sent.length, count);
    });
    await t.test('HUMAN inbound logs once, stays unread, skips menus, LLM and CRM even after session expiry', async () => {
      await pool.query("UPDATE wa_sessions SET expires_at=now()-interval '1 day' WHERE phone=$1", [phone]);
      const count = sent.length; const msg = inbound('Get a Commercial Offer');
      await feed(msg); await feed(msg);
      for (const text of ['menu', 'reset', 'Speak to an Expert', 'Find a Product', 'Find a Solution', 'Find a Service', 'Build My Requirement', 'Unusual request for the LLM']) await feed(inbound(text));
      assert.equal(sent.length, count);
      assert.equal((await rows()).filter(m => m.wamid === msg.messageId).length, 1);
      assert.equal((await contact()).conversation_mode, 'HUMAN'); assert.equal((await contact()).unread, true);
    });
    await t.test('HUMAN stop blocks agent send and START restores permission without a bot reply', async () => {
      const count = sent.length;
      await feed(inbound('stop'));
      await assert.rejects(action('messages', { message: 'Blocked' }), /opted out/);
      await feed(inbound('start')); assert.equal(sent.length, count);
    });
    await t.test('agent message uses existing sender and agent-labelled transcript', async () => {
      const result = await action('messages', { message: 'Personal reply' });
      assert.ok(result.wamid);
      const message = (await rows()).at(-1);
      assert.equal(message.sender_type, 'agent'); assert.equal(message.agent_name, 'Test Agent');
      assert.equal(message.body, 'Personal reply');
      assert.equal(sent.at(-1).text.body, 'Personal reply');
      assert.equal(sent.at(-1).agent, undefined);
    });
    await t.test('read watermark does not clear a newer unseen inbound', async () => {
      const first = (await rows()).filter(m => m.direction === 'in').at(-1);
      await feed(inbound('New unseen message'));
      assert.equal((await action('read', { through_id: first.id })).unread, true);
      const latest = (await rows()).filter(m => m.direction === 'in').at(-1);
      assert.equal((await action('read', { through_id: latest.id })).unread, false);
      assert.equal((await action('read', { through_id: first.id })).unread, false);
      await assert.rejects(action('read', { through_id: '999999' }), /watermark/);
    });
    await t.test('expired window cannot be reopened by a delayed webhook timestamp', async () => {
      await pool.query("UPDATE wa_messages SET meta_ts=now()-interval '25 hours' WHERE phone=$1 AND direction='in'", [phone]);
      await feed(inbound('Delayed delivery', { timestamp: String(Math.floor(Date.now()/1000) - 90000) }));
      await assert.rejects(action('messages', { message: 'Blocked' }), /window expired/);
      await feed(inbound('Fresh inbound'));
      assert.ok((await action('messages', { message: 'Allowed again' })).wamid);
    });
    await t.test('release preserves session/history and next customer message routes normally', async () => {
      const before = (await rows()).length;
      assert.equal((await action('release')).conversation_mode, 'BOT');
      assert.equal((await rows()).length, before);
      const count = sent.length; const msg = inbound('menu');
      await feed(msg); assert.ok(sent.length > count);
      const after = sent.length; await feed(msg); assert.equal(sent.length, after);
      await assert.rejects(action('messages', { message: 'Not human' }), /Take over/);
    });
    await t.test('concurrent duplicate callbacks process exactly once', async () => {
      const msg = inbound('menu'); const count = (await contact()).message_count;
      await Promise.all([feed(msg), feed(msg), feed(msg)]);
      assert.equal((await contact()).message_count, count + 1);
    });
    await t.test('takeover waits for in-flight work on the same conversation', async () => {
      let unlock; let acquired;
      const ready = new Promise(resolve => { acquired = resolve; });
      const gate = new Promise(resolve => { unlock = resolve; });
      const turn = withConversationLock(phone, async () => { acquired(); await gate; });
      await ready;
      let complete = false;
      const takeover = action('takeover').then(() => { complete = true; });
      await new Promise(resolve => setTimeout(resolve, 75)); assert.equal(complete, false);
      unlock(); await Promise.all([turn, takeover]); assert.equal(complete, true);
    });
    await t.test('validation rejects forged roles, identity, malformed phone/body and unknown conversations', async () => {
      for (const role_type of ['ADMIN', 'AGENT', 'A_MANAGER', null]) {
        await assert.rejects(performAgentAction(phone, 'takeover', {}, { ...agent, role_type }), /SUPER_ADMIN/);
      }
      for (const message of ['', '   ', 123, 'x'.repeat(4097)]) await assert.rejects(action('messages', { message }), /Message/);
      await assert.rejects(action('messages', { message: 'Hi', agent_id: 99 }), /Unexpected/);
      await assert.rejects(performAgentAction('bad-phone', 'takeover', {}, agent), /phone/);
      await assert.rejects(performAgentAction('919999000099', 'takeover', {}, agent), /not found/);
      assert.equal(validateAgentRequest('+' + phone, 'release', {}, agent), phone);
    });
    await t.test('logging transaction never increments contact counts for duplicate wamid', async () => {
      const msg = inbound('Logged'); const before = (await contact()).message_count;
      assert.equal(await logInbound(msg), true); assert.equal(await logInbound(msg), false);
      assert.equal((await contact()).message_count, before + 1);
    });
    await t.test('audit contains agent/actions and never message contents', async () => {
      const audits = (await pool.query('SELECT * FROM crm_audit_logs')).rows;
      for (const action of ['WHATSAPP_HUMAN_TAKEOVER', 'WHATSAPP_HUMAN_RELEASE', 'WHATSAPP_AGENT_MESSAGE', 'WHATSAPP_AGENT_READ'])
        assert.ok(audits.some(a => a.action === action && String(a.user_id) === '42'));
      assert.ok(!JSON.stringify(audits).includes('Personal reply'));
    });
    await t.test('audit failure rolls back takeover and prevents sending', async () => {
      await action('release');
      await pool.query('ALTER TABLE crm_audit_logs RENAME TO unavailable_audit');
      try { await assert.rejects(action('takeover')); assert.equal((await contact()).conversation_mode, 'BOT'); }
      finally { await pool.query('ALTER TABLE unavailable_audit RENAME TO crm_audit_logs'); }
      await action('takeover');
      await pool.query('ALTER TABLE crm_audit_logs RENAME TO unavailable_audit');
      const count = sent.length;
      try { await assert.rejects(action('messages', { message: 'Must not send' })); assert.equal(sent.length, count); }
      finally { await pool.query('ALTER TABLE unavailable_audit RENAME TO crm_audit_logs'); }
    });
    await t.test('Meta failures are agent-labelled in transcript and return a clear error', async () => {
      const adapter = axios.defaults.adapter;
      axios.defaults.adapter = async () => { throw new Error('Mock Meta outage'); };
      try {
        await assert.rejects(action('messages', { message: 'Failed delivery' }), /delivery is uncertain/);
        const message = (await rows()).at(-1);
        assert.equal(message.sender_type, 'agent'); assert.equal(message.error, 'Mock Meta outage');
      } finally { axios.defaults.adapter = adapter; }
    });
    await t.test('existing log APIs preserve search, pagination, exports, deletion, CRM link and retention', async () => {
      await pool.query(`CREATE TABLE crm_leads (id serial PRIMARY KEY, name text, stage text, phone_normalized text, is_deleted boolean DEFAULT false);
        INSERT INTO crm_leads(name,stage,phone_normalized) VALUES ('Test lead','New Lead','919999000001')`);
      const loadBackend = async relative => {
        const module = { exports: {} };
        const source = await fs.readFile(new URL('../../neozaar_backend/src/' + relative, import.meta.url), 'utf8');
        vm.runInNewContext(source, { module, exports: module.exports, process, console,
          require: name => name.includes('database') ? pool : { auditLog: async () => {} } });
        return module.exports;
      };
      const ctrl = await loadBackend('controllers/whatsapp/conversationLog.controller.js');
      const invoke = async (handler, query = {}, selectedPhone = phone) => {
        const res = { statusCode: 200, status(code) { this.statusCode = code; return this; },
          json(data) { this.data = data; }, send(data) { this.data = data; }, setHeader() {} };
        await handler({ params: { phone: selectedPhone }, query, user: agent }, res);
        assert.equal(res.statusCode, 200); return res.data;
      };
      const list = await invoke(ctrl.listContacts, { q: 'Test Customer', mode: 'HUMAN', leads: 'true', limit: 1 });
      assert.equal(list.data.length, 1); assert.equal(list.data[0].phone, phone); assert.ok(list.data[0].lead_id);
      const transcript = await invoke(ctrl.getConversation, { limit: 3 });
      assert.equal(transcript.messages.length, 3); assert.equal(transcript.has_more, true);
      assert.equal(transcript.contact.window_active, true);
      const older = await invoke(ctrl.getConversation, { before: transcript.next_before, limit: 3 });
      assert.ok(Number(older.messages.at(-1).id) < Number(transcript.messages[0].id));
      assert.ok((await invoke(ctrl.exportConversation, { format: 'json' })).messages.length > 3);
      assert.match(await invoke(ctrl.exportConversation, { format: 'csv' }), /^created_at,direction,type,body/);
      assert.ok((await invoke(ctrl.stats)).data.contacts >= 2);
      await pool.query("INSERT INTO wa_messages(phone,direction,msg_type,body,created_at) VALUES ($1,'in','text','Old message',now()-interval '600 days')", [phone]);
      const retention = await loadBackend('jobs/waMessageRetention.js');
      assert.equal(await retention.sweep(), 1); assert.equal((await contact()).conversation_mode, 'HUMAN');
      const deleted = await invoke(ctrl.deleteConversation, { contact: 'true', reason: 'Isolated test' }, '919999000002');
      assert.ok(deleted.messages_deleted > 0); assert.equal(deleted.contact_deleted, 1);
      assert.equal((await contact()).conversation_mode, 'HUMAN');
    });
  } finally {
    axios.defaults.adapter = oldAdapter; globalThis.fetch = oldFetch; await pool.end();
  }
});
