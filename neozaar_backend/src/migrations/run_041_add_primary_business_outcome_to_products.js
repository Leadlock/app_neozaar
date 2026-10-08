require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '041_add_primary_business_outcome_to_products.sql'),
      'utf8'
    );
    await client.query(sql);
    console.log('✅ 041_add_primary_business_outcome_to_products applied');
    const { rows } = await client.query(
      `SELECT column_name, data_type
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'products'
          AND column_name = 'primary_business_outcome'`
    );
    console.log('   products.primary_business_outcome column:', rows[0] || '(missing)');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
