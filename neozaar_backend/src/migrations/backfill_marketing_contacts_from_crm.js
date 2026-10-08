/**
 * One-time (but safe to re-run) backfill: creates a marketing_contacts row
 * for every existing crm_contacts row that doesn't have one yet, so the
 * Marketing module isn't starting from zero once it goes live.
 *
 * Reuses identity.service.js's resolveIdentity — the exact same logic the
 * live ingestion path uses to match/create contacts — rather than a
 * separate raw INSERT, so this can never drift from real behavior (email
 * normalization, identity_keys, preference_token generation, etc.).
 *
 * Idempotent: marketing_contacts.crm_contact_id is UNIQUE, and this only
 * selects crm_contacts rows that don't already have a linked
 * marketing_contacts row, so running it again just picks up anything new.
 *
 * Usage: node src/migrations/backfill_marketing_contacts_from_crm.js [--dry-run]
 */
const pool = require("../config/database");
const identity = require("../services/marketing/identity.service");

async function run() {
  const dryRun = process.argv.includes("--dry-run");
  const { rows } = await pool.query(`
    SELECT cc.id, cc.name, cc.email, cc.phone, cc.type
    FROM crm_contacts cc
    LEFT JOIN marketing_contacts mc ON mc.crm_contact_id = cc.id
    WHERE cc.is_deleted = FALSE AND mc.id IS NULL AND (cc.email IS NOT NULL OR cc.phone IS NOT NULL)
    ORDER BY cc.id
  `);

  console.log(`Found ${rows.length} crm_contacts without a marketing_contacts row.`);
  if (dryRun) {
    console.log("Dry run — no changes made. Sample:", rows.slice(0, 5));
    await pool.end();
    return;
  }

  let created = 0;
  let failed = 0;
  for (const contact of rows) {
    try {
      const result = await identity.resolveIdentity({ email: contact.email, phone: contact.phone });
      if (result.marketingContactId) created++;
    } catch (error) {
      failed++;
      console.error(`  crm_contact ${contact.id} (${contact.email || contact.phone}) failed:`, error.message);
    }
  }
  console.log(`Backfill complete: ${created} linked/created, ${failed} failed out of ${rows.length}.`);
  await pool.end();
}

run().catch((error) => {
  console.error("Backfill failed:", error);
  process.exitCode = 1;
});
