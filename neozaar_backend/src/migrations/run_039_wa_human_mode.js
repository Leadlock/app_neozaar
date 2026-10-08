// Explicit migration runner; never runs automatically on server startup.
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const pool = require('../config/database');

async function migrate() {
  let client;
  try {
    client = await pool.connect();
    // 035 is idempotent and also supports local databases that have never
    // received a WhatsApp webhook (the bot normally creates these tables).
    for (const file of ['035_wa_conversation_log.sql', '039_wa_human_mode.sql']) {
      await client.query(fs.readFileSync(path.join(__dirname, file), 'utf8'));
      console.log(`Applied ${file}`);
    }
    await client.query('SELECT conversation_mode, unread, assigned_agent_id, assigned_agent_name FROM wa_contacts LIMIT 0');
    await client.query('SELECT sender_type, agent_id, agent_name FROM wa_messages LIMIT 0');
    console.log('WhatsApp inbox schema verified');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('WhatsApp migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

migrate();
