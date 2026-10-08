require('dotenv').config();

const pool = require('../config/database');
const { createProductOpportunity } = require('../controllers/crm/lifecycle.engine');

async function main() {
  const legacyLeadId = Number(process.argv[2]);
  if (!Number.isInteger(legacyLeadId) || legacyLeadId <= 0) {
    throw new Error('Usage: node src/migrations/027_repair_cta_opportunity.js <lead_details_id>');
  }

  const { rows } = await pool.query(
    `SELECT ld.id, ld.action_id, ld.type AS lead_type,
            u.id AS user_id, u.name AS user_name, u.email, u.mobile,
            p.name AS product_name
       FROM lead_details ld
       JOIN users u ON u.id=ld.user_id
       JOIN products p ON p.id=ld.action_id
      WHERE ld.id=$1`,
    [legacyLeadId]
  );
  if (!rows.length) throw new Error('Submitted CTA lead was not found');
  const submitted = rows[0];

  const { rows: sellers } = await pool.query(
    "SELECT id FROM users WHERE role_type='M_SELLER' AND is_active=true ORDER BY id LIMIT 1"
  );
  const ownerId = sellers[0]?.id || null;
  const leadSource = submitted.lead_type === 'private_offer'
    ? 'Private Offer Button'
    : 'Demo Request';

  const { rows: crmRows } = await pool.query(
    `INSERT INTO crm_leads
       (name,email,phone,lead_source,product_interest,status,lead_stage,score,
        owner_id,affiliate_id,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,'New','New Inquiry',0,$6,NULL,NOW(),NOW())
     ON CONFLICT (email_normalized)
       WHERE is_deleted=FALSE
         AND email_normalized IS NOT NULL
         AND email_normalized <> ''
     DO UPDATE SET
       product_interest=EXCLUDED.product_interest,
       owner_id=COALESCE(crm_leads.owner_id,EXCLUDED.owner_id),
       updated_at=NOW()
     RETURNING *`,
    [submitted.user_name || submitted.email, submitted.email, submitted.mobile || null,
      leadSource, submitted.product_name, ownerId]
  );
  const crmLead = crmRows[0];
  const affiliateId = crmLead.affiliate_id || null;

  const opportunityId = await createProductOpportunity({
    leadId: crmLead.id,
    ownerId,
    affiliateId,
    productName: submitted.product_name,
    productId: submitted.action_id,
    leadSource,
    conversionSource: affiliateId ? 'affiliate_cta' : 'direct_cta',
    lead: crmLead,
  });

  console.log(JSON.stringify({
    repaired: true,
    legacyLeadId,
    crmLeadId: crmLead.id,
    opportunityId,
    affiliatePreserved: Boolean(affiliateId),
  }));
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
