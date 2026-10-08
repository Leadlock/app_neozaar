BEGIN;

CREATE TABLE IF NOT EXISTS marketing_scoring_models (
  id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL UNIQUE, code VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255), is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, decay_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  decay_after_days INTEGER NOT NULL DEFAULT 30, decay_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  last_decay_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO marketing_scoring_models (name,code,description,is_default) VALUES
 ('General Engagement','general_engagement','Default Marketing engagement score',TRUE),
 ('Product Interest','product_interest','Product engagement score',FALSE),
 ('Enterprise Intent','enterprise_intent','Enterprise buying intent score',FALSE),
 ('Campaign Engagement','campaign_engagement','Campaign interaction score',FALSE)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE marketing_scoring_rules ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE marketing_scoring_rules ADD COLUMN IF NOT EXISTS conditions JSONB NOT NULL DEFAULT '{}';
ALTER TABLE marketing_scoring_rules ADD COLUMN IF NOT EXISTS model_id INTEGER;
UPDATE marketing_scoring_rules SET model_id=(SELECT id FROM marketing_scoring_models WHERE code='general_engagement') WHERE model_id IS NULL;
ALTER TABLE marketing_scoring_rules ALTER COLUMN model_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='marketing_scoring_rules_model_fkey') THEN
    ALTER TABLE marketing_scoring_rules ADD CONSTRAINT marketing_scoring_rules_model_fkey
      FOREIGN KEY (model_id) REFERENCES marketing_scoring_models(id) ON DELETE CASCADE;
  END IF;
END $$;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY event_type,model_id ORDER BY updated_at DESC,id DESC) rn
  FROM marketing_scoring_rules WHERE is_active=TRUE
)
UPDATE marketing_scoring_rules r SET is_active=FALSE,updated_at=NOW() FROM ranked
WHERE r.id=ranked.id AND ranked.rn>1;
DROP INDEX IF EXISTS uq_mkt_scoring_active_event;
CREATE UNIQUE INDEX IF NOT EXISTS uq_mkt_scoring_active_event_model
  ON marketing_scoring_rules(event_type,model_id) WHERE is_active=TRUE;

CREATE TABLE IF NOT EXISTS marketing_score_ledger (
  id BIGSERIAL PRIMARY KEY,
  marketing_contact_id INTEGER NOT NULL REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  marketing_event_id BIGINT REFERENCES marketing_events(id) ON DELETE SET NULL,
  scoring_rule_id INTEGER REFERENCES marketing_scoring_rules(id) ON DELETE SET NULL,
  model_id INTEGER REFERENCES marketing_scoring_models(id) ON DELETE SET NULL,
  score_delta INTEGER NOT NULL, reason VARCHAR(100) NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW(), created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (marketing_event_id,model_id)
);
CREATE INDEX IF NOT EXISTS idx_mkt_score_ledger_contact ON marketing_score_ledger(marketing_contact_id,model_id,occurred_at);

CREATE TABLE IF NOT EXISTS marketing_contact_scores (
  marketing_contact_id INTEGER NOT NULL REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  model_id INTEGER NOT NULL REFERENCES marketing_scoring_models(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (marketing_contact_id,model_id)
);

INSERT INTO marketing_score_ledger (marketing_contact_id,marketing_event_id,model_id,score_delta,reason,occurred_at)
SELECT marketing_contact_id,id,(SELECT id FROM marketing_scoring_models WHERE code='general_engagement'),score_delta,'event_backfill',occurred_at
FROM marketing_events WHERE marketing_contact_id IS NOT NULL AND score_delta<>0
ON CONFLICT (marketing_event_id,model_id) DO NOTHING;

INSERT INTO marketing_contact_scores (marketing_contact_id,model_id,score)
SELECT marketing_contact_id,model_id,COALESCE(SUM(score_delta),0)::int FROM marketing_score_ledger
GROUP BY marketing_contact_id,model_id ON CONFLICT (marketing_contact_id,model_id)
DO UPDATE SET score=EXCLUDED.score,updated_at=NOW();

COMMIT;
