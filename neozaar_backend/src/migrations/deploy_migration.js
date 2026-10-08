/**
 * Deployment Migration Script
 * 
 * This script checks the current state of the production database
 * and applies only the migrations that are needed.
 * 
 * Usage: 
 *   node deploy_migration.js --check     (dry run - shows what needs to change)
 *   node deploy_migration.js --run       (actually applies changes)
 * 
 * Set production DB credentials in .env or pass them:
 *   DB_HOST=xxx DB_NAME=xxx DB_USER=xxx DB_PASSWORD=xxx node deploy_migration.js --run
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const isDryRun = !process.argv.includes('--run');

async function log(msg) {
  console.log(isDryRun ? `[DRY RUN] ${msg}` : msg);
}

async function execute(sql, description) {
  log(`→ ${description}`);
  if (!isDryRun) {
    await pool.query(sql);
    console.log(`  ✅ Done`);
  }
}

// ─────────────────────────────────────────────
// CHECKS & MIGRATIONS
// ─────────────────────────────────────────────

async function checkAndMigrate() {
  console.log('═══════════════════════════════════════════════════');
  console.log(isDryRun ? '  DEPLOYMENT CHECK (DRY RUN)' : '  APPLYING MIGRATIONS');
  console.log('═══════════════════════════════════════════════════\n');

  // 1. CHECK: service_sub_options column in isv_details
  console.log('── 1. isv_details.service_sub_options column ──');
  const { rows: cols } = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'isv_details' AND column_name = 'service_sub_options'
  `);
  if (cols.length === 0) {
    await execute(
      `ALTER TABLE isv_details ADD COLUMN IF NOT EXISTS service_sub_options JSONB DEFAULT NULL;`,
      'Adding service_sub_options column to isv_details'
    );
  } else {
    log('✓ Column already exists');
  }

  // 2. CHECK: roles table - ensure all roles exist
  console.log('\n── 2. Roles table ──');
  const { rows: existingRoles } = await pool.query('SELECT role_id, role_type FROM roles ORDER BY role_id');
  console.log('  Current roles:', existingRoles.map(r => `${r.role_id}:${r.role_type}`).join(', '));

  const requiredRoles = [
    { id: 1, type: 'CLIENT' },
    { id: 2, type: 'ISV' },
    { id: 3, type: 'ADMIN' },
    { id: 4, type: 'SUPER_ADMIN' },
    { id: 5, type: 'ROLE_MANAGER' },
    { id: 6, type: 'ISV_SELLER' },
    { id: 7, type: 'AGENT' },
    { id: 8, type: 'SUPPORT_PARTNER' },
    { id: 9, type: 'SELLER' },
    { id: 10, type: 'M_SELLER' },
    { id: 11, type: 'A_MANAGER' },
  ];

  for (const role of requiredRoles) {
    const exists = existingRoles.find(r => r.role_id === role.id);
    if (!exists) {
      await execute(
        `INSERT INTO roles (role_id, role_type) VALUES (${role.id}, '${role.type}') ON CONFLICT (role_id) DO NOTHING;`,
        `Adding missing role: ${role.id} → ${role.type}`
      );
    } else if (exists.role_type !== role.type) {
      // Role exists but with different name (e.g., COSELLER → ISV_SELLER)
      await execute(
        `UPDATE roles SET role_type = '${role.type}' WHERE role_id = ${role.id};`,
        `Renaming role ${role.id}: ${exists.role_type} → ${role.type}`
      );
    }
  }

  // 3. CHECK: COSELLER → ISV_SELLER rename in users table
  console.log('\n── 3. COSELLER → ISV_SELLER user migration ──');
  const { rows: cosellerUsers } = await pool.query(`SELECT COUNT(*) as cnt FROM users WHERE role_type = 'COSELLER'`);
  const cosellerCount = parseInt(cosellerUsers[0].cnt);
  if (cosellerCount > 0) {
    // Drop constraint first
    await execute(
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_type_check;`,
      `Dropping users_role_type_check constraint`
    );
    await execute(
      `UPDATE users SET role_type = 'ISV_SELLER' WHERE role_type = 'COSELLER';`,
      `Updating ${cosellerCount} users from COSELLER → ISV_SELLER`
    );
  } else {
    log('✓ No COSELLER users to migrate');
  }

  // 4. CHECK: users_role_type_check constraint
  console.log('\n── 4. users_role_type_check constraint ──');
  const { rows: constraints } = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conrelid = 'users'::regclass AND conname = 'users_role_type_check'
  `);

  const expectedTypes = "ARRAY['CLIENT','ISV','ADMIN','SUPER_ADMIN','ROLE_MANAGER','SUPPORT_PARTNER','ISV_SELLER','USER','AGENT','M_SELLER','SELLER','A_MANAGER']";
  
  if (constraints.length === 0) {
    await execute(
      `ALTER TABLE users ADD CONSTRAINT users_role_type_check CHECK (role_type::text = ANY (${expectedTypes}::text[]));`,
      'Adding users_role_type_check constraint'
    );
  } else {
    const currentDef = constraints[0].definition;
    if (currentDef.includes('ISV_SELLER') && currentDef.includes('M_SELLER') && currentDef.includes('SELLER')) {
      log('✓ Constraint is up to date');
    } else {
      await execute(
        `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_type_check;`,
        'Dropping outdated constraint'
      );
      await execute(
        `ALTER TABLE users ADD CONSTRAINT users_role_type_check CHECK (role_type::text = ANY (${expectedTypes}::text[]));`,
        'Adding updated constraint'
      );
    }
  }

  // 5. SUMMARY
  console.log('\n═══════════════════════════════════════════════════');
  if (isDryRun) {
    console.log('  DRY RUN COMPLETE - No changes made');
    console.log('  Run with --run flag to apply changes:');
    console.log('  node deploy_migration.js --run');
  } else {
    console.log('  ✅ ALL MIGRATIONS APPLIED SUCCESSFULLY');
  }
  console.log('═══════════════════════════════════════════════════\n');

  // Show final state
  const { rows: finalRoles } = await pool.query('SELECT role_id, role_type FROM roles ORDER BY role_id');
  console.log('Final roles:');
  finalRoles.forEach(r => console.log(`  ${r.role_id}: ${r.role_type}`));
}

checkAndMigrate()
  .catch(err => console.error('❌ Fatal error:', err.message))
  .finally(() => pool.end());
