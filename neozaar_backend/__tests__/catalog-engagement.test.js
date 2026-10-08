const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const request = require('supertest');

test('authenticated catalog scroll is logged and scores the existing CRM customer once', async () => {
  const updates = [];
  const queries = [];
  const pool = { query: async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('SELECT id FROM user_activity_logs')) return { rows: [] };
    if (sql.includes('SELECT id FROM crm_leads')) return { rows: [{ id: 44 }] };
    return { rows: [] };
  } };
  const file = path.resolve(__dirname, '../src/routes/track.js');
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    module, exports: module.exports, console: { log() {}, error() {} },
    require(name) {
      if (name === 'express') return express;
      if (name.endsWith('/config/database')) return pool;
      if (name.endsWith('/middlewares/auth')) return (req, _res, next) => { req.user = { id: 100 }; next(); };
      if (name.endsWith('/middlewares/consent')) return (_req, _res, next) => next();
      if (name.endsWith('/services/LeadSyncService')) return () => {};
      if (name.endsWith('/models/User')) return { findByPk: async () => ({ email: 'customer@example.test' }) };
      if (name.endsWith('/controllers/crm/lifecycle.engine')) return {
        updateCustomerScore: async (...args) => updates.push(args),
      };
      return require(name);
    },
  }, { filename: file });
  const app = express();
  app.use(express.json());
  app.use('/api/track', module.exports);
  await request(app).post('/api/track').send({
    eventType: 'CATALOG_SCROLL', entityType: 'solution', entityId: 9,
    pageUrl: '/solution/example', idempotency_key: 'catalog-scroll-50:100:solution:9:2026-09-02',
  }).expect(200);
  assert.ok(queries.some(q => q.sql.includes('INSERT INTO user_activity_logs')));
  assert.deepEqual(updates[0], [44, 'catalog_engagement', 2, 100]);
});

