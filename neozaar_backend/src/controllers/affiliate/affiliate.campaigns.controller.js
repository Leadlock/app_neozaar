/**
 * Affiliate Campaigns Controller
 * ─────────────────────────────────────────────────────────────
 * Email campaigns to affiliate contact databases.
 *
 * Every campaign email contains a unique attribution token
 * so registrations from the campaign are reliably attributed.
 */
const pool   = require('../../config/database');
const crypto = require('crypto');
const {
  createAttributionToken,
  affiliateAuditLog,
} = require('../../services/affiliate/affiliate.attribution.service');

// ── GET /api/affiliate/campaigns ─────────────────────────────────
const getCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    params.push(req.affiliateScopeId);
    conditions.push(`($${params.length}::int IS NULL OR ac.affiliate_id = $${params.length})`);

    if (status) { params.push(status); conditions.push(`ac.status = $${params.length}`); }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT ac.*, u.name AS affiliate_name
       FROM affiliate_campaigns ac
       LEFT JOIN users u ON u.id = ac.affiliate_id
       WHERE ${where}
       ORDER BY ac.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    res.json({ status: 'success', data: rows });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── GET /api/affiliate/campaigns/:id ─────────────────────────────
const getCampaignById = async (req, res) => {
  try {
    const affiliateId = req.affiliateScopeId;
    const { rows } = await pool.query(
      `SELECT ac.*, u.name AS affiliate_name
       FROM affiliate_campaigns ac
       LEFT JOIN users u ON u.id = ac.affiliate_id
       WHERE ac.id=$1 AND ($2::int IS NULL OR ac.affiliate_id=$2)`,
      [req.params.id, affiliateId]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Campaign not found' });
    res.json({ status: 'success', data: rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── POST /api/affiliate/campaigns ────────────────────────────────
const createCampaign = async (req, res) => {
  try {
    const affiliateId = req.affiliateScopeId || req.user.id;
    const { name, subject, body_html, body_text, affiliate_link_id } = req.body;
    if (affiliate_link_id) {
      const {rows: links}=await pool.query('SELECT id FROM affiliate_links WHERE id=$1 AND affiliate_id=$2 AND is_active=TRUE',[affiliate_link_id,affiliateId]);
      if (!links.length) return res.status(400).json({status:'fail',message:'Select an active link belonging to this affiliate'});
    }
    if (!name || !subject) {
      return res.status(400).json({ status: 'fail', message: 'name and subject are required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO affiliate_campaigns
         (affiliate_id, name, subject, body_html, body_text, affiliate_link_id, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'draft',$7)
       RETURNING *`,
      [affiliateId, name, subject, body_html || null, body_text || null,
       affiliate_link_id || null, req.user.id]
    );

    affiliateAuditLog({
      actorId: req.user.id,
      action: 'campaign_created',
      affiliateId,
      entityType: 'affiliate_campaign',
      entityId: rows[0].id,
      newValue: { name, subject },
    });

    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── PUT /api/affiliate/campaigns/:id ─────────────────────────────
const updateCampaign = async (req, res) => {
  try {
    const affiliateId = req.affiliateScopeId || req.user.id;
    const { name, subject, body_html, body_text, affiliate_link_id } = req.body;
    if (affiliate_link_id) {
      const {rows: links}=await pool.query('SELECT id FROM affiliate_links WHERE id=$1 AND affiliate_id=$2 AND is_active=TRUE',[affiliate_link_id,affiliateId]);
      if (!links.length) return res.status(400).json({status:'fail',message:'Select an active link belonging to this affiliate'});
    }

    const { rows } = await pool.query(
      `UPDATE affiliate_campaigns
       SET name=COALESCE($1,name), subject=COALESCE($2,subject),
           body_html=COALESCE($3,body_html), body_text=COALESCE($4,body_text),
           affiliate_link_id=COALESCE($5,affiliate_link_id), updated_at=NOW()
       WHERE id=$6 AND affiliate_id=$7 AND status='draft'
       RETURNING *`,
      [name||null, subject||null, body_html||null, body_text||null,
       affiliate_link_id||null, req.params.id, affiliateId]
    );
    if (!rows.length) {
      return res.status(404).json({ status: 'fail', message: 'Campaign not found or already sent' });
    }
    res.json({ status: 'success', data: rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── POST /api/affiliate/campaigns/:id/send ───────────────────────
// Send the campaign to all contacts or a selected subset.
// Creates a send record + unique attribution token per contact.
const sendCampaign = async (req, res) => {
  let claimedId;
  try {
    const { contact_ids } = req.body;
    if (contact_ids !== undefined && (!Array.isArray(contact_ids) || !contact_ids.length || contact_ids.some(id => !Number.isSafeInteger(id) || id <= 0))) {
      return res.status(400).json({ status: 'fail', message: 'Select valid contacts' });
    }
    const { rows: campaigns } = await pool.query(`SELECT * FROM affiliate_campaigns WHERE id=$1 AND ($2::int IS NULL OR affiliate_id=$2)`, [req.params.id, req.affiliateScopeId]);
    if (!campaigns.length) return res.status(404).json({ status: 'fail', message: 'Campaign not found' });
    const campaign = campaigns[0];
    const affiliateId = campaign.affiliate_id;
    const { rows: contacts } = await pool.query(`SELECT DISTINCT ON (LOWER(TRIM(email))) * FROM affiliate_contacts
      WHERE affiliate_id=$1 AND unsubscribed=FALSE AND email_bounced=FALSE AND email IS NOT NULL
        AND TRIM(email)<>'' AND ($2::int[] IS NULL OR id=ANY($2))
      ORDER BY LOWER(TRIM(email)),id`, [affiliateId,contact_ids || null]);
    if (!contacts.length) return res.status(400).json({ status: 'fail', message: 'No eligible contacts found' });
    const { rows: claimed } = await pool.query(`UPDATE affiliate_campaigns SET status='sending',total_contacts=$1,updated_at=NOW()
      WHERE id=$2 AND status IN ('draft','scheduled') RETURNING id`, [contacts.length,campaign.id]);
    if (!claimed.length) return res.status(409).json({ status: 'fail', message: 'Campaign already sent or sending' });
    claimedId=campaign.id;
    const sendEmail = require('../../utils/sendEmailAzure');
    const escapeHtml = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const frontend=(process.env.FRONTEND_URL || 'https://neozaar.com').replace(/\/$/,'');
    const backend=(process.env.BACKEND_URL || 'http://localhost:5000/api/').replace(/\/$/,'');
    let sentCount=0, failedCount=0;
    for (const contact of contacts) {
      let sendId;
      try {
        const token=await createAttributionToken({affiliateId,linkId:campaign.affiliate_link_id,campaignId:campaign.id,contactId:contact.id});
        if(!token) throw new Error('Token creation failed');
        const {rows: sends}=await pool.query(`INSERT INTO affiliate_campaign_sends (campaign_id,contact_id,affiliate_id,token_id,status)
          VALUES ($1,$2,$3,$4,'queued') ON CONFLICT (campaign_id,contact_id) DO NOTHING RETURNING id`,[campaign.id,contact.id,affiliateId,token]);
        if (!sends.length) continue;
        sendId=sends[0].id;
        const registrationUrl=frontend+'/go/affiliate-track?campaign='+encodeURIComponent(token);
        const pixel=backend+'/affiliate/track-open?token='+encodeURIComponent(token);
        let body=campaign.body_html || escapeHtml(campaign.body_text || '').replace(/\n/g,'<br>');
        body=body.replace(/(?:\{\{name\}\}|\[name\])/gi,()=>escapeHtml(contact.name)).replace(/(?:\{\{registration_url\}\}|\[registration_url\])/gi,()=>registrationUrl);
        // Always include a working tracked CTA, even when the author omitted the placeholder.
        body+='<p><a href="'+registrationUrl+'">Register with NeoZaar</a></p><img src="'+pixel+'" width="1" height="1" alt="" />';
        const accepted=await sendEmail(contact.email,campaign.subject,body,true);
        if (!accepted) throw new Error('Email provider rejected the message');
        await pool.query(`UPDATE affiliate_campaign_sends SET status='sent',sent_at=NOW() WHERE id=$1`,[sendId]);
        await pool.query(`UPDATE affiliate_contacts SET status='emailed' WHERE id=$1 AND status='prospect'`,[contact.id]);
        sentCount++;
      } catch(error) {
        failedCount++;
        if(sendId) await pool.query(`UPDATE affiliate_campaign_sends SET status='failed' WHERE id=$1`,[sendId]);
        console.warn('[affiliate] campaign delivery failed:',error.message);
      }
    }
    await pool.query(`UPDATE affiliate_campaigns SET status=$1,sent_count=$2,sent_at=NOW(),updated_at=NOW() WHERE id=$3`,
      [failedCount ? (sentCount ? 'partial' : 'failed') : 'sent',sentCount,campaign.id]);
    affiliateAuditLog({actorId:req.user.id,action:'campaign_sent',affiliateId,entityType:'affiliate_campaign',entityId:campaign.id,newValue:{sent_count:sentCount,failed_count:failedCount}});
    res.json({status:'success',message:sentCount+' sent, '+failedCount+' failed',data:{sent_count:sentCount,failed_count:failedCount}});
  } catch(error) {
    if(claimedId) await pool.query(`UPDATE affiliate_campaigns SET status='failed',updated_at=NOW() WHERE id=$1 AND status='sending'`,[claimedId]).catch(()=>{});
    res.status(500).json({status:'fail',message:'Campaign could not be sent'});
  }
};

// ── GET /api/affiliate/campaigns/:id/sends ───────────────────────
const getCampaignSends = async (req, res) => {
  try {
    const affiliateId = req.affiliateScopeId;
    const { rows } = await pool.query(
      `SELECT cs.*, ac.name AS contact_name, ac.email AS contact_email
       FROM affiliate_campaign_sends cs
       JOIN affiliate_contacts ac ON ac.id = cs.contact_id
       JOIN affiliate_campaigns camp ON camp.id = cs.campaign_id
       WHERE cs.campaign_id=$1 AND ($2::int IS NULL OR camp.affiliate_id=$2)
       ORDER BY cs.sent_at DESC`,
      [req.params.id, affiliateId]
    );
    res.json({ status: 'success', data: rows });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

module.exports = {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  sendCampaign,
  getCampaignSends,
};
