-- CRM Module Migration
-- Creates all tables needed for the CRM system

-- Leads table
CREATE TABLE IF NOT EXISTS crm_leads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  company VARCHAR(255),
  designation VARCHAR(255),
  country VARCHAR(100),
  industry VARCHAR(100),
  lead_source VARCHAR(100),
  campaign VARCHAR(255),
  product_interest TEXT,
  cloud_preference VARCHAR(50),
  edp_macc_status VARCHAR(100),
  budget VARCHAR(100),
  timeline VARCHAR(100),
  requirement TEXT,
  owner_id INTEGER REFERENCES users(id),
  score INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'New',
  priority VARCHAR(20) DEFAULT 'Medium',
  next_followup TIMESTAMP,
  notes TEXT,
  consent_status BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP,
  converted_to_account_id INTEGER,
  converted_to_contact_id INTEGER,
  converted_to_opportunity_id INTEGER,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Lead score history
CREATE TABLE IF NOT EXISTS crm_lead_score_history (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  old_score INTEGER,
  new_score INTEGER,
  changed_by INTEGER REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Accounts table
CREATE TABLE IF NOT EXISTS crm_accounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  industry VARCHAR(100),
  country VARCHAR(100),
  website VARCHAR(500),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  owner_id INTEGER REFERENCES users(id),
  annual_revenue DECIMAL(15,2),
  employee_count INTEGER,
  cloud_preference VARCHAR(50),
  edp_eligible BOOLEAN DEFAULT FALSE,
  macc_eligible BOOLEAN DEFAULT FALSE,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contacts table
CREATE TABLE IF NOT EXISTS crm_contacts (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES crm_accounts(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  designation VARCHAR(255),
  role VARCHAR(100),
  country VARCHAR(100),
  owner_id INTEGER REFERENCES users(id),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Opportunities table
CREATE TABLE IF NOT EXISTS crm_opportunities (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES crm_accounts(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  cloud VARCHAR(50),
  deal_value DECIMAL(15,2),
  neozaar_revenue DECIMAL(15,2),
  cost DECIMAL(15,2),
  margin DECIMAL(15,2),
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  stage VARCHAR(50) DEFAULT 'Discovery',
  forecast VARCHAR(50),
  budget VARCHAR(100),
  timeline VARCHAR(100),
  competition TEXT,
  private_offer_required BOOLEAN DEFAULT FALSE,
  edp_eligible BOOLEAN DEFAULT FALSE,
  macc_eligible BOOLEAN DEFAULT FALSE,
  poc_required BOOLEAN DEFAULT FALSE,
  proposal_status VARCHAR(50),
  next_action TEXT,
  win_loss_reason TEXT,
  notes TEXT,
  owner_id INTEGER REFERENCES users(id),
  score INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Opportunity stage history
CREATE TABLE IF NOT EXISTS crm_opportunity_stage_history (
  id SERIAL PRIMARY KEY,
  opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  old_stage VARCHAR(50),
  new_stage VARCHAR(50),
  changed_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Opportunity-Contact junction table
CREATE TABLE IF NOT EXISTS crm_opportunity_contacts (
  id SERIAL PRIMARY KEY,
  opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  UNIQUE(opportunity_id, contact_id)
);

-- Activities table
CREATE TABLE IF NOT EXISTS crm_activities (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  description TEXT,
  related_type VARCHAR(50),
  related_id INTEGER,
  owner_id INTEGER REFERENCES users(id),
  activity_date TIMESTAMP,
  duration_minutes INTEGER,
  outcome TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS crm_tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id INTEGER REFERENCES users(id),
  related_type VARCHAR(50),
  related_id INTEGER,
  priority VARCHAR(20) DEFAULT 'Medium',
  due_date TIMESTAMP,
  reminder_at TIMESTAMP,
  status VARCHAR(30) DEFAULT 'Open',
  completion_notes TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  is_escalated BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs table
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

-- Seller Assignments table
CREATE TABLE IF NOT EXISTS seller_assignments (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL,
  item_id INTEGER NOT NULL,
  assigned_by INTEGER REFERENCES users(id),
  allowed_types TEXT[],
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (seller_id, item_type, item_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner ON crm_leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_deleted ON crm_leads(is_deleted);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_owner ON crm_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_account ON crm_contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_account ON crm_opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_owner ON crm_tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_activities_related ON crm_activities(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_crm_audit_logs_entity ON crm_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_seller_assignments_seller ON seller_assignments(seller_id);


-- Add AGENT role to users table constraint (if not already present)
DO $$
BEGIN
  -- Drop and recreate the check constraint to include AGENT
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_role_type_check' AND table_name = 'users') THEN
    ALTER TABLE users DROP CONSTRAINT users_role_type_check;
  END IF;
  ALTER TABLE users ADD CONSTRAINT users_role_type_check
    CHECK (role_type::text = ANY (ARRAY['CLIENT','ISV','ADMIN','SUPER_ADMIN','ROLE_MANAGER','SUPPORT_PARTNER','COSELLER','USER','AGENT']::text[]));
END $$;


-- Add COSELLER and AGENT roles to the roles table (if not already present)
INSERT INTO roles (role_id, role_type) VALUES (6, 'COSELLER') ON CONFLICT (role_id) DO NOTHING;
INSERT INTO roles (role_id, role_type) VALUES (7, 'AGENT') ON CONFLICT (role_id) DO NOTHING;
INSERT INTO roles (role_id, role_type) VALUES (8, 'SUPPORT_PARTNER') ON CONFLICT (role_id) DO NOTHING;


-- Update lead_assigns enum to include COSELLER and AGENT
DO $$
BEGIN
  -- Add new enum values if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'COSELLER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_lead_assigns_assign_user_type')) THEN
    ALTER TYPE enum_lead_assigns_assign_user_type ADD VALUE IF NOT EXISTS 'COSELLER';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AGENT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_lead_assigns_assign_user_type')) THEN
    ALTER TYPE enum_lead_assigns_assign_user_type ADD VALUE IF NOT EXISTS 'AGENT';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If enum type doesn't exist or other issue, skip
  NULL;
END $$;
