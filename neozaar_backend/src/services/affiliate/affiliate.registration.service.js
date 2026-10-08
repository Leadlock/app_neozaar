// Attribution extends registration; CRM creation and scoring remain in the existing
// email-verification flow. No lead is created by a click or a database import.
const pool = require('../../config/database');

async function transaction(work, connection) {
  if (connection) return work(connection);
  const db = await pool.connect();
  try { await db.query('BEGIN'); const result = await work(db); await db.query('COMMIT'); return result; }
  catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}

async function audit(db, action, affiliateId, leadId, actorId, previous, value) {
  await db.query(`INSERT INTO affiliate_audit_log
    (actor_id,action,affiliate_id,entity_type,entity_id,previous_value,new_value)
    VALUES ($1,$2,$3,'crm_lead',$4,$5,$6)`,
  [actorId || null, action, affiliateId, leadId, JSON.stringify(previous || null), JSON.stringify(value)]);
}

// Called only with the newly created server-side user identity, never body.user_id.
async function captureRegistration(user, token) {
  if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return { action: 'unattributed' };
  return transaction(async db => {
    const { rows: users } = await db.query(`SELECT id FROM users WHERE id=$1 AND role_type='CLIENT' FOR UPDATE`, [user.id]);
    if (!users.length) return { action: 'unattributed' };
    const { rows: previous } = await db.query(`SELECT id FROM affiliate_attributions WHERE user_id=$1 AND status IN ('pending','active') LIMIT 1`, [user.id]);
    if (previous.length) return { action: 'existing' };
    const { rows } = await db.query(`SELECT t.*, l.utm_source, l.utm_medium, l.utm_campaign, l.catalog_id, l.catalog_type
      FROM affiliate_tokens t JOIN users a ON a.id=t.affiliate_id
      LEFT JOIN affiliate_links l ON l.id=t.link_id
      WHERE t.token=$1 AND NOT t.consumed AND t.expires_at>NOW()
        AND a.is_active=TRUE AND a.role_type IN ('AGENT','A_MANAGER')
        AND (t.link_id IS NULL OR l.is_active=TRUE)
      FOR UPDATE OF t`, [token]);
    if (!rows.length) return { action: 'unattributed' };
    const t = rows[0];
    await db.query(`INSERT INTO affiliate_attributions
      (affiliate_id,user_id,affiliate_link_id,campaign_id,contact_id,attribution_type,utm_source,utm_medium,utm_campaign,status,metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10)`,
    [t.affiliate_id,user.id,t.link_id,t.campaign_id,t.contact_id,t.campaign_id ? 'email_campaign' : 'utm_link',
      t.utm_source,t.utm_medium || (t.campaign_id ? 'email' : 'referral'),t.utm_campaign,
      JSON.stringify({ catalog_id: t.catalog_id, catalog_type: t.catalog_type })]);
    await db.query(`UPDATE affiliate_tokens SET consumed=TRUE,consumed_at=NOW() WHERE token=$1`, [token]);
    await audit(db,'registration_attribution_saved',t.affiliate_id,null,user.id,null,{ status: 'pending' });
    return { action: 'pending' };
  });
}

