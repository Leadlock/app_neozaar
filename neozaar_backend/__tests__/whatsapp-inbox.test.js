const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

function load(relative, replacements) {
  const file = path.resolve(__dirname, '..', relative);
  const module = { exports: {} };
  const original = createRequire(file);
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    module, exports: module.exports, process, URL, console,
    require: name => replacements[name] || original(name),
  }, { filename: file });
  return module.exports;
}

test('all four inbox actions use real existing authentication and CRM role middleware', async () => {
  const previous = process.env.JWT_SECRET;
  const origin = process.env.WHATSAPP_APP_ORIGIN;
  process.env.JWT_SECRET = 'isolated-test-secret';
  process.env.WHATSAPP_APP_ORIGIN = 'https://whatsapp.test';
  const calls = [];
  const inbox = load('src/controllers/whatsapp/agentInbox.controller.js', {
    axios: { post: async (...args) => { calls.push(args); return { status: 200, data: { status: 'success' } }; } },
  });
  const noop = (_req, res) => res.json({});
  const router = load('src/routes/whatsapp.routes.js', {
    '../controllers/whatsapp/agentInbox.controller': inbox,
    '../controllers/whatsapp/conversationLog.controller': { stats: noop, listContacts: noop, getConversation: noop, exportConversation: noop, deleteConversation: noop },
  });
  const app = express(); app.use(express.json()); app.use('/api/internal/whatsapp', router);
  const token = role_type => jwt.sign({ id: 42, name: 'Agent', role_type }, process.env.JWT_SECRET);
  try {
    for (const action of ['takeover', 'release', 'messages', 'read']) {
      const endpoint = `/api/internal/whatsapp/conversations/919999000001/${action}`;
      await request(app).post(endpoint).send({}).expect(401);
      await request(app).post(endpoint).set('Authorization', 'Bearer forged').send({}).expect(400);
      for (const role of ['ADMIN', 'AGENT', 'A_MANAGER', 'CUSTOMER']) {
        await request(app).post(endpoint).set('Authorization', `Bearer ${token(role)}`).send({}).expect(403);
      }
      await request(app).post(endpoint).set('Authorization', `Bearer ${token('SUPER_ADMIN')}`).send({}).expect(200);
      assert.equal(calls.at(-1)[0], `https://whatsapp.test/allapi/whatsapp/internal/conversations/919999000001/${action}`);
      assert.equal(calls.at(-1)[2].maxRedirects, 0);
      assert.match(calls.at(-1)[2].headers.Authorization, /^Bearer /);
    }
    assert.equal(calls.length, 4);
    await request(app).post('/api/internal/whatsapp/conversations/bad/messages')
      .set('Authorization', `Bearer ${token('SUPER_ADMIN')}`).send({}).expect(400);
    delete process.env.WHATSAPP_APP_ORIGIN;
    await request(app).post('/api/internal/whatsapp/conversations/919999000001/takeover')
      .set('Authorization', `Bearer ${token('SUPER_ADMIN')}`).send({}).expect(503);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous;
    if (origin === undefined) delete process.env.WHATSAPP_APP_ORIGIN; else process.env.WHATSAPP_APP_ORIGIN = origin;
  }
});

test('existing list filters remain parameterized and new filters apply before pagination', async () => {
  const calls = [];
  const ctrl = load('src/controllers/whatsapp/conversationLog.controller.js', {
    '../../config/database': { query: async (sql, params) => { calls.push({ sql, params }); return { rows: sql.includes('count(*)') ? [{ total: 0 }] : [] }; } },
    '../crm/audit.helper': { auditLog: async () => {} },
  });
  const res = { json() {}, status() { return this; } };
  await ctrl.listContacts({ query: { q: "quote'", mode: 'HUMAN', unread: 'true', leads: 'true', opted_out: 'false', page: 2 } }, res);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.match(call.sql, /c\.conversation_mode = \$3/);
    assert.match(call.sql, /c\.unread = true/);
    assert.match(call.sql, /EXISTS \(SELECT 1 FROM crm_leads/);
    assert.ok(!call.sql.includes("quote'"));
  }
});
