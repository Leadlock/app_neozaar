/**
 * Cleanup script — hard-deletes ALL CRM and marketplace records
 * for a given email address. Use only in development/testing.
 *
 * Usage:
 *   node scripts/cleanup-test-user.js yuvarajdmuthu@gmail.com
 */
const pool = require('../src/config/database');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/cleanup-test-user.js <email>');
  process.exit(1);
}
const normalizedEmail = email.trim().toLowerCase();

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Find all CRM IDs for this email ───────────────────────
    const { rows: leads } = await client.query(
      'SELECT id FROM crm_leads WHERE email_normalized = $1',
      [normalizedEmail]
    );
    const { rows: accounts } = await client.query(
      'SELECT id FROM crm_accounts WHERE LOWER(TRIM(email)) = $1',
      [normalizedEmail]
    );
    const { rows: contacts } = await client.query(
      'SELECT id FROM crm_contacts WHERE LOWER(TRIM(email)) = $1',
      [normalizedEmail]
    );

    const leadIds    = leads.map(r => r.id);
    const accountIds = accounts.map(r => r.id);
    const contactIds = contacts.map(r => r.id);

    console.log(`Found: ${leadIds.length} lead(s), ${accountIds.length} account(s), ${contactIds.length} contact(s)`);

    // ── 2. Delete opportunities linked to any of the above ────────
    let oppResult = { rowCount: 0 };
    if (leadIds.length || accountIds.length || contactIds.length) {
      const conditions = [];
      if (leadIds.length)    conditions.push(`lead_id    = ANY(ARRAY[${leadIds.join(',')}]::int[])`);
      if (accountIds.length) conditions.push(`account_id = ANY(ARRAY[${accountIds.join(',')}]::int[])`);
      if (contactIds.length) conditions.push(`contact_id = ANY(ARRAY[${contactIds.join(',')}]::int[])`);

      oppResult = await client.query(
        `DELETE FROM crm_opportunities WHERE ${conditions.join(' OR ')}`
      );
      console.log(`Deleted ${oppResult.rowCount} opportunity(s)`);
    }

    // ── 3. Delete scoring history ─────────────────────────────────
    if (leadIds.length) {
      const sh = await client.query(
        `DELETE FROM crm_lead_score_history WHERE lead_id = ANY(ARRAY[${leadIds.join(',')}]::int[])`
      );
      console.log(`Deleted ${sh.rowCount} score history row(s)`);
    }

    // ── 4. Delete activities & tasks linked to these records ──────
    // Columns: contact_id FK, entity_type/entity_id (polymorphic)
    if (contactIds.length || accountIds.length) {
      const cond = [];
      if (contactIds.length) {
        cond.push(`contact_id = ANY(ARRAY[${contactIds.join(',')}]::int[])`);
        cond.push(`(entity_type = 'contact' AND entity_id = ANY(ARRAY[${contactIds.join(',')}]::int[]))`);
      }
      if (accountIds.length)
        cond.push(`(entity_type = 'account' AND entity_id = ANY(ARRAY[${accountIds.join(',')}]::int[]))`);

      const w = cond.join(' OR ');
      const act  = await client.query(`DELETE FROM crm_activities WHERE ${w}`);
      const task = await client.query(`DELETE FROM crm_tasks      WHERE ${w}`);
      console.log(`Deleted ${act.rowCount} activit(ies), ${task.rowCount} task(s)`);
    }

    // ── 5. Clear FK back-references on crm_leads before deleting contacts/accounts
    if (contactIds.length) {
      await client.query(
        `UPDATE crm_leads SET contact_id=NULL WHERE contact_id = ANY(ARRAY[${contactIds.join(',')}]::int[])`
      );
      await client.query(
        `UPDATE crm_leads SET converted_to_contact_id=NULL WHERE converted_to_contact_id = ANY(ARRAY[${contactIds.join(',')}]::int[])`
      ).catch(() => {});
    }
    if (accountIds.length) {
      await client.query(
        `UPDATE crm_leads SET account_id=NULL WHERE account_id = ANY(ARRAY[${accountIds.join(',')}]::int[])`
      ).catch(() => {});
      await client.query(
        `UPDATE crm_leads SET converted_to_account_id=NULL WHERE converted_to_account_id = ANY(ARRAY[${accountIds.join(',')}]::int[])`
      ).catch(() => {});
    }

    // ── 6. Delete contacts ────────────────────────────────────────
    if (contactIds.length) {
      const c = await client.query(
        `DELETE FROM crm_contacts WHERE id = ANY(ARRAY[${contactIds.join(',')}]::int[])`
      );
      console.log(`Deleted ${c.rowCount} contact(s)`);
    }

    // ── 7. Delete accounts ────────────────────────────────────────
    if (accountIds.length) {
      const a = await client.query(
        `DELETE FROM crm_accounts WHERE id = ANY(ARRAY[${accountIds.join(',')}]::int[])`
      );
      console.log(`Deleted ${a.rowCount} account(s)`);
    }

    // ── 8. Delete CRM lead (and its audit logs) ───────────────────
    if (leadIds.length) {
      await client.query(
        `DELETE FROM crm_audit_logs WHERE entity_id = ANY(ARRAY[${leadIds.join(',')}]::int[]) AND entity_type = 'Lead'`
      );
      const l = await client.query(
        `DELETE FROM crm_leads WHERE id = ANY(ARRAY[${leadIds.join(',')}]::int[])`
      );
      console.log(`Deleted ${l.rowCount} crm_lead(s)`);
    }

    // ── 9. Delete marketplace user ────────────────────────────────
    const u = await client.query(
      `DELETE FROM users WHERE LOWER(TRIM(email)) = $1`,
      [normalizedEmail]
    );
    console.log(`Deleted ${u.rowCount} marketplace user(s)`);

    await client.query('COMMIT');
    console.log(`\nDone — all records for ${email} permanently removed.`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error — rolled back:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();
