/**
 * Public Lead Routes
 * ─────────────────────────────────────────────────────────────
 * No authentication required on any of these endpoints.
 *
 * Conversion triggers handled here:
 *   TRIGGER 2 — Direct CTA  (conversion_source = 'direct_cta')
 *   TRIGGER 3 — Affiliate CTA (conversion_source = 'affiliate_cta')
 *
 * Customer Scoring events (TRIGGER 1 path) are handled by:
 *   POST /api/public/leads/scoring/event
 * ─────────────────────────────────────────────────────────────
 */
const router = require('express').Router();
const pool   = require('../../config/database');
const {
  convertCustomerToOpportunity,
  updateCustomerScore,
  createProductOpportunity,
} = require('../../controllers/crm/lifecycle.engine');
const { rateLimit } = require('../../middlewares/rateLimit.middleware');

// Marketing event ingestion for this route file's several lead-capture
// entry points — kept as one small, non-throwing helper since every
// handler below needs the same "never let this affect the actual lead
// capture" guarantee. This is the highest-traffic lead surface in the
// app (used by the website's CTA buttons AND the WhatsApp bot via
// leadsApi.js), so it matters more than most that it never fails loudly.
async function trackMarketingEvent(eventType, { email, phone, refType, refId, metadata, ingestionSource }) {
  if (!email && !phone) return;
  try {
    const ingestion = require('../../services/marketing/event-ingestion.service');
    await ingestion.ingestEvent({
      email: email || null, phone: phone || null, eventType,
      refType: refType || null, refId: refId || null, channel: 'web',
      metadata: metadata || {}, ingestionSource: ingestionSource || 'public_lead',
    });
  } catch (error) {
    console.error('Marketing public-lead event ingestion failed:', error?.message || error);
  }
}
const PUBLIC_LEAD_EVENT_TYPE = {
  'Website Contact': 'FORM_SUBMIT',
  'Demo Request': 'DEMO_REQUEST',
  'Trial Request': 'TRIAL_REQUEST',
  'POC Request': 'POC_REQUEST',
  'Assessment Request': 'ASSESSMENT_REQUEST',
};

