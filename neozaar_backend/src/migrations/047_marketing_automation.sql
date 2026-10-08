BEGIN;

CREATE TABLE IF NOT EXISTS marketing_automations (
  id SERIAL PRIMARY KEY, name VARCHAR(160) NOT NULL, description TEXT,
  trigger_type VARCHAR(50) NOT NULL, trigger_config JSONB NOT NULL DEFAULT '{}',
  definition JSONB NOT NULL DEFAULT '{"nodes":[]}', status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK(status IN('draft','active','paused','archived')),
  version INTEGER NOT NULL DEFAULT 1, created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mkt_automation_trigger ON marketing_automations(trigger_type,status);

CREATE TABLE IF NOT EXISTS marketing_automation_executions (
  id UUID PRIMARY KEY, automation_id INTEGER NOT NULL REFERENCES marketing_automations(id) ON DELETE CASCADE,
  marketing_contact_id INTEGER REFERENCES marketing_contacts(id) ON DELETE SET NULL,
  trigger_event_id BIGINT REFERENCES marketing_events(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(180) NOT NULL UNIQUE, current_node VARCHAR(100),
  status VARCHAR(20) NOT NULL CHECK(status IN('QUEUED','RUNNING','WAITING','COMPLETED','FAILED','CANCELLED','SKIPPED')),
  retry_count INTEGER NOT NULL DEFAULT 0, step_count INTEGER NOT NULL DEFAULT 0,
  context JSONB NOT NULL DEFAULT '{}', last_error VARCHAR(500),
  started_at TIMESTAMP, completed_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mkt_executions_status ON marketing_automation_executions(status,updated_at);

CREATE TABLE IF NOT EXISTS marketing_jobs (
  id BIGSERIAL PRIMARY KEY, job_type VARCHAR(50) NOT NULL, payload JSONB NOT NULL,
  idempotency_key VARCHAR(180) NOT NULL UNIQUE, status VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
    CHECK(status IN('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED')),
  attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 5,
  available_at TIMESTAMP NOT NULL DEFAULT NOW(), leased_at TIMESTAMP, lease_owner VARCHAR(100),
  last_error VARCHAR(500), created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mkt_jobs_ready ON marketing_jobs(status,available_at,id);

CREATE TABLE IF NOT EXISTS marketing_automation_logs (
  id BIGSERIAL PRIMARY KEY, execution_id UUID NOT NULL REFERENCES marketing_automation_executions(id) ON DELETE CASCADE,
  node_id VARCHAR(100), level VARCHAR(10) NOT NULL, event VARCHAR(80) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mkt_automation_logs_execution ON marketing_automation_logs(execution_id,created_at);

CREATE TABLE IF NOT EXISTS marketing_action_deduplication (
  execution_id UUID NOT NULL REFERENCES marketing_automation_executions(id) ON DELETE CASCADE,
  node_id VARCHAR(100) NOT NULL, action_key VARCHAR(120) NOT NULL,
  result JSONB NOT NULL DEFAULT '{}', completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY(execution_id,node_id,action_key)
);

COMMIT;
