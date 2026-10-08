const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fixScores() {
  try {
    // Add service_sub_options column to isv_details
    await pool.query(`
      ALTER TABLE isv_details ADD COLUMN IF NOT EXISTS service_sub_options JSONB DEFAULT NULL;
    `);
    console.log('✅ service_sub_options column ensured');

    // Sync all lead scores to their linked opportunities
    const result = await pool.query(`
      UPDATE crm_opportunities o
      SET score = l.score
      FROM crm_leads l
      WHERE o.lead_id = l.id
        AND o.is_deleted = FALSE
        AND l.is_deleted = FALSE
        AND (o.score IS NULL OR o.score != l.score);
    `);
    console.log(`✅ Opportunity scores synced from leads. Rows updated: ${result.rowCount}`);

    // Show current state
    const { rows } = await pool.query(`
      SELECT o.id, o.name, o.score as opp_score, o.stage, l.score as lead_score, l.name as lead_name
      FROM crm_opportunities o
      LEFT JOIN crm_leads l ON o.lead_id = l.id
      WHERE o.is_deleted = FALSE
      ORDER BY o.created_at DESC LIMIT 10
    `);
    console.log('\nOpportunities with scores:');
    rows.forEach(r => console.log(`  ${r.name} | Stage: ${r.stage} | Opp Score: ${r.opp_score} | Lead Score: ${r.lead_score}`));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixScores();
