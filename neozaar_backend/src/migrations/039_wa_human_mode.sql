-- Additive extension of 035. Apply before deploying Human Mode applications.
-- No session changes, historical message rewrites, or production execution here.
BEGIN;
ALTER TABLE wa_contacts
  ADD COLUMN IF NOT EXISTS conversation_mode varchar(20) NOT NULL DEFAULT 'BOT'
    CHECK (conversation_mode IN ('BOT', 'HUMAN')),
  ADD COLUMN IF NOT EXISTS unread boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_agent_id bigint,
  ADD COLUMN IF NOT EXISTS assigned_agent_name varchar(255);
ALTER TABLE wa_messages
  ADD COLUMN IF NOT EXISTS sender_type varchar(16) CHECK (sender_type IN ('agent')),
  ADD COLUMN IF NOT EXISTS agent_id bigint,
  ADD COLUMN IF NOT EXISTS agent_name varchar(255);
COMMIT;
