require('dotenv').config();

const pool = require('../config/database');

/**
 * Diagnostic companion to 027_repair_cta_opportunity.js
 *
 * Lists submitted CTA leads (lead_details.type IN ('demo','private_offer'))
 * whose CRM opportunity was never created — i.e. no crm_opportunities row
 * exists for that customer email x product x lead_source.
 *
 * Read-only. Prints a table of lead_details.id values you can then feed to:
 *   node src/migrations/027_repair_cta_opportunity.js <lead_details_id>
 *
 * Usage:
 *   node src/migrations/027_find_orphan_cta_opportunities.js [--days N] [--json]
 */

async function main() {
  const args = process.argv.slice(2);
  const daysIdx = args.indexOf('--days');
  const days = daysIdx !== -1 ? Number(args[daysIdx + 1]) : null;
  const asJson = args.includes('--json');

  const params = [];
  let dateFilter = '';
  if (Number.isInteger(days) && days > 0) {
    params.push(days);
    dateFilter = `AND ld.created_at >= NOW() - ($${params.length} || ' days')::interval`;
  }

  const { rows } = await pool.query(
    `
    SELECT
      ld.id                AS lead_details_id,
      ld.type              AS lead_type,
      ld.created_at,
      u.id                 AS user_id,
      u.email,
      p.id                 AS product_id,
      p.name               AS product_name,
      cl.id                AS crm_lead_id,
      CASE
        WHEN ld.type = 'private_offer' THEN 'Private Offer Button'
        ELSE 'Demo Request'
      END                  AS lead_source
    FROM lead_details ld
    JOIN users u    ON u.id = ld.user_id
    JOIN products p ON p.id = ld.action_id
    LEFT JOIN crm_leads cl
      ON cl.email_normalized = LOWER(TRIM(u.email))
     AND cl.is_deleted = FALSE
    WHERE ld.type IN ('demo', 'private_offer')
      ${dateFilter}
      AND NOT EXISTS (
        SELECT 1
        FROM crm_opportunities co
        WHERE co.lead_id = cl.id
          AND co.type = p.name
          AND co.notes ILIKE '%Source: ' ||
              CASE WHEN ld.type = 'private_offer'
                   THEN 'Private Offer Button'
                   ELSE 'Demo Request' END || '%'
      )
    ORDER BY ld.created_at DESC
    `,
    params
  );

  if (asJson) {
    console.log(JSON.stringify(rows, null, 2));
  } else if (!rows.length) {
    console.log('No orphaned CTA leads found. Every demo/private_offer lead has a matching opportunity.');
  } else {
    console.log(`Found ${rows.length} orphaned CTA lead(s) with no CRM opportunity:\n`);
    console.table(rows.map(r => ({
      lead_details_id: r.lead_details_id,
      type: r.lead_type,
      email: r.email,
      product: r.product_name,
      crm_lead: r.crm_lead_id || '(none)',
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    })));
    console.log('\nRepair each with:');
    for (const r of rows) {
      console.log(`  node src/migrations/027_repair_cta_opportunity.js ${r.lead_details_id}`);
    }
  }
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