// The caller's verification transaction already owns the user and creates/reuses
// the CRM lead. Lock that lead to serialize competing affiliate acquisitions.
async function completeRegistration(user, leadId, connection) {
  return transaction(async db => {
    const { rows: leads } = await db.query(`SELECT id,affiliate_id FROM crm_leads WHERE id=$1 AND is_deleted=FALSE FOR UPDATE`, [leadId]);
    if (!leads.length) throw new Error('CRM customer not found');
    const { rows: pending } = await db.query(`SELECT * FROM affiliate_attributions WHERE user_id=$1 AND status='pending' ORDER BY id FOR UPDATE`, [user.id]);
    if (!pending.length) return { action: 'unchanged' };
    const p = pending[0];
    const { rows: active } = await db.query(`SELECT * FROM affiliate_attributions WHERE crm_lead_id=$1 AND status='active' ORDER BY id LIMIT 1`, [leadId]);
    const existingAffiliate = active[0]?.affiliate_id || leads[0].affiliate_id;
    // Acquisition is immutable. Reassignment is a separate, audited manager action.
    if (existingAffiliate && Number(existingAffiliate) !== Number(p.affiliate_id)) {
      await db.query(`UPDATE affiliate_attributions SET crm_lead_id=$1,status='conflict',conflict_notes=$2 WHERE id=$3`,
        [leadId,`Existing affiliate ${existingAffiliate} retained`,p.id]);
      await audit(db,'attribution_conflict',p.affiliate_id,leadId,user.id,{ affiliate_id: existingAffiliate },{ attempted_affiliate_id: p.affiliate_id });
      return { action: 'conflict' };
    }
    await db.query(`UPDATE affiliate_attributions SET crm_lead_id=$1,status=$2 WHERE id=$3`,
      [leadId,active.length ? 'superseded' : 'active',p.id]);
    await db.query(`UPDATE crm_leads SET affiliate_id=COALESCE(affiliate_id,$1) WHERE id=$2`, [p.affiliate_id,leadId]);
    // Existing opportunities retain their history; fill only missing attribution.
    await db.query(`UPDATE crm_opportunities SET affiliate_id=$1 WHERE lead_id=$2 AND affiliate_id IS NULL AND is_deleted=FALSE`, [p.affiliate_id,leadId]);
    if (p.campaign_id && p.contact_id) {
      // A forwarded email may acquire another customer, but must not mark the
      // original recipient registered or reveal that customer's CRM identity.
      const { rows: contacts } = await db.query(`UPDATE affiliate_contacts SET status='registered',crm_lead_id=$1,user_id=$2,updated_at=NOW()
        WHERE id=$3 AND affiliate_id=$4 AND LOWER(TRIM(email))=LOWER(TRIM($5)) RETURNING id`,
        [leadId,user.id,p.contact_id,p.affiliate_id,user.email]);
      if (contacts.length) {
        await db.query(`UPDATE affiliate_campaign_sends SET registered=TRUE,registered_at=COALESCE(registered_at,NOW())
          WHERE campaign_id=$1 AND contact_id=$2 AND affiliate_id=$3`, [p.campaign_id,p.contact_id,p.affiliate_id]);
        await db.query(`UPDATE affiliate_campaigns SET registered_count=(SELECT COUNT(*) FROM affiliate_campaign_sends WHERE campaign_id=$1 AND registered=TRUE) WHERE id=$1`, [p.campaign_id]);
      }
    }
    await audit(db,'customer_attributed',p.affiliate_id,leadId,user.id,null,{ attribution_id: p.id });
    return { action: 'attributed', affiliateId: p.affiliate_id };
  },connection);
}

async function reassignCustomer({ leadId, affiliateId, previousAffiliateId, actorId, reason }) {
  if (!reason?.trim()) { const e = new Error('A reassignment reason is required'); e.status = 400; throw e; }
  return transaction(async db => {
    const { rows: target } = await db.query(`SELECT id FROM users WHERE id=$1 AND is_active=TRUE AND role_type IN ('AGENT','A_MANAGER')`, [affiliateId]);
    const { rows: leads } = await db.query(`SELECT affiliate_id FROM crm_leads WHERE id=$1 AND is_deleted=FALSE FOR UPDATE`, [leadId]);
    if (!target.length || !leads.length || Number(leads[0].affiliate_id) !== Number(previousAffiliateId)) {
      const e = new Error('Affiliate/customer not found or attribution changed; refresh before reassigning'); e.status = 409; throw e;
    }
    await db.query(`UPDATE affiliate_attributions SET status=CASE WHEN status='active' THEN 'superseded' ELSE 'rejected' END,resolved_by=$2,resolved_at=NOW() WHERE crm_lead_id=$1 AND status IN ('active','conflict')`, [leadId,actorId]);
    await db.query(`INSERT INTO affiliate_attributions (affiliate_id,crm_lead_id,attribution_type,status,metadata,resolved_by,resolved_at)
      VALUES ($1,$2,'manual_assignment','active',$3,$4,NOW())`, [affiliateId,leadId,JSON.stringify({ reason }),actorId]);
    await db.query(`UPDATE crm_leads SET affiliate_id=$1 WHERE id=$2`, [affiliateId,leadId]);
    await db.query(`UPDATE crm_opportunities SET affiliate_id=$1 WHERE lead_id=$2 AND stage NOT IN ('Closed Won','Closed Lost') AND is_deleted=FALSE`, [affiliateId,leadId]);
    await audit(db,'customer_reassigned',affiliateId,leadId,actorId,{ affiliate_id: leads[0].affiliate_id },{ affiliate_id: affiliateId,reason });
  });
}
module.exports = { captureRegistration, completeRegistration, reassignCustomer };
