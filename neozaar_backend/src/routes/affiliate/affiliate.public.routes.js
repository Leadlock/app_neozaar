/**
 * Affiliate Public Routes
 * ─────────────────────────────────────────────────────────────
 * Public (no auth) affiliate attribution endpoints:
 *
 *   GET  /api/affiliate/track/:slug
 *     — Record an anonymous link click, set attribution token cookie/response
 *
 * Attribution is saved inside registration and activated by email verification.
 * The former public register-attribution endpoint is deliberately disabled.
 *
 *   GET  /api/affiliate/track-open
 *     — Email open pixel tracking
 *
 *   GET  /api/affiliate/track-click
 *     — Email link click tracking (from campaign emails)
 */
const express = require('express');
const crypto  = require('crypto');
const pool    = require('../../config/database');
const {
  resolveLinkFromSlug,
  resolveAffiliateFromToken,
  recordLinkClick,
  createAttributionToken,
} = require('../../services/affiliate/affiliate.attribution.service');

const router = express.Router();

// ─── GET /api/affiliate/track/:slug ──────────────────────────────
// Record anonymous link click and return attribution token.
// Redirect not done here — done on the Next.js side.
router.get('/track/:slug', async (req, res) => {
  try {
    const link = await resolveLinkFromSlug(req.params.slug);
    if (!link) {
      return res.status(404).json({ status: 'fail', message: 'Link not found or inactive' });
    }

    // Hash IP for privacy
    const rawIp = req.ip || req.connection?.remoteAddress || '';
    const ipHash = crypto.createHash('sha256').update(rawIp + process.env.JWT_SECRET).digest('hex').slice(0, 16);

    const token = await recordLinkClick({
      linkId: link.id,
      affiliateId: link.affiliate_id,
      ipHash,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
    });

    if (!token) throw new Error('Attribution token creation failed');
    res.set('Cache-Control', 'no-store');
    // Build destination URL with UTM params + token
    const dest = link.destination_path || '/';
    const params = new URLSearchParams({
      utm_source:   link.utm_source || link.ref_code || '',
      utm_medium:   link.utm_medium || 'referral',
      utm_campaign: link.utm_campaign || '',
      aff_link:     link.slug,
      ...(token ? { aff_token: token } : {}),
    });

    res.json({
      status: 'success',
      data: {
        redirect_url: `${dest}${dest.includes('?') ? '&' : '?'}${params.toString()}`,
        aff_token: token,
        utm_source: link.utm_source || link.ref_code,
        utm_medium: link.utm_medium || 'referral',
        utm_campaign: link.utm_campaign,
      },
    });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: 'Tracking error' });
  }
});


// Validate an existing first-party token before replacing it with a later click.
router.get('/token-status', async (req,res) => {
  const resolved = await resolveAffiliateFromToken(req.query.token);
  res.set('Cache-Control','no-store').json({ valid: !!resolved });
});

// Identity is established only inside registration/verification. This legacy
// endpoint must not let anonymous callers attribute arbitrary email addresses.
router.post('/register-attribution', (req,res) => res.status(410).json({
  status: 'fail', message: 'Attribution is handled during account registration and email verification.'
}));

async function campaignSend(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const {rows} = await pool.query(`SELECT s.*, t.link_id FROM affiliate_campaign_sends s
    JOIN affiliate_tokens t ON t.token=s.token_id
    JOIN users a ON a.id=s.affiliate_id AND a.is_active=TRUE
    WHERE s.token_id=$1 AND s.status IN ('sent','delivered') LIMIT 1`,[token]);
  return rows[0] || null;
}

router.get('/track-open', async (req,res) => {
  try {
    const send = await campaignSend(req.query.token);
    if (send) {
      await pool.query('UPDATE affiliate_campaign_sends SET opened=TRUE,opened_at=COALESCE(opened_at,NOW()) WHERE id=$1',[send.id]);
      await pool.query(`UPDATE affiliate_campaigns SET opened_count=(SELECT COUNT(*) FROM affiliate_campaign_sends WHERE campaign_id=$1 AND opened=TRUE) WHERE id=$1`,[send.campaign_id]);
    }
  } catch(e) { console.warn('[affiliate] open tracking failed:',e.message); }
  const pixel=Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
  res.set('Cache-Control','no-store').type('gif').send(pixel);
});

// Opaque send token, no recipient IDs and no caller-controlled redirect URL.
router.get('/track-click', async (req,res) => {
  try {
    const send=await campaignSend(req.query.token);
    if(!send) return res.status(404).json({status:'fail',message:'Campaign link unavailable'});
    await pool.query('UPDATE affiliate_campaign_sends SET clicked=TRUE,clicked_at=COALESCE(clicked_at,NOW()) WHERE id=$1',[send.id]);
    await pool.query(`UPDATE affiliate_campaigns SET clicked_count=(SELECT COUNT(*) FROM affiliate_campaign_sends WHERE campaign_id=$1 AND clicked=TRUE) WHERE id=$1`,[send.campaign_id]);
    await pool.query(`UPDATE affiliate_contacts SET status='clicked' WHERE id=$1 AND affiliate_id=$2 AND status IN ('prospect','emailed')`,[send.contact_id,send.affiliate_id]);
    const token=await createAttributionToken({affiliateId:send.affiliate_id,linkId:send.link_id,campaignId:send.campaign_id,contactId:send.contact_id});
    if(!token) throw new Error('Attribution token creation failed');
    res.set('Cache-Control','no-store').json({status:'success',data:{aff_token:token,redirect_url:'/auth/register',utm_medium:'email'}});
  } catch(e) { res.status(500).json({status:'fail',message:'Campaign tracking failed'}); }
});
module.exports=router;
