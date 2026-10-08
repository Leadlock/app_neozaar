// Exercise the actual application mount order and both affiliate routers.
// Unrelated routes, database access, and attribution writes are stubbed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const express = require('express');
const request = require('supertest');

function application() {
  const db = { connect: async () => ({ release() {} }), query: async () => { throw new Error('Unexpected database access'); } };
  const attribution = {
    resolveLinkFromSlug: async slug => slug === 'valid-link' ? {
      id: 1, affiliate_id: 2, slug, destination_path: '/product/example', ref_code: 'affiliate-example'
    } : null,
    recordLinkClick: async () => 'a'.repeat(64),
    resolveAffiliateFromToken: async token => token === 'a'.repeat(64) ? { affiliateId: 2 } : null,
  };
  function load(relative) {
    const file = path.resolve(__dirname, '..', relative);
    const module = { exports: {} };
    const realRequire = createRequire(file);
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
      module, exports: module.exports, __dirname: path.dirname(file), Buffer, URLSearchParams,
      process: { env: { JWT_SECRET: 'routing-test' }, uptime: () => 0, exit: () => assert.fail('Unexpected process exit') },
      console: { log() {}, error() {}, warn() {} },
      require(name) {
        if (name.endsWith('/config/database')) return db;
        if (name.endsWith('/affiliate.attribution.service')) return attribution;
        if (name.endsWith('/affiliate.public.routes') || name.endsWith('/affiliate.routes')) {
          return load(path.relative(path.resolve(__dirname, '..'), realRequire.resolve(name)));
        }
        if (name.includes('/controllers/')) return new Proxy({}, { get: () => (_req, res) => res.json({ status: 'success' }) });
        if (name.includes('/routes/')) return express.Router();
        if (name.endsWith('/context.middleware')) return (_req, _res, next) => next();
        if (name === 'dotenv') return { config() {} };
        return realRequire(name);
      },
    }, { filename: file });
    return module.exports;
  }
  return load('src/app.js');
}

test('anonymous affiliate clicks reach the public router before JWT validation', async () => {
  const res = await request(application()).get('/api/affiliate/track/valid-link').expect(200);
  assert.match(res.body.data.redirect_url, /^\/product\/example\?/);
  assert.equal(res.body.data.aff_token, 'a'.repeat(64));
});

test('anonymous token checks and invalid-link responses reach public handlers', async () => {
  const app = application();
  const res = await request(app).get('/api/affiliate/token-status').query({ token: 'a'.repeat(64) }).expect(200);
  assert.equal(res.body.valid, true);
  await request(app).get('/api/affiliate/track/missing-link').expect(404);
});

test('moving public routes first does not expose private affiliate APIs', async () => {
  const app = application();
  for (const endpoint of ['customers', 'registrations', 'campaigns', 'database', 'dashboard', 'affiliates']) {
    await request(app).get('/api/affiliate/' + endpoint).expect(401);
  }
  await request(app).post('/api/affiliate/database/contacts').send({ name: 'Unauthorized' }).expect(401);
});
