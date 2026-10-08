require('dotenv').config();
const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255) NULL;
    `);
    console.log('✅ verification_token column added (or already exists)');

    await client.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lead_source VARCHAR(255) NULL;
    `);
    console.log('✅ lead_source column added (or already exists)');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
