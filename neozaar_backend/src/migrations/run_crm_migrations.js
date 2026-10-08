/**
 * run_crm_migrations.js
 * ─────────────────────────────────────────────────────────────
 * Runs migrations 010 and 011 against the live database.
 * Safe to run multiple times — all statements are idempotent.
 *
 * Usage:
 *   node src/migrations/run_crm_migrations.js
 *
 * Or called automatically from server startup (see server.js).
 */
const fs   = require('fs');
const path = require('path');
const pool = require('../config/database');

const migrations = [
  path.join(__dirname, '010_crm_reliability.sql'),
  path.join(__dirname, '011_crm_integration.sql'),
];

async function run() {
  const client = await pool.connect();
  try {
    for (const file of migrations) {
      const name = path.basename(file);
      console.log(`[migration] Running ${name}...`);
      const sql = fs.readFileSync(file, 'utf8');
      await client.query(sql);
      console.log(`[migration] ✓ ${name} complete`);
    }
    console.log('[migration] All CRM migrations applied successfully.');
  } catch (e) {
    console.error('[migration] FAILED:', e.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

run();
