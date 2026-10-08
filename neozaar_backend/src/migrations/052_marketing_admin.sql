BEGIN;
CREATE TABLE IF NOT EXISTS marketing_user_permissions(user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,permission VARCHAR(60) NOT NULL,granted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,created_at TIMESTAMP DEFAULT NOW(),PRIMARY KEY(user_id,permission));
CREATE TABLE IF NOT EXISTS marketing_settings(setting_key VARCHAR(80) PRIMARY KEY,value JSONB NOT NULL DEFAULT '{}',is_secret BOOLEAN NOT NULL DEFAULT FALSE,updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,updated_at TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS marketing_retention_runs(id BIGSERIAL PRIMARY KEY,policy JSONB NOT NULL,started_at TIMESTAMP DEFAULT NOW(),completed_at TIMESTAMP,status VARCHAR(20) NOT NULL,deleted_counts JSONB NOT NULL DEFAULT '{}',error VARCHAR(500));
CREATE INDEX IF NOT EXISTS idx_mkt_events_occurred_retention ON marketing_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_mkt_email_events_retention ON marketing_email_delivery_events(occurred_at);
COMMIT;
