require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const sql = fs.readFileSync(path.join(__dirname, 'src/config/crm_migration.sql'), 'utf8');

(async () => {
  const client = await pool.connect();
  try {
    console.log('Running CRM & Seller migration...');
    await client.query(sql);
    console.log('✅ CRM & Seller migration completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
