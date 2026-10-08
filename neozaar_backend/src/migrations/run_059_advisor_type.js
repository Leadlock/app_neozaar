require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '059_advisor_type.sql'), 'utf8');
    await pool.query(sql);
    const { rows } = await pool.query(
      "SELECT advisor_type, COUNT(*)::int AS count FROM users WHERE role_type = 'AGENT' GROUP BY advisor_type ORDER BY advisor_type"
    );
    console.log('Applied 059_advisor_type.sql. Advisors by type:', rows);
  } catch (error) {
    console.error('Advisor type migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
