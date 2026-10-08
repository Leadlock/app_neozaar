require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '062_marketing_role.sql'), 'utf8');
  const result = await pool.query(sql);
  console.log('Migration 062 complete');
  const rows = result[result.length - 1]?.rows;
  if (rows) console.log('Roles:', rows);
}

run().catch(error => {
  console.error('Migration 062 failed:', error);
  process.exitCode = 1;
}).finally(() => pool.end());