// ─── Simple form capture (no conversion, no scoring) ─────────
const createPublicLead = (leadSource) => async (req, res) => {
  try {
    const {
      name, email, phone, whatsapp, company, designation,
      country, industry, requirement, consent_status,
    } = req.body;
    if (!name || !email) {
      return res.status(400).json({ status: 'fail', message: 'Name and email are required' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // ON CONFLICT on email_normalized (stored generated column, unique index)
    // makes the upsert atomic — concurrent requests cannot create duplicates.
    await pool.query(
      `INSERT INTO crm_leads
           (name,email,phone,whatsapp,company,designation,country,industry,
            lead_source,requirement,consent_status,status,score,score_label,
            created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'New',0,'Not Scored',NOW(),NOW())
         ON CONFLICT (email_normalized) WHERE is_deleted=FALSE AND email_normalized IS NOT NULL AND email_normalized <> '' DO NOTHING`,
      [name, normalizedEmail, phone, whatsapp, company, designation,
       country, industry, leadSource, requirement, consent_status || false]
    );

    await trackMarketingEvent(PUBLIC_LEAD_EVENT_TYPE[leadSource] || 'FORM_SUBMIT', {
      email: normalizedEmail, phone, metadata: { leadSource, company, industry },
    });

    res.status(201).json({
      status: 'success',
      message: 'Your request has been received. We will contact you shortly.',
    });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: 'Submission failed. Please try again.' });
  }
};

router.post('/contact',    createPublicLead('Website Contact'));
router.post('/demo',       createPublicLead('Demo Request'));
router.post('/trial',      createPublicLead('Trial Request'));
router.post('/poc',        createPublicLead('POC Request'));
router.post('/assessment', createPublicLead('Assessment Request'));

// ─── Public Customer Scoring event ───────────────────────────
// Rate limit: 30 scoring events per IP per minute
const scoringCtrl = require('../../controllers/crm/scoring.controller');
router.post(
  '/scoring/event',
  rateLimit({ windowMs: 60_000, max: 30, message: 'Too many scoring requests.' }),
  scoringCtrl.recordPublicScoringEvent
);

// ─── CTA Action — DIRECT CONVERSION (Trigger 2 & 3) ──────────
/**
 * POST /api/public/leads/cta-action
 *
 * Called when visitor clicks: Get Quote, Private Offer,
 * Request Assessment, Talk to Sales, Request Solution, etc.
 *
 * This is a HIGH-INTENT action — converts immediately to Opportunity
 * regardless of Customer Score.
 *
 * Does NOT add points to Customer Score.
 * Does NOT wait for score threshold.
 *
 * If utm_source resolves to an affiliate → conversion_source = 'affiliate_cta'
 * Otherwise                              → conversion_source = 'direct_cta'
 *
 * Affiliate attribution (affiliate_id) is preserved on the Opportunity.
 *
 * Rate limit: 10 CTA submissions per IP per minute (abuse protection)
 */
router.post(
  '/cta-action',
  rateLimit({ windowMs: 60_000, max: 10, message: 'Too many requests. Please try again shortly.' }),
  async (req, res) => {
    try {
      const {
        name, email, phone, company, industry, requirement,
        source, consent_status, product_name, product_id,
        utm_source, utm_medium, utm_campaign,
        cloud_environment, cloud_account_id, procurement_stage,
      } = req.body;

      if (!email) {
        return res.status(400).json({ status: 'fail', message: 'email is required' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const leadSource = source || 'CTA Button';

      // Resolve affiliate from utm_source (ref_code or user id)
      let affiliateId   = null;
      let affiliateOwner = null;
      if (utm_source) {
        const { rows: affRows } = await pool.query(
          `SELECT id, role_type FROM users
           WHERE (ref_code=$1 OR id::text=$1) AND is_active=true LIMIT 1`,
          [utm_source]
        ).catch(() => ({ rows: [] }));
        if (affRows.length) {
          affiliateId    = affRows[0].id;
          affiliateOwner = affRows[0].id;
        }
      }

      const conversionSource = affiliateId ? 'affiliate_cta' : 'direct_cta';

      // Fallback owner: first active M_SELLER
      let ownerId = affiliateOwner;
      if (!ownerId) {
        const { rows: ms } = await pool.query(
          "SELECT id FROM users WHERE role_type='M_SELLER' AND is_active=true ORDER BY id LIMIT 1"
        ).catch(() => ({ rows: [] }));
        if (ms.length) ownerId = ms[0].id;
      }

      // Upsert lead (1 per customer email) — returns full row via RETURNING *
      const { rows: upserted } = await pool.query(
        `INSERT INTO crm_leads
             (name,email,phone,company,industry,lead_source,requirement,
              consent_status,status,lead_stage,score,score_label,
              owner_id,affiliate_id,cloud_environment,cloud_account_id,procurement_stage,
              created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'New','New Inquiry',0,'Not Scored',$9,$10,$11,$12,$13,NOW(),NOW())
           ON CONFLICT (email_normalized) WHERE is_deleted=FALSE AND email_normalized IS NOT NULL AND email_normalized <> ''
           DO UPDATE SET
             name              = EXCLUDED.name,
             company           = COALESCE(EXCLUDED.company,  crm_leads.company),
             phone             = COALESCE(EXCLUDED.phone,    crm_leads.phone),
             affiliate_id      = COALESCE(crm_leads.affiliate_id, EXCLUDED.affiliate_id),
             owner_id          = COALESCE(crm_leads.owner_id,     EXCLUDED.owner_id),
             cloud_environment = COALESCE(EXCLUDED.cloud_environment, crm_leads.cloud_environment),
             cloud_account_id  = COALESCE(EXCLUDED.cloud_account_id,  crm_leads.cloud_account_id),
             procurement_stage = COALESCE(EXCLUDED.procurement_stage, crm_leads.procurement_stage),
             updated_at   = NOW()
           RETURNING *`,
        [
          name || normalizedEmail.split('@')[0], normalizedEmail,
          phone || null, company || null, industry || null,
          leadSource, requirement || null, consent_status || false,
          ownerId, affiliateId,
          cloud_environment || null, cloud_account_id || null, procurement_stage || null,
        ]
      );
      const crmLead = upserted[0];

      // Score +20 for high-intent CTA (non-blocking)
      await updateCustomerScore(crmLead.id, 'cta_action', 20, null, false);

      // Create one opportunity for this product × intent.
      // If product_name is supplied use createProductOpportunity (multi-opp per customer).
      // Fall back to the old single-opp path for generic CTAs with no product context.
      if (product_name) {
        await createProductOpportunity({
          leadId          : crmLead.id,
          ownerId,
          affiliateId,
          productName     : product_name,
          productId       : product_id || null,
          leadSource,
          conversionSource,
          lead            : crmLead,
        });
      } else {
        await convertCustomerToOpportunity(crmLead.id, ownerId, conversionSource);
      }

      await trackMarketingEvent('CTA_CONVERSION', {
        email: normalizedEmail, phone, refType: product_id ? 'product' : null, refId: product_id || null,
        metadata: { leadSource, conversionSource, productName: product_name || null },
        ingestionSource: 'cta_action',
      });

      res.status(201).json({
        status: 'success',
        message: 'Your request has been received. We will contact you shortly.',
      });
    } catch (e) {
      console.error('cta-action error:', e);
      res.status(500).json({ status: 'fail', message: 'Submission failed. Please try again.' });
    }
  }
);

module.exports = router;
