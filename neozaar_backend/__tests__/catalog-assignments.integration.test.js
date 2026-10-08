// Uses connection-local temporary tables only; never writes application records or sends email.
// Run explicitly: node --test __tests__/catalog-assignments.integration.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const pool = require('../src/config/database');

test('catalog assignments survive replacement and work after affiliate re-registration', async t => {
  const connection = await pool.connect();
  const db = {
    query: (...args) => connection.query(...args),
    connect: async () => ({ query: (...args) => connection.query(...args), release() {} }),
  };
  const mail = { sendSellerAssignmentEmail: async () => {} };
  function load(relative, extra = {}) {
    const file = path.resolve(__dirname, '..', relative);
    const module = { exports: {} };
    const originalRequire = createRequire(file);
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
      module, exports: module.exports, console: { error() {} },
      require: name => {
        if (name === '../config/database') return db;
        if (name === '../config/mail') return mail;
        if (name === '../middlewares/auth') return (_req, _res, next) => next();
        return extra[name] || originalRequire(name);
      },
    }, { filename: file });
    return module.exports;
  }
  const controller = load('src/controllers/seller-assignments.controller.js');
  const router = load('src/routes/seller.routes.js', { '../controllers/seller-assignments.controller': controller });
  const mine = router.stack.find(layer => layer.route?.path === '/my-assignments').route.stack.at(-1).handle;
  async function invoke(handler, body, role = 'A_MANAGER', id = 10) {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ body, user: { id, role_type: role } }, res);
    return res;
  }
  const products = Array.from({ length: 66 }, (_, index) => ({ item_type: 'product', item_id: index + 1 }));
  try {
    // Temporary names shadow the public tables for this connection and disappear on disconnect.
    await connection.query(`
      CREATE TEMP TABLE users (id integer PRIMARY KEY, name text, email text, role_type text, is_active boolean);
      CREATE TEMP TABLE products (id integer PRIMARY KEY, name text, action_type text, product_logo text,
        brand_name text, category text[], is_publish boolean DEFAULT true, deleted_at timestamp);
      CREATE TEMP TABLE categories (id integer PRIMARY KEY, name text);
      CREATE TEMP TABLE seller_assignments (id serial PRIMARY KEY, seller_id integer REFERENCES users(id) ON DELETE CASCADE,
        item_type text, item_id integer, assigned_by integer REFERENCES users(id), allowed_types text[],
        assigned_at timestamp DEFAULT now(), UNIQUE(seller_id,item_type,item_id));
      CREATE TEMP TABLE affiliate_assignments (affiliate_id integer REFERENCES users(id) ON DELETE CASCADE,
        catalog_id integer REFERENCES products(id), is_active boolean DEFAULT true);
      INSERT INTO users VALUES (1,'Old affiliate','affiliate@example.test','AGENT',true),
        (10,'Manager','manager@example.test','A_MANAGER',true), (20,'Other affiliate','other@example.test','AGENT',true);
      INSERT INTO products (id,name,action_type,product_logo,category)
        SELECT n,'Product '||n,'product','logo-'||n||'.png',ARRAY['Test category','Overlapping category'] FROM generate_series(1,66) n;
      INSERT INTO products (id,name,action_type,product_logo,category) VALUES
        (67,'Service','service','service.png',ARRAY['Test category']),
        (68,'Solution','solution','solution.png',ARRAY['Test category']);
      INSERT INTO categories VALUES (1,'Test category'),(2,'Overlapping category');
    `);
    await t.test('all three manager roles can assign 66 items', async () => {
      for (const role of ['A_MANAGER', 'ADMIN', 'SUPER_ADMIN']) {
        const response = await invoke(controller.saveAssignments(true), { seller_id: 1, items: products }, role);
        assert.equal(response.statusCode, 200);
        assert.equal((await connection.query('SELECT COUNT(*)::int AS count FROM seller_assignments WHERE seller_id=1')).rows[0].count, 66);
      }
    });
    await t.test('deleted account cannot receive assignments; new account can', async () => {
      await connection.query("DELETE FROM users WHERE id=1; INSERT INTO users VALUES (2,'Re-registered affiliate','affiliate@example.test','AGENT',true)");
      assert.equal((await invoke(mine, {}, 'AGENT', 1)).statusCode, 401);
      assert.equal((await invoke(controller.saveAssignments(true), { seller_id: 1, items: products })).statusCode, 404);
      const response = await invoke(controller.saveAssignments(true), {
        seller_id: 2, items: [...products, { item_type: 'service', item_id: 67 }, { item_type: 'solution', item_id: 68 }],
      });
      assert.equal(response.statusCode, 200);
      const read = await invoke(mine, {}, 'AGENT', 2);
      assert.equal(read.statusCode, 200);
      assert.equal(read.body.data.length, 68);
      assert.equal(read.body.data.find(item => item.id === 67).item_logo, 'service.png');
      assert.equal((await invoke(mine, {}, 'AGENT', 20)).body.data.length, 0);
    });
    await t.test('bad payloads and failed inserts preserve all existing assignments', async () => {
      const malformed = await invoke(controller.saveAssignments(true), { seller_id: 2 });
      assert.equal(malformed.statusCode, 400);
      const mismatched = await invoke(controller.saveAssignments(true), { seller_id: 2, items: [{ item_type: 'service', item_id: 1 }] });
      assert.equal(mismatched.statusCode, 400);
      // Missing assigning user forces a real FK failure after the DELETE.
      const failed = await invoke(controller.saveAssignments(true), { seller_id: 2, items: products }, 'ADMIN', 999);
      assert.equal(failed.statusCode, 500);
      assert.equal((await connection.query('SELECT COUNT(*)::int AS count FROM seller_assignments WHERE seller_id=2')).rows[0].count, 68);
    });
    await t.test('affiliate cannot assign items and duplicate selections are harmless', async () => {
      assert.equal((await invoke(controller.saveAssignments(true), { seller_id: 2, items: [] }, 'AGENT', 2)).statusCode, 403);
      assert.equal((await invoke(controller.saveAssignments(true), { seller_id: 2, items: [products[0], products[0]] })).statusCode, 200);
      assert.equal((await connection.query('SELECT COUNT(*)::int AS count FROM seller_assignments WHERE seller_id=2')).rows[0].count, 1);
    });
    await t.test('category filters, overlaps and both assignment stores produce one scoped catalog', async () => {
      await invoke(controller.saveAssignments(true), { seller_id: 2, items: [
        { item_type: 'category', item_id: 1, allowed_types: ['product', 'service'] },
        { item_type: 'category', item_id: 2 }, products[0],
      ] });
      await connection.query('INSERT INTO affiliate_assignments VALUES (2,1,true),(2,68,true),(20,2,true)');
      const result = await invoke(mine, {}, 'AGENT', 2);
      assert.equal(result.statusCode, 200);
      const catalog = result.body.data.filter(item => item.item_type !== 'category');
      assert.equal(catalog.length, 68);
      assert.equal(new Set(catalog.map(item => item.id)).size, 68);
      await connection.query('UPDATE affiliate_assignments SET is_active=false WHERE affiliate_id=2 AND catalog_id=68');
      const filtered = await invoke(mine, {}, 'AGENT', 2);
      assert.equal(filtered.body.data.some(item => item.item_type === 'solution'), false);
    });
  } finally {
    // Closing the physical connection discards every temporary test table, even on failure.
    await connection.query('ROLLBACK');
    connection.release(true);
    await pool.end();
  }
});
