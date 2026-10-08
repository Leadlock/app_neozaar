require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '032_lead_details_contact_columns.sql'),
      'utf8'
    );
    await client.query(sql);
    console.log('✅ 032_lead_details_contact_columns applied');

    const { rows } = await client.query(`
      SELECT
        COUNT(*)                                        AS total_userless,
        COUNT(*) FILTER (WHERE contact_email IS NOT NULL) AS with_email,
        COUNT(*) FILTER (WHERE contact_phone IS NOT NULL) AS with_phone,
        COUNT(*) FILTER (WHERE contact_name  IS NOT NULL) AS with_name
      FROM lead_details
      WHERE user_id IS NULL
    `);
    console.log('   backfill:', rows[0]);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
