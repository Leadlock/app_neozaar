/**
 * Migration: CRM DB Integrity Constraints
 *
 * 1. crm_leads        — email_normalized generated column + partial unique index
 * 2. crm_accounts     — email_normalized generated column + partial unique index
 * 3. crm_contacts     — email_normalized generated column + partial unique index
 * 4. crm_sales_orders — unique constraint on order_number
 * 5. crm_lead_score_history — idempotency_key column + index
 * 6. crm_leads        — conversion_source column (for precedence tracking)
 *
 * All operations use IF NOT EXISTS / DO NOTHING so re-running is safe.
 */
require('dotenv').config();
const pool = require('../config/database');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. crm_leads ─────────────────────────────────────────────────────────

    // email_normalized: stored generated column (LOWER(TRIM(email)))
    // Used by ON CONFLICT upserts in public routes and scoring controller.
    await client.query(`
      ALTER TABLE crm_leads
        ADD COLUMN IF NOT EXISTS email_normalized TEXT
          GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED
    `);
    console.log('crm_leads.email_normalized: OK');

    // Partial unique index: one active lead per email
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_leads_email_active
        ON crm_leads (email_normalized)
        WHERE is_deleted = FALSE
    `);
    console.log('crm_leads unique index on email_normalized: OK');

    // conversion_source column — stores which trigger converted this lead
    await client.query(`
      ALTER TABLE crm_leads
        ADD COLUMN IF NOT EXISTS conversion_source VARCHAR(30) NULL
    `);
    console.log('crm_leads.conversion_source: OK');

    // ── 2. crm_accounts ──────────────────────────────────────────────────────

    await client.query(`
      ALTER TABLE crm_accounts
        ADD COLUMN IF NOT EXISTS email_normalized TEXT
          GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED
    `);
    console.log('crm_accounts.email_normalized: OK');

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_accounts_email_active
        ON crm_accounts (email_normalized)
        WHERE is_deleted = FALSE
    `);
    console.log('crm_accounts unique index on email_normalized: OK');

    // ── 3. crm_contacts ──────────────────────────────────────────────────────

    await client.query(`
      ALTER TABLE crm_contacts
        ADD COLUMN IF NOT EXISTS email_normalized TEXT
          GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED
    `);
    console.log('crm_contacts.email_normalized: OK');

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_contacts_email_active
        ON crm_contacts (email_normalized)
        WHERE is_deleted = FALSE
    `);
    console.log('crm_contacts unique index on email_normalized: OK');

    // ── 4. crm_sales_orders — unique order_number ─────────────────────────

    // Ensure table exists first (quotes controller creates it lazily)
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_sales_orders (
        id           SERIAL PRIMARY KEY,
        quote_id     INTEGER,
        opportunity_id INTEGER,
        contact_id   INTEGER,
        order_number VARCHAR(60) NOT NULL,
        items        JSONB DEFAULT '[]',
        subtotal     DECIMAL(15,2) DEFAULT 0,
        discount     DECIMAL(15,2) DEFAULT 0,
        tax          DECIMAL(15,2) DEFAULT 0,
        total        DECIMAL(15,2) DEFAULT 0,
        owner_id     INTEGER,
        created_by   INTEGER,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_sales_orders_order_number
        ON crm_sales_orders (order_number)
    `);
    console.log('crm_sales_orders unique index on order_number: OK');

    // ── 5. crm_lead_score_history — idempotency_key ───────────────────────

    await client.query(`
      ALTER TABLE crm_lead_score_history
        ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128) NULL
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_lead_score_history_idempotency
        ON crm_lead_score_history (lead_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL
    `);
    console.log('crm_lead_score_history.idempotency_key: OK');

    // ── 6. crm_opportunities — customer_score_at_conversion / converted_at ─

    await client.query(`
      ALTER TABLE crm_opportunities
        ADD COLUMN IF NOT EXISTS customer_score_at_conversion INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS conversion_source VARCHAR(30) NULL,
        ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS follow_up_status VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP NULL
    `);
    console.log('crm_opportunities reporting columns: OK');

    // ── 7. crm_opportunity_stage_history — old_score/new_score columns ─────

    await client.query(`
      ALTER TABLE crm_opportunity_stage_history
        ADD COLUMN IF NOT EXISTS old_score INTEGER NULL,
        ADD COLUMN IF NOT EXISTS new_score INTEGER NULL,
        ADD COLUMN IF NOT EXISTS win_loss_reason TEXT NULL
    `);
    console.log('crm_opportunity_stage_history score columns: OK');

    // ── 8. crm_leads — converted_at column ───────────────────────────────

    await client.query(`
      ALTER TABLE crm_leads
        ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP NULL
    `);
    console.log('crm_leads.converted_at: OK');

    await client.query('COMMIT');
    console.log('\n✅ All CRM integrity migrations applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
