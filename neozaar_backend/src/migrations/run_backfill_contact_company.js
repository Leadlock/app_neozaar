require('dotenv').config({ path: '.env' });
const pool = require('../config/database');

async function run() {
  const { rowCount } = await pool.query(`
    UPDATE crm_contacts c
    SET company = a.name, updated_at = NOW()
    FROM crm_accounts a
    WHERE c.account_id = a.id
      AND (c.company IS NULL OR TRIM(c.company) = '')
      AND a.is_deleted = FALSE
      AND c.is_deleted = FALSE
  `);
  console.log(`✅ Backfilled company on ${rowCount} contact(s)`);
  await pool.end();
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
