/**
 * CRM v2 Migration Runner
 * Run: node src/migrations/run_crm_v2.js
 * 
 * This creates the complete interconnected CRM schema.
 * Flow: Lead → Contact → Opportunity → Quote → Sales Order → Invoice → Support
 */
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting CRM v2 migration...\n');

    // 1. Run schema
    const schema = fs.readFileSync(path.join(__dirname, 'crm_v2_full_schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ All tables created (Contacts, Leads, Opportunities, Quotes, Sales Orders, Invoices, Activities, Tasks, Cases, Documents, Notifications, Roles, Automation Rules)');

    // 2. Run indexes (skip errors for already-existing or mismatched columns)
    try {
      const indexes = fs.readFileSync(path.join(__dirname, 'crm_v2_indexes.sql'), 'utf8');
      await client.query(indexes);
      console.log('✅ Performance indexes created');
    } catch (indexErr) {
      console.log('⚠️  Some indexes skipped (non-critical):', indexErr.message);
    }

    // 3. Seed default roles
    await client.query(`
      INSERT INTO crm_roles (name, description, permissions, is_system) VALUES
      ('Admin', 'Full CRM access', '["*"]', TRUE),
      ('Sales Manager', 'Manage sales team, leads, opportunities, quotes', '["crm.dashboard","crm.leads.*","crm.contacts.*","crm.opportunities.*","crm.quotes.*","crm.orders.*","crm.invoices.*","crm.tasks.*","crm.activities.*","crm.documents.*"]', TRUE),
      ('Sales Executive', 'Own leads and opportunities, create quotes', '["crm.dashboard","crm.leads.view","crm.leads.edit","crm.contacts.view","crm.contacts.edit","crm.opportunities.view","crm.opportunities.edit","crm.quotes.view","crm.quotes.create","crm.tasks.*","crm.activities.*","crm.documents.view","crm.documents.upload"]', TRUE),
      ('Support Agent', 'Handle support cases, view customer info', '["crm.dashboard","crm.contacts.view","crm.cases.*","crm.documents.*","crm.activities.view","crm.activities.create"]', TRUE),
      ('Finance', 'Manage invoices and payments', '["crm.dashboard","crm.invoices.*","crm.orders.view","crm.quotes.view","crm.contacts.view"]', TRUE),
      ('Marketing', 'View leads and scoring, manage campaigns', '["crm.dashboard","crm.leads.view","crm.contacts.view","crm.activities.view"]', TRUE),
      ('Viewer', 'Read-only access', '["crm.dashboard","crm.leads.view","crm.contacts.view","crm.opportunities.view","crm.quotes.view","crm.cases.view"]', TRUE)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Default roles seeded (Admin, Sales Manager, Sales Executive, Support, Finance, Marketing, Viewer)');

    // 4. Seed automation rules
    await client.query(`
      INSERT INTO crm_automation_rules (name, trigger_event, trigger_config, action_type, action_config) VALUES
      ('Auto-convert hot leads', 'score_threshold', '{"threshold": 70}', 'create_opportunity', '{"stage": "New Lead"}'),
      ('Overdue follow-up reminder', 'overdue_followup', '{"days_overdue": 3}', 'send_notification', '{"type": "task_overdue"}'),
      ('Quote accepted → Sales Order', 'quote_accepted', '{}', 'create_order', '{}'),
      ('Sales Order → Invoice', 'order_completed', '{}', 'create_invoice', '{}'),
      ('Opportunity Won → Customer', 'stage_change', '{"stage": "Won"}', 'update_contact', '{"type": "customer"}')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Automation rules seeded');

    // 5. Ensure platform roles exist in roles table
    await client.query(`
      INSERT INTO roles (role_id, role_type) VALUES (6, 'ISV_SELLER') ON CONFLICT (role_id) DO NOTHING;
      INSERT INTO roles (role_id, role_type) VALUES (7, 'AGENT') ON CONFLICT (role_id) DO NOTHING;
      INSERT INTO roles (role_id, role_type) VALUES (8, 'SUPPORT_PARTNER') ON CONFLICT (role_id) DO NOTHING;
    `);
    console.log('✅ Platform roles ensured (ISV_SELLER, AGENT, SUPPORT_PARTNER)');

    // 6. Update users table constraint to allow all role types
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_role_type_check' AND table_name = 'users') THEN
          ALTER TABLE users DROP CONSTRAINT users_role_type_check;
        END IF;
        ALTER TABLE users ADD CONSTRAINT users_role_type_check
          CHECK (role_type::text = ANY (ARRAY['CLIENT','ISV','ADMIN','SUPER_ADMIN','ROLE_MANAGER','SUPPORT_PARTNER','ISV_SELLER','USER','AGENT']::text[]));
      END $$;
    `);
    console.log('✅ Users role_type constraint updated (added AGENT)');

    console.log('\n🎉 CRM v2 migration complete!');
    console.log('\n📋 Tables created:');
    console.log('   • crm_contacts (central entity)');
    console.log('   • crm_leads (with scoring & stages)');
    console.log('   • crm_lead_score_history');
    console.log('   • crm_opportunities (with stage history)');
    console.log('   • crm_opportunity_stage_history');
    console.log('   • crm_quotes');
    console.log('   • crm_sales_orders');
    console.log('   • crm_invoices');
    console.log('   • crm_activities (unified timeline)');
    console.log('   • crm_tasks');
    console.log('   • crm_cases (support)');
    console.log('   • crm_documents');
    console.log('   • crm_audit_logs');
    console.log('   • crm_notifications');
    console.log('   • crm_roles + crm_user_roles');
    console.log('   • crm_automation_rules');
    console.log('\n🔗 Relationships:');
    console.log('   Lead → Contact → Opportunity → Quote → Sales Order → Invoice');
    console.log('   Opportunity → Tasks, Activities, Documents');
    console.log('   Contact → Support Cases, Timeline');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
