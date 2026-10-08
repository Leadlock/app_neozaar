BEGIN;

-- Supports template-level delivery funnels, version history and CTA reports.
CREATE INDEX IF NOT EXISTS idx_marketing_email_versions_template_created
  ON marketing_email_template_versions(template_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_email_messages_version_send_type
  ON marketing_email_messages(template_version_id, send_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_email_events_message_type
  ON marketing_email_delivery_events(message_id, event_type, occurred_at DESC);

COMMIT;
