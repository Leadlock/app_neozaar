-- Migration 013: Fix company name in crm_accounts, crm_contacts, crm_leads, and company_detail
-- Problem: CLIENT registrations were saving person name as account name instead of company name.
--          company_detail.company_name was never populated for CLIENT users.
--          crm_contacts.company was null or set to person name.
--          crm_leads.company was null.
-- Safe to run multiple times (only updates records where company name is available).

-- 1. Fix crm_accounts: set name = company_detail.company_name where account name = user name
UPDATE crm_accounts a
SET name = cd.company_name, updated_at = NOW()
FROM users u
JOIN company_detail cd ON cd.action_id::bigint = u.id AND cd.action_type = 'CLIENT'
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(a.email))
  AND cd.company_name IS NOT NULL
  AND TRIM(cd.company_name) <> ''
  AND LOWER(TRIM(a.name)) = LOWER(TRIM(u.name))
  AND a.is_deleted = FALSE;

-- 2. Fix crm_contacts: set company = company_detail.company_name where company is null or = user name
UPDATE crm_contacts c
SET company = cd.company_name, updated_at = NOW()
FROM users u
JOIN company_detail cd ON cd.action_id::bigint = u.id AND cd.action_type = 'CLIENT'
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(c.email))
  AND cd.company_name IS NOT NULL
  AND TRIM(cd.company_name) <> ''
  AND (c.company IS NULL OR LOWER(TRIM(c.company)) = LOWER(TRIM(u.name)))
  AND c.is_deleted = FALSE;

-- 3. Fix crm_leads: set company = company_detail.company_name where company is null
UPDATE crm_leads l
SET company = cd.company_name, updated_at = NOW()
FROM users u
JOIN company_detail cd ON cd.action_id::bigint = u.id AND cd.action_type = 'CLIENT'
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(l.email))
  AND cd.company_name IS NOT NULL
  AND TRIM(cd.company_name) <> ''
  AND (l.company IS NULL OR l.company = '')
  AND l.is_deleted = FALSE;
