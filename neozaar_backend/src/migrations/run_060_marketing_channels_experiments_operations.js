require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '060_marketing_channels_experiments_operations.sql'), 'utf8');
  await pool.query(sql);
  console.log('Migration 060 completed.');
}

run().catch(error => {
  console.error('Migration 060 failed:', error);
  process.exitCode = 1;
}).finally(() => pool.end());
