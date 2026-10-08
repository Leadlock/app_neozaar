-- CRM v2 Indexes
CREATE INDEX IF NOT EXISTS idx_crm_contacts_type ON crm_contacts(type);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_owner ON crm_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);

CREATE INDEX IF NOT EXISTS idx_crm_leads_contact ON crm_leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON crm_leads(stage);
CREATE INDEX IF NOT EXISTS idx_crm_leads_score ON crm_leads(score);
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner ON crm_leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_source ON crm_leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_crm_leads_deleted ON crm_leads(is_deleted);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created ON crm_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_opps_contact ON crm_opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_opps_lead ON crm_opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_opps_stage ON crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_crm_opps_owner ON crm_opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_opps_deleted ON crm_opportunities(is_deleted);

CREATE INDEX IF NOT EXISTS idx_crm_quotes_opp ON crm_quotes(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_contact ON crm_quotes(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_status ON crm_quotes(status);

CREATE INDEX IF NOT EXISTS idx_crm_orders_quote ON crm_sales_orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_crm_orders_contact ON crm_sales_orders(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_orders_status ON crm_sales_orders(status);

CREATE INDEX IF NOT EXISTS idx_crm_invoices_order ON crm_invoices(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_crm_invoices_contact ON crm_invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_invoices_status ON crm_invoices(status);

CREATE INDEX IF NOT EXISTS idx_crm_activities_entity ON crm_activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON crm_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_date ON crm_activities(activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_entity ON crm_tasks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_owner ON crm_tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due ON crm_tasks(due_date ASC);

CREATE INDEX IF NOT EXISTS idx_crm_cases_contact ON crm_cases(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_cases_status ON crm_cases(status);

CREATE INDEX IF NOT EXISTS idx_crm_documents_entity ON crm_documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_documents_contact ON crm_documents(contact_id);

CREATE INDEX IF NOT EXISTS idx_crm_audit_entity ON crm_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_audit_created ON crm_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_notifications_user ON crm_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_crm_notifications_created ON crm_notifications(created_at DESC);
