const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

(async () => {
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, '063_marketing_email_analytics_indexes.sql'), 'utf8'));
    console.log('Marketing email analytics indexes migration 063 complete');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
