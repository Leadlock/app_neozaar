require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../config/database");

async function migrate() {
  const client = await pool.connect();
  try {
    for (const name of ["045_marketing_segmentation.sql", "046_marketing_scoring.sql"]) {
      await client.query(fs.readFileSync(path.join(__dirname, name), "utf8"));
      console.log(`Applied ${name}`);
    }
    const { rows } = await client.query(`SELECT
      to_regclass('public.marketing_segment_members') AS segment_members,
      to_regclass('public.marketing_score_ledger') AS score_ledger`);
    console.log("Verification:", rows[0]);
  } catch (error) {
    console.error("Marketing Phase 3 migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
