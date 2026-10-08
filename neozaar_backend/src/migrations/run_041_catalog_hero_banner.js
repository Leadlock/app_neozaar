require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '041_catalog_hero_banner.sql'),
      'utf8'
    );
    await client.query(sql);
    console.log('✅ 041_catalog_hero_banner applied');
    const { rows } = await client.query(
      "SELECT to_regclass('public.catalog_hero_banner') AS table"
    );
    console.log('   catalog_hero_banner table:', rows[0].table);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
