-- Marketing consent: audit trail, email double opt-in, and a per-contact
-- preference-center token. Marketing consent (email/whatsapp/sms) is
-- intentionally separate from the DPDPA cookie-consent ledger
-- (consent_ledger, migration 037) — accepting cookies never implies
-- marketing consent, and vice versa.
BEGIN;

ALTER TABLE marketing_contacts
  ADD COLUMN IF NOT EXISTS email_confirmation_token      VARCHAR(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS email_confirmation_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS email_confirmed_at             TIMESTAMP,
  ADD COLUMN IF NOT EXISTS preference_token                VARCHAR(64) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_mkt_contacts_email_confirmation_token
  ON marketing_contacts(email_confirmation_token);
CREATE INDEX IF NOT EXISTS idx_mkt_contacts_preference_token
  ON marketing_contacts(preference_token);

-- Evidence trail for every consent state change, independent of
-- marketing_form_submissions.consent (which only captures the raw
-- payload of one specific submission). Needed to answer "when/how did
-- this contact consent to this channel" for any consent path, not just
-- forms — required for DPDPA-style accountability.
CREATE TABLE IF NOT EXISTS marketing_consent_events (
  id                     BIGSERIAL PRIMARY KEY,
  marketing_contact_id   INTEGER NOT NULL REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  channel                VARCHAR(20) NOT NULL CHECK (channel IN ('email','whatsapp','sms')),
  action                 VARCHAR(20) NOT NULL CHECK (action IN ('requested','granted','confirmed','revoked')),
  method                 VARCHAR(30) NOT NULL, -- form | preference_center | double_optin_confirm | api
  source                 JSONB NOT NULL DEFAULT '{}', -- formId/submissionId/ip/etc, whatever is known
  created_at             TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mkt_consent_events_contact
  ON marketing_consent_events(marketing_contact_id, channel);

COMMIT;
