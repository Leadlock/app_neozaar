require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '033_hero_carousel.sql'),
      'utf8'
    );
    await client.query(sql);
    console.log('✅ 033_hero_carousel applied');
    const { rows } = await client.query(
      "SELECT to_regclass('public.hero_carousel') AS table"
    );
    console.log('   hero_carousel table:', rows[0].table);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
