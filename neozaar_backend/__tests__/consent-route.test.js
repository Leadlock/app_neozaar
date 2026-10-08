const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const request = require('supertest');

function consentApp(query) {
  const file = path.resolve(__dirname, '../src/routes/consent.js');
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    module, exports: module.exports,
    require(name) {
      if (name === 'express') return express;
      if (name.endsWith('/config/database')) return { query };
      if (name.endsWith('/middlewares/auth')) {
        return (req, res, next) => {
          if (req.header('Authorization') !== 'Bearer valid') return res.status(401).end();
          req.user = { id: 42 };
          next();
        };
      }
      return require(name);
    },
  }, { filename: file });
  const app = express();
  app.use(express.json());
  app.use('/api/consent', module.exports);
  return app;
}

test('analytics consent requires authentication and uses the JWT user', async () => {
  const calls = [];
  const app = consentApp(async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('SELECT consent_given')) return { rows: [] };
    return { rows: [] };
  });
  await request(app).post('/api/consent').send({ consentGiven: true }).expect(401);
  await request(app).post('/api/consent')
    .set('Authorization', 'Bearer valid')
    .send({ userId: 999, consentGiven: true })
    .expect(200);
  const insert = calls.find(call => call.sql.includes('INSERT INTO user_consents'));
  assert.deepEqual(Array.from(insert.params), [42, true]);
});

test('analytics consent validates boolean values and avoids duplicate rows', async () => {
  let inserts = 0;
  const app = consentApp(async sql => {
    if (sql.includes('SELECT consent_given')) return { rows: [{ consent_given: true }] };
    if (sql.includes('INSERT INTO user_consents')) inserts += 1;
    return { rows: [] };
  });
  await request(app).post('/api/consent').set('Authorization', 'Bearer valid')
    .send({ consentGiven: 'true' }).expect(400);
  await request(app).post('/api/consent').set('Authorization', 'Bearer valid')
    .send({ consentGiven: true }).expect(200);
  assert.equal(inserts, 0);
});
