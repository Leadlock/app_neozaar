/**
 * Run Affiliate Program Migration (025)
 *
 * Usage: node src/migrations/run_affiliate_migration.js
 *
 * Idempotent — safe to run multiple times.
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');

const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     process.env.DB_PORT,
});

async function run() {
const sqlPath = path.join(__dirname, '025_affiliate_program.sql');
  const sql     = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running migration 025: Affiliate Program...');
  try {
    await pool.query(sql);
    console.log('✅ Migration 025 completed successfully');
  } catch (err) {
    console.error('❌ Migration 025 failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
