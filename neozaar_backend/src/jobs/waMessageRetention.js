/**
 * WhatsApp transcript retention — sweep logic (no scheduling side effects, so
 * it's safe to import from tests / scripts). The cron wrapper is
 * waMessageRetention.cron.js.
 *
 * Hard-deletes wa_messages older than WA_MSG_RETENTION_DAYS (default 545 ≈ 18
 * months). wa_contacts is kept indefinitely and pruned only on a data-subject
 * deletion request (the DELETE endpoint).
 */
const pool = require('../config/database');

const RETENTION_DAYS = Math.max(1, parseInt(process.env.WA_MSG_RETENTION_DAYS, 10) || 545);

async function sweep() {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM wa_messages WHERE created_at < now() - ($1 || ' days')::interval`,
      [RETENTION_DAYS]
    );
    console.log(
      `🧹 wa_messages retention sweep: removed ${rowCount} row(s) older than ${RETENTION_DAYS}d`
    );
    return rowCount;
  } catch (err) {
    console.error('wa_messages retention sweep failed:', err.message);
    return 0;
  }
}

module.exports = { sweep, RETENTION_DAYS };
