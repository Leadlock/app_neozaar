-- ============================================================
-- CRM Schema Diagnostic — run on proddb to find missing pieces
-- ============================================================

-- ── 1. Missing columns across all CRM tables ─────────────────
SELECT
  t.table_name,
  t.column_name,
  'MISSING' AS status
FROM (VALUES
  -- crm_leads
  ('crm_leads', 'score'),
  ('crm_leads', 'score_label'),
  ('crm_leads', 'lead_stage'),
  ('crm_leads', 'email_normalized'),
  ('crm_leads', 'conversion_source'),
  ('crm_leads', 'converted_at'),
  ('crm_leads', 'converted_to_opportunity_id'),
  ('crm_leads', 'converted_to_account_id'),
  ('crm_leads', 'converted_to_contact_id'),
  ('crm_leads', 'account_id'),
  ('crm_leads', 'contact_id'),
  ('crm_leads', 'affiliate_id'),
  ('crm_leads', 'expected_close_date'),
  ('crm_leads', 'phone_normalized'),
  ('crm_leads', 'company_domain'),
  -- crm_opportunities
  ('crm_opportunities', 'score'),
  ('crm_opportunities', 'account_id'),
  ('crm_opportunities', 'contact_id'),
  ('crm_opportunities', 'lead_id'),
  ('crm_opportunities', 'conversion_source'),
  ('crm_opportunities', 'customer_score_at_conversion'),
  ('crm_opportunities', 'converted_at'),
  ('crm_opportunities', 'stage_entered_at'),
  ('crm_opportunities', 'follow_up_status'),
  ('crm_opportunities', 'next_action_date'),
  ('crm_opportunities', 'last_activity_at'),
  ('crm_opportunities', 'last_contacted_at'),
  ('crm_opportunities', 'closed_at'),
  ('crm_opportunities', 'win_loss_notes'),
  ('crm_opportunities', 'final_deal_value'),
  ('crm_opportunities', 'is_reopened'),
  ('crm_opportunities', 'reopened_at'),
  ('crm_opportunities', 'reopened_by'),
  ('crm_opportunities', 'seller_id'),
  ('crm_opportunities', 'affiliate_id'),
  ('crm_opportunities', 'seller_assigned_at'),
  ('crm_opportunities', 'seller_assigned_by'),
  ('crm_opportunities', 'updated_by'),
  ('crm_opportunities', 'expected_revenue'),
  ('crm_opportunities', 'neozaar_revenue'),
  -- crm_opportunity_stage_history
  ('crm_opportunity_stage_history', 'old_score'),
  ('crm_opportunity_stage_history', 'new_score'),
  ('crm_opportunity_stage_history', 'win_loss_reason'),
  ('crm_opportunity_stage_history', 'stage_entered_at'),
  -- crm_lead_score_history
  ('crm_lead_score_history', 'points'),
  ('crm_lead_score_history', 'idempotency_key'),
  -- crm_contacts
  ('crm_contacts', 'industry'),
  ('crm_contacts', 'type'),
  ('crm_contacts', 'company'),
  ('crm_contacts', 'website'),
  ('crm_contacts', 'whatsapp'),
  ('crm_contacts', 'email_normalized'),
  ('crm_contacts', 'phone_normalized'),
  -- crm_accounts
  ('crm_accounts', 'email_normalized'),
  -- crm_notifications
  ('crm_notifications', 'is_read'),
  ('crm_notifications', 'read_at'),
  -- crm_quotes
  ('crm_quotes', 'opportunity_id'),
  ('crm_quotes', 'contact_id'),
  ('crm_quotes', 'subtotal'),
  ('crm_quotes', 'discount'),
  ('crm_quotes', 'tax'),
  ('crm_quotes', 'accepted_at')
) AS t(table_name, column_name)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_name = t.table_name
    AND c.column_name = t.column_name
    AND c.table_schema = 'public'
)
ORDER BY t.table_name, t.column_name;

-- ── 2. Missing tables ─────────────────────────────────────────
SELECT t.table_name, 'MISSING TABLE' AS status
FROM (VALUES
  ('crm_opportunity_products'),
  ('crm_lead_ownership_history'),
  ('crm_stage_aging_thresholds'),
  ('crm_stage_required_fields'),
  ('crm_stage_transitions')
) AS t(table_name)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables tbl
  WHERE tbl.table_name = t.table_name
    AND tbl.table_schema = 'public'
);

-- ── 3. Missing indexes ────────────────────────────────────────
SELECT i.indexname, 'MISSING INDEX' AS status
FROM (VALUES
  ('uq_crm_leads_email_active'),
  ('uq_crm_accounts_email_active'),
  ('uq_crm_contacts_email_active'),
  ('uq_score_history_idempotency'),
  ('idx_crm_leads_phone_norm'),
  ('idx_crm_leads_domain'),
  ('idx_crm_opps_next_action_date'),
  ('idx_crm_opps_stage_entered'),
  ('idx_crm_opps_follow_up_status'),
  ('idx_crm_stage_transitions_unique')
) AS i(indexname)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_indexes
  WHERE indexname = i.indexname
    AND schemaname = 'public'
);
