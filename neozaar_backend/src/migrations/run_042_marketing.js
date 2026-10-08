require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '042_marketing.sql'),
      'utf8'
    );
    await client.query(sql);
    console.log('✅ 042_marketing applied');
    const { rows } = await client.query(
      `SELECT
         to_regclass('public.marketing_contacts')        AS marketing_contacts,
         to_regclass('public.marketing_events')          AS marketing_events,
         to_regclass('public.marketing_tags')            AS marketing_tags,
         to_regclass('public.marketing_contact_tags')    AS marketing_contact_tags,
         to_regclass('public.marketing_segments')        AS marketing_segments,
         to_regclass('public.marketing_segment_members') AS marketing_segment_members,
         to_regclass('public.marketing_scoring_rules')   AS marketing_scoring_rules`
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
