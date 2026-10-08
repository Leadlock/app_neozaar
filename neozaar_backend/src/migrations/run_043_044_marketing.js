require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../config/database");

async function migrate() {
  const client = await pool.connect();
  try {
    for (const name of ["043_marketing_identity.sql", "044_marketing_event_ingestion.sql"]) {
      await client.query(fs.readFileSync(path.join(__dirname, name), "utf8"));
      console.log(`Applied ${name}`);
    }
    const { rows } = await client.query(`SELECT
      to_regclass('public.marketing_identity_keys') AS identity_keys,
      to_regclass('public.marketing_identity_merges') AS identity_merges,
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='marketing_events'
        AND column_name='idempotency_key') AS event_idempotency`);
    console.log("Verification:", rows[0]);
  } catch (error) {
    console.error("Marketing Phase 2 migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
