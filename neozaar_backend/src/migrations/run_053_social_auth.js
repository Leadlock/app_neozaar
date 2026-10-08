require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '053_social_auth.sql'), 'utf8');
    await pool.query(sql);
    console.log('Applied 053_social_auth.sql');
  } catch (error) {
    console.error('Social auth migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
