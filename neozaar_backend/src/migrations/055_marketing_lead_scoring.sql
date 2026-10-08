-- Additional scoring rules for lead-creation event types introduced when
-- wiring the CRM lead-capture flow (leadService.createLead) into Marketing.
-- Kept in its own migration (not appended to 042's seed) since 042's
-- INSERT is guarded by "only seed if the table is completely empty" and
-- would silently no-op once any row already exists.
BEGIN;

INSERT INTO marketing_scoring_rules (event_type, score_delta, description, model_id)
SELECT seed.event_type, seed.score_delta, seed.description,
  (SELECT id FROM marketing_scoring_models WHERE code = 'general_engagement')
FROM (VALUES
  ('EXPERT_CONTACT_REQUEST', 25, 'Requested to talk to an expert'),
  ('PRIVATE_OFFER_REQUEST', 30, 'Requested a private offer'),
  ('BUY_NOW_REQUEST',       40, 'Started a buy-now purchase'),
  ('TRIAL_REQUEST',         20, 'Requested a trial'),
  ('POC_REQUEST',           25, 'Requested a proof of concept'),
  ('CTA_CONVERSION',        35, 'High-intent CTA click that converted directly to an opportunity')
) AS seed(event_type, score_delta, description)
WHERE NOT EXISTS (
  SELECT 1 FROM marketing_scoring_rules r WHERE r.event_type = seed.event_type
) AND EXISTS (SELECT 1 FROM marketing_scoring_models WHERE code = 'general_engagement');

COMMIT;
