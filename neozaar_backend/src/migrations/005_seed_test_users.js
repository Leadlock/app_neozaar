/**
 * Seed script: Create 3 test users for M_SELLER, SELLER, and AGENT (Affiliate) roles
 * 
 * Run: node src/migrations/005_seed_test_users.js
 * 
 * Test Credentials:
 * ─────────────────────────────────────────────────────────────
 * M_SELLER (Master Seller):
 *   Email:    mseller@neozaar.test
 *   Password: Test@1234
 * 
 * SELLER:
 *   Email:    seller@neozaar.test
 *   Password: Test@1234
 * 
 * AGENT (Affiliate):
 *   Email:    affiliate@neozaar.test
 *   Password: Test@1234
 * ─────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const TEST_PASSWORD = 'Test@1234';

const testUsers = [
  {
    name: 'Test Master Seller',
    email: 'mseller@neozaar.test',
    mobile: '9000000001',
    role_id: 6,
    role_type: 'M_SELLER',
    designation: 'Sales Manager',
  },
  {
    name: 'Test Seller',
    email: 'seller@neozaar.test',
    mobile: '9000000002',
    role_id: 9,
    role_type: 'SELLER',
    designation: 'Sales Executive',
  },
  {
    name: 'Test Affiliate',
    email: 'affiliate@neozaar.test',
    mobile: '9000000003',
    role_id: 7,
    role_type: 'AGENT',
    designation: 'Affiliate Partner',
  },
];

async function seed() {
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

  for (const user of testUsers) {
    try {
      // Check if user already exists
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);

      if (existing.rows.length > 0) {
        // Update password and ensure active + verified
        await pool.query(
          `UPDATE users SET password = $1, is_active = true, is_email_verified = true, name = $2, role_id = $3, role_type = $4, designation = $5 WHERE email = $6`,
          [hashedPassword, user.name, user.role_id, user.role_type, user.designation, user.email]
        );
        console.log(`✅ Updated existing: ${user.email} (${user.role_type})`);
      } else {
        // Insert new user
        await pool.query(
          `INSERT INTO users (role_id, role_type, name, mobile, email, password, designation, is_active, is_email_verified, is_mobile_verified, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, false, NOW(), NOW())`,
          [user.role_id, user.role_type, user.name, user.mobile, user.email, hashedPassword, user.designation]
        );
        console.log(`✅ Created: ${user.email} (${user.role_type})`);
      }
    } catch (err) {
      console.error(`❌ Failed for ${user.email}:`, err.message);
    }
  }

  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('Test Login Credentials:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('M_SELLER (Master Seller):');
  console.log('  Email:    mseller@neozaar.test');
  console.log('  Password: Test@1234');
  console.log('');
  console.log('SELLER:');
  console.log('  Email:    seller@neozaar.test');
  console.log('  Password: Test@1234');
  console.log('');
  console.log('AGENT (Affiliate):');
  console.log('  Email:    affiliate@neozaar.test');
  console.log('  Password: Test@1234');
  console.log('─────────────────────────────────────────────────────────────');

  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
