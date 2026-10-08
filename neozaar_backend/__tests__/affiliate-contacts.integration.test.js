// Temporary tables shadow the configured database tables. No real contacts are written.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const pool = require('../src/config/database');

test('affiliate contact creation and imports against PostgreSQL', async t => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TEMP TABLE users (id integer PRIMARY KEY, is_active boolean DEFAULT true);
      INSERT INTO users VALUES (1,true),(2,true);
      CREATE TEMP TABLE crm_leads (id integer PRIMARY KEY, email_normalized text, is_deleted boolean DEFAULT false);
      INSERT INTO crm_leads VALUES (5,'registered@example.test',false);
      CREATE TEMP TABLE affiliate_contacts (LIKE public.affiliate_contacts INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
      CREATE TEMP SEQUENCE contact_test_id_seq;
      ALTER TABLE affiliate_contacts ALTER COLUMN id SET DEFAULT nextval('contact_test_id_seq');
      ALTER TABLE affiliate_contacts ADD PRIMARY KEY (id);
      ALTER TABLE affiliate_contacts ADD FOREIGN KEY (affiliate_id) REFERENCES users(id);
      ALTER TABLE affiliate_contacts ADD FOREIGN KEY (crm_lead_id) REFERENCES crm_leads(id);
      ALTER TABLE affiliate_contacts ADD FOREIGN KEY (duplicate_of) REFERENCES affiliate_contacts(id);
    `);
    const file = path.resolve(__dirname, '../src/controllers/affiliate/affiliate.database.controller.js');
    const originalRequire = createRequire(file);
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
      module, exports: module.exports, console,
      require(name) {
        if (name === '../../config/database') return { query: (...args) => client.query(...args) };
        if (name === '../../services/affiliate/affiliate.attribution.service') return { affiliateAuditLog() {} };
        return originalRequire(name);
      },
    });
    const controller = module.exports;
    async function call(method, body, id = 1) {
      const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
      await controller[method]({ body, affiliateScopeId: id, user: { id, role_type: 'AGENT' } }, res);
      return res;
    }
    await t.test('three required fields succeed with all optional fields blank', async () => {
      const res = await call('addContact', { name: 'Test contact', email: 'minimal@example.test', phone: '00123456789', company: '', designation: '', country: '' });
      assert.equal(res.code, 201, res.body.message);
      assert.equal(res.body.data.status, 'prospect');
      assert.equal(res.body.data.company, null);
      assert.equal(res.body.data.designation, null);
      assert.equal(res.body.data.country, null);
      assert.equal(res.body.data.phone, '00123456789');
    });
    await t.test('missing or blank required fields are rejected without inserting', async () => {
      const before = await client.query('SELECT COUNT(*)::int AS count FROM affiliate_contacts');
      for (const field of ['name', 'email', 'phone']) {
        for (const value of [undefined, '', '   ', null]) {
          const res = await call('addContact', { name: 'Required', email: 'required@example.test', phone: '+911234567890', [field]: value });
          assert.equal(res.code, 400, field);
        }
      }
      assert.equal((await call('addContact', { name: 'Invalid email', email: 'invalid', phone: '+911234567890' })).code, 400);
      const after = await client.query('SELECT COUNT(*)::int AS count FROM affiliate_contacts');
      assert.equal(after.rows[0].count, before.rows[0].count);
    });
    await t.test('email, phone and company contact succeeds', async () => {
      const res = await call('addContact', { name: 'Full contact', email: 'contact@example.test', phone: '+910000000000', company: 'Test company', designation: 'Contact', country: 'India' });
      assert.equal(res.code, 201, res.body.message);
    });
    await t.test('duplicates stay within the affiliate database', async () => {
      const duplicate = await call('addContact', { name: 'Duplicate', email: ' CONTACT@example.test ', phone: '+911234567890' });
      assert.equal(duplicate.code, 201, duplicate.body.message);
      assert.equal(duplicate.body.data.is_duplicate, true);
      const other = await call('addContact', { name: 'Other affiliate contact', email: 'contact@example.test', phone: '+911234567890' }, 2);
      assert.equal(other.code, 201, other.body.message);
      assert.equal(other.body.data.is_duplicate, false);
    });
    await t.test('existing CRM email links correctly', async () => {
      const res = await call('addContact', { name: 'Registered', email: 'registered@example.test', phone: '+911234567890' });
      assert.equal(res.code, 201, res.body.message);
      assert.equal(res.body.data.crm_lead_id, 5);
    });
    await t.test('bulk import uses the same supported schema', async () => {
      const res = await call('importContacts', { contacts: [{ name: 'Imported', email: 'imported@example.test', phone: '+911234567890' }] });
      assert.equal(res.code, 200, res.body.message);
      assert.equal(res.body.data.errors.length, 0, JSON.stringify(res.body.data.errors));
      assert.equal(res.body.data.imported, 1);
    });
    await t.test('mixed upload imports valid rows and reports each invalid row', async () => {
      const res = await call('importContacts', { contacts: [
        { name: 'Valid upload', email: 'valid-upload@example.test', phone: '00123456789' },
        { email: 'missing-name@example.test', phone: '+911234567890' },
        { name: 'Missing email', phone: '+911234567890' },
        { name: 'Missing phone', email: 'missing-phone@example.test' },
        { name: 'Blank phone', email: 'blank-phone@example.test', phone: '  ' },
        null,
      ] });
      assert.equal(res.code, 200);
      assert.equal(res.body.data.imported, 1);
      assert.equal(res.body.data.errors.length, 5);
      assert.equal(res.body.data.errors[0].row_number, 2);
      assert.equal(res.body.data.errors[4].row_number, 6);
    });
  } finally {
    client.release(true);
    await pool.end();
  }
});
