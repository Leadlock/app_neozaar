-- Consulting Advisor specialisation ("Type of advisor").
-- Stored on users (only meaningful for role_type = 'AGENT'), shown in the admin panel.
-- Idempotent: safe to run more than once.

ALTER TABLE users ADD COLUMN IF NOT EXISTS advisor_type VARCHAR(100);

-- Backfill advisors registered before this field existed.
UPDATE users
SET advisor_type = 'Compliance Advisors'
WHERE role_type = 'AGENT' AND (advisor_type IS NULL OR advisor_type = '');

CREATE INDEX IF NOT EXISTS idx_users_advisor_type ON users(advisor_type) WHERE advisor_type IS NOT NULL;
