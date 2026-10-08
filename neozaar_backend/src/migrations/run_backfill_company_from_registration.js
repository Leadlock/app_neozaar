require('dotenv').config({ path: '.env' });
const pool = require('../config/database');

async function run() {
  // 1. Fix crm_accounts: set name = company_detail.company_name where account name = user name
  const accounts = await pool.query(`
    UPDATE crm_accounts a
    SET name = cd.company_name, updated_at = NOW()
    FROM users u
    JOIN company_detail cd ON cd.action_id::bigint = u.id AND cd.action_type = 'CLIENT'
    WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(a.email))
      AND cd.company_name IS NOT NULL
      AND TRIM(cd.company_name) <> ''
      AND LOWER(TRIM(a.name)) = LOWER(TRIM(u.name))
      AND a.is_deleted = FALSE
    RETURNING a.id, a.name, a.email
  `);
  console.log(`\nAccounts updated: ${accounts.rowCount}`);
  if (accounts.rows.length) console.table(accounts.rows);

  // 2. Fix crm_contacts: set company = company_detail.company_name where company is null or = user name
  const contacts = await pool.query(`
    UPDATE crm_contacts c
    SET company = cd.company_name, updated_at = NOW()
    FROM users u
    JOIN company_detail cd ON cd.action_id::bigint = u.id AND cd.action_type = 'CLIENT'
    WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(c.email))
      AND cd.company_name IS NOT NULL
      AND TRIM(cd.company_name) <> ''
      AND (c.company IS NULL OR LOWER(TRIM(c.company)) = LOWER(TRIM(u.name)))
      AND c.is_deleted = FALSE
    RETURNING c.id, c.name, c.company, c.email
  `);
  console.log(`\nContacts updated: ${contacts.rowCount}`);
  if (contacts.rows.length) console.table(contacts.rows);

  // 3. Fix crm_leads: set company = company_detail.company_name where company is null
  const leads = await pool.query(`
    UPDATE crm_leads l
    SET company = cd.company_name, updated_at = NOW()
    FROM users u
    JOIN company_detail cd ON cd.action_id::bigint = u.id AND cd.action_type = 'CLIENT'
    WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(l.email))
      AND cd.company_name IS NOT NULL
      AND TRIM(cd.company_name) <> ''
      AND (l.company IS NULL OR l.company = '')
      AND l.is_deleted = FALSE
    RETURNING l.id, l.email, l.company
  `);
  console.log(`\nLeads updated: ${leads.rowCount}`);
  if (leads.rows.length) console.table(leads.rows);

  // 4. Report accounts still using person name (no company_name stored)
  const { rows: unfixed } = await pool.query(`
    SELECT a.id, a.name AS account_name, a.email, u.name AS user_name
    FROM crm_accounts a
    JOIN users u ON LOWER(TRIM(u.email)) = LOWER(TRIM(a.email))
    WHERE LOWER(TRIM(a.name)) = LOWER(TRIM(u.name))
      AND a.is_deleted = FALSE
  `);
  if (unfixed.length) {
    console.log(`\n⚠️  ${unfixed.length} account(s) still have person name (no company name stored — update manually):`);
    console.table(unfixed);
  } else {
    console.log('\n✅ All accounts are fixed.');
  }

  await pool.end();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
