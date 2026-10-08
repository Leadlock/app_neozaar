// One-off runner for migration 062_marketing_role.sql.
// Idempotent (ON CONFLICT DO NOTHING); safe to re-run.
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

(async () => {
  const sqlPath = path.join(__dirname, '..', 'src', 'migrations', '062_marketing_role.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  try {
    await pool.query(sql);
    const { rows } = await pool.query('SELECT role_id, role_type FROM roles ORDER BY role_id');
    console.log('Roles after migration:');
    console.table(rows);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
