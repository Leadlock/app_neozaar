require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '038_public_links.sql'),
      'utf8'
    );
    await client.query(sql);
    console.log('✅ 038_public_links applied');
    const { rows } = await client.query(
      `SELECT
         to_regclass('public.public_links')       AS public_links,
         to_regclass('public.public_link_events') AS public_link_events`
    );
    console.log('   tables:', rows[0]);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
