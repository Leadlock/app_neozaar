-- Migration 012: Backfill company on crm_contacts from linked crm_accounts
-- For contacts where company is NULL but they have an account_id,
-- copy the account name into contact.company.
-- Safe to run multiple times (only updates NULLs).

UPDATE crm_contacts c
SET company = a.name, updated_at = NOW()
FROM crm_accounts a
WHERE c.account_id = a.id
  AND (c.company IS NULL OR TRIM(c.company) = '')
  AND a.is_deleted = FALSE
  AND c.is_deleted = FALSE;
