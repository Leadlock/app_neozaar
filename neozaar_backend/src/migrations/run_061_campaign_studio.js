const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

(async () => {
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, '061_campaign_studio.sql'), 'utf8'));
    console.log('Campaign Studio migration 061 complete');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
