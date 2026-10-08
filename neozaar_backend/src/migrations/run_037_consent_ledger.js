require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '037_consent_ledger.sql'),
      'utf8'
    );
    await client.query(sql);
    console.log('✅ 037_consent_ledger applied');
    const { rows } = await client.query(
      `SELECT
         to_regclass('public.consent_events')  AS consent_events,
         to_regclass('public.consent_notices') AS consent_notices,
         to_regclass('public.dsar_requests')   AS dsar_requests`
    );
    console.log('   tables:', rows[0]);
    const { rows: n } = await client.query(
      "SELECT version, locale FROM consent_notices ORDER BY version, locale"
    );
    console.log('   seeded notices:', n);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
