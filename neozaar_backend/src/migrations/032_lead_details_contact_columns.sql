-- ============================================================================
-- MIGRATION: lead_details contact columns
-- WhatsApp-bot leads (type='whatsapp') have no linked portal user (user_id NULL),
-- so the Leads dashboard rendered NAME / EMAIL as "N/A". The bot already knows
-- the contact name / email / phone at capture time — this adds first-class
-- columns to store them, plus a best-effort backfill for existing rows.
-- ============================================================================

BEGIN;

ALTER TABLE public.lead_details ADD COLUMN IF NOT EXISTS contact_name  VARCHAR(255);
ALTER TABLE public.lead_details ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE public.lead_details ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

-- Backfill user-less rows from the free-text `message` column. Two historical
-- WhatsApp message formats are handled:
--   "WhatsApp Lead | Phone: 9199... | Email: a@b.com | CTA: ..."
--   "Source: WhatsApp Neo\n...\nContact: Ravi | Acme Corp | buyer@acme.com\nPhone: 000..."
UPDATE public.lead_details
SET
  contact_email = COALESCE(
    contact_email,
    NULLIF((regexp_match(message, 'Email:\s*([^\s|,;]+@[^\s|,;]+)', 'i'))[1], ''),
    NULLIF((regexp_match(message, '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})'))[1], '')
  ),
  contact_phone = COALESCE(
    contact_phone,
    NULLIF(btrim((regexp_match(message, 'Phone:\s*([^\s|,;\n]+)', 'i'))[1]), '')
  ),
  contact_name = COALESCE(
    contact_name,
    NULLIF(btrim(split_part((regexp_match(message, 'Contact:\s*([^\n]+)', 'i'))[1], '|', 1)), '')
  )
WHERE user_id IS NULL
  AND message IS NOT NULL
  AND (contact_email IS NULL OR contact_phone IS NULL OR contact_name IS NULL);

COMMIT;
