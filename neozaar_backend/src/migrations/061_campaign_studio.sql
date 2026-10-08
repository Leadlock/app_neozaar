BEGIN;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(24) NOT NULL DEFAULT 'listing';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS subject VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS preheader VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_blocks JSONB NOT NULL DEFAULT '[]';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS html_content TEXT;

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_campaign_type_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_campaign_type_check
  CHECK (campaign_type IN ('listing', 'studio'));

CREATE INDEX IF NOT EXISTS idx_campaigns_type_updated ON campaigns(campaign_type, updated_at DESC);

COMMIT;
