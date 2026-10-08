-- ============================================================
-- NeoZaar CRM v2 — Complete Interconnected Schema
-- Flow: Lead → Contact → Opportunity → Quote → Sales Order → Invoice → Support
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. CONTACTS (Central entity — everything links here)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_contacts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  company VARCHAR(255),
  designation VARCHAR(255),
  country VARCHAR(100),
  industry VARCHAR(100),
  website VARCHAR(500),
  type VARCHAR(30) DEFAULT 'lead', -- lead, prospect, customer, partner
  owner_id INTEGER REFERENCES users(id),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 2. LEADS (Entry point — linked to contact)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_leads (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES crm_contacts(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  company VARCHAR(255),
  designation VARCHAR(255),
  country VARCHAR(100),
  industry VARCHAR(100),
  -- Source tracking
  lead_source VARCHAR(100), -- Manual, Website Contact, Marketplace Inquiry, Product Inquiry, Service Inquiry, Solution Inquiry, Import CSV, API, Email Capture
  campaign VARCHAR(255),
  product_interest TEXT,
  cloud_preference VARCHAR(50),
  -- Scoring
  score INTEGER DEFAULT 0,
  score_label VARCHAR(20) DEFAULT 'Cold', -- Cold, Warm, Qualified, Hot
  -- Stage (pipeline position)
  stage VARCHAR(50) DEFAULT 'New Lead', -- New Lead, Contacted, Meeting Scheduled, Requirements Gathered, Proposal Sent, Negotiation, Decision Pending, Won, Lost
  -- Status
  status VARCHAR(50) DEFAULT 'New',
  priority VARCHAR(20) DEFAULT 'Medium',
  -- Revenue
  expected_revenue DECIMAL(15,2) DEFAULT 0,
  probability INTEGER DEFAULT 0,
  -- Assignment
  owner_id INTEGER REFERENCES users(id),
  -- Dates
  next_followup TIMESTAMP,
  expected_close_date DATE,
  -- Conversion
  converted_at TIMESTAMP,
  converted_to_opportunity_id INTEGER,
  -- Loss
  loss_reason VARCHAR(100),
  loss_notes TEXT,
  -- Meta
  budget VARCHAR(100),
  timeline VARCHAR(100),
  requirement TEXT,
  notes TEXT,
  consent_status BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 3. LEAD SCORING HISTORY
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_lead_score_history (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  old_score INTEGER,
  new_score INTEGER,
  reason VARCHAR(255), -- Downloaded brochure, Requested Demo, Opened Email, etc.
  points INTEGER, -- +10, -15, etc.
  changed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 4. OPPORTUNITIES (Qualified leads become opportunities)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_opportunities (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES crm_contacts(id),
  lead_id INTEGER REFERENCES crm_leads(id),
  name VARCHAR(255) NOT NULL,
  -- Stage
  stage VARCHAR(50) DEFAULT 'New Lead',
  probability INTEGER DEFAULT 0,
  -- Revenue
  deal_value DECIMAL(15,2) DEFAULT 0,
  expected_revenue DECIMAL(15,2) DEFAULT 0,
  neozaar_revenue DECIMAL(15,2) DEFAULT 0,
  -- Details
  type VARCHAR(100),
  cloud VARCHAR(50),
  budget VARCHAR(100),
  timeline VARCHAR(100),
  competition TEXT,
  expected_close_date DATE,
  -- Flags
  private_offer_required BOOLEAN DEFAULT FALSE,
  edp_eligible BOOLEAN DEFAULT FALSE,
  macc_eligible BOOLEAN DEFAULT FALSE,
  poc_required BOOLEAN DEFAULT FALSE,
  -- Win/Loss
  win_loss_reason VARCHAR(255),
  win_loss_notes TEXT,
  -- Next action
  next_action TEXT,
  next_followup TIMESTAMP,
  -- Assignment
  owner_id INTEGER REFERENCES users(id),
  -- seller_id: SELLER actively pursuing the deal.
  -- Set to created_by when a SELLER creates directly; set by M_SELLER via assign-seller.
  -- Visibility rule: SELLER sees opps WHERE seller_id = their id OR created_by = their id.
  seller_id INTEGER REFERENCES users(id),
  seller_assigned_at TIMESTAMP,
  seller_assigned_by INTEGER REFERENCES users(id),
  affiliate_id INTEGER REFERENCES users(id),
  -- Meta
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 5. OPPORTUNITY STAGE HISTORY
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_opportunity_stage_history (
  id SERIAL PRIMARY KEY,
  opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  old_stage VARCHAR(50),
  new_stage VARCHAR(50),
  changed_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 6. QUOTES (Generated from Opportunity)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_quotes (
  id SERIAL PRIMARY KEY,
  opportunity_id INTEGER REFERENCES crm_opportunities(id),
  contact_id INTEGER REFERENCES crm_contacts(id),
  quote_number VARCHAR(50) UNIQUE,
  subject VARCHAR(255),
  -- Line items stored as JSONB array
  items JSONB DEFAULT '[]', -- [{product_id, name, qty, unit_price, discount, tax, total}]
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  -- Terms
  valid_until DATE,
  terms TEXT,
  notes TEXT,
  -- Status
  status VARCHAR(30) DEFAULT 'Draft', -- Draft, Sent, Viewed, Accepted, Rejected, Expired
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  -- Assignment
  owner_id INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 7. SALES ORDERS (Generated from accepted Quote)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_sales_orders (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER REFERENCES crm_quotes(id),
  opportunity_id INTEGER REFERENCES crm_opportunities(id),
  contact_id INTEGER REFERENCES crm_contacts(id),
  order_number VARCHAR(50) UNIQUE,
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  -- Status
  status VARCHAR(30) DEFAULT 'Pending', -- Pending, Processing, Completed, Cancelled
  -- Dates
  order_date DATE DEFAULT CURRENT_DATE,
  delivery_date DATE,
  -- Assignment
  owner_id INTEGER REFERENCES users(id),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 8. INVOICES (Generated from Sales Order or Opportunity)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_invoices (
  id SERIAL PRIMARY KEY,
  sales_order_id INTEGER REFERENCES crm_sales_orders(id),
  opportunity_id INTEGER REFERENCES crm_opportunities(id),
  contact_id INTEGER REFERENCES crm_contacts(id),
  invoice_number VARCHAR(50) UNIQUE,
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  amount_due DECIMAL(15,2) DEFAULT 0,
  -- Status
  status VARCHAR(30) DEFAULT 'Draft', -- Draft, Sent, Paid, Partial, Overdue, Cancelled
  -- Dates
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_at TIMESTAMP,
  -- Assignment
  owner_id INTEGER REFERENCES users(id),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 9. ACTIVITIES (Unified timeline for everything)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_activities (
  id SERIAL PRIMARY KEY,
  -- Polymorphic link
  entity_type VARCHAR(30) NOT NULL, -- lead, contact, opportunity, quote, order, invoice, case
  entity_id INTEGER NOT NULL,
  -- Also link to contact for unified timeline
  contact_id INTEGER REFERENCES crm_contacts(id),
  -- Activity details
  type VARCHAR(50) NOT NULL, -- call, email, meeting, task, note, stage_change, score_change, quote_created, invoice_generated, document_uploaded, case_opened
  subject VARCHAR(255),
  description TEXT,
  outcome TEXT,
  -- Timing
  activity_date TIMESTAMP DEFAULT NOW(),
  duration_minutes INTEGER,
  -- Assignment
  owner_id INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 10. TASKS (Linked to opportunities, leads, contacts)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_tasks (
  id SERIAL PRIMARY KEY,
  -- Polymorphic link
  entity_type VARCHAR(30), -- lead, contact, opportunity, quote, order, invoice, case
  entity_id INTEGER,
  contact_id INTEGER REFERENCES crm_contacts(id),
  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'Medium', -- Low, Medium, High, Urgent
  status VARCHAR(30) DEFAULT 'Open', -- Open, InProgress, Completed, Cancelled, Overdue
  -- Dates
  due_date TIMESTAMP,
  reminder_at TIMESTAMP,
  completed_at TIMESTAMP,
  completion_notes TEXT,
  -- Assignment
  owner_id INTEGER REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 11. SUPPORT CASES (Linked to contact, opportunity, invoice, product)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_cases (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES crm_contacts(id),
  opportunity_id INTEGER REFERENCES crm_opportunities(id),
  invoice_id INTEGER REFERENCES crm_invoices(id),
  -- Case details
  case_number VARCHAR(50) UNIQUE,
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'Medium',
  status VARCHAR(30) DEFAULT 'Open', -- Open, Assigned, Waiting, Resolved, Closed
  resolution TEXT,
  -- Assignment
  owner_id INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 12. DOCUMENTS (Attached to any entity)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_documents (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(30) NOT NULL, -- lead, contact, opportunity, quote, order, invoice, case
  entity_id INTEGER NOT NULL,
  contact_id INTEGER REFERENCES crm_contacts(id),
  -- File info
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  -- Meta
  description TEXT,
  version INTEGER DEFAULT 1,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 13. AUDIT LOGS (Every action tracked)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 14. NOTIFICATIONS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- lead_assigned, meeting_due, task_overdue, quote_accepted, invoice_paid, opportunity_won, case_assigned
  title VARCHAR(255) NOT NULL,
  message TEXT,
  entity_type VARCHAR(30),
  entity_id INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 15. CRM ROLES & PERMISSIONS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES crm_roles(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- ══════════════════════════════════════════════════════════════
-- 16. AUTOMATION RULES
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_automation_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  trigger_event VARCHAR(100) NOT NULL, -- score_threshold, stage_change, quote_accepted, overdue_followup, invoice_paid
  trigger_config JSONB DEFAULT '{}', -- {threshold: 70, stage: 'Won', days_overdue: 3}
  action_type VARCHAR(100) NOT NULL, -- create_opportunity, create_task, send_notification, update_stage, create_order, create_invoice
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
