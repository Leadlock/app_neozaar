/**
 * Customer Scoring Controller
 * ─────────────────────────────────────────────────────────────
 * Handles customer engagement scoring BEFORE opportunity conversion.
 * Customer Score is independent of Opportunity Score.
 *
 * Valid events and server-side points (clients NEVER supply points):
 *   customer_registration  +1
 *   product_page_visit     +5
 *   brochure_download      +5
 *   use_case_download      +5
 *   cta_action             +20  (high-intent — also triggers direct conversion)
 *
 * Threshold: 30 → auto-convert to Opportunity
 *
 * Public endpoint hardening:
 *   - Only approved event types accepted
 *   - Points always from server-side map (never from request body)
 *   - Email normalized before lookup/upsert
 *   - Idempotency via idempotency_key
 *   - Per-email event cap (MAX_EVENTS_PER_EMAIL) prevents score inflation abuse
 * ─────────────────────────────────────────────────────────────
 */
const pool = require('../../config/database');
const {
  updateCustomerScore,
  CUSTOMER_SCORE_EVENTS,
  CUSTOMER_SCORE_LABEL,
} = require('./lifecycle.engine');

// Maximum number of scoring events recorded per email address (abuse cap).
// Prevents a single email from accumulating unlimited score via repeated calls.
const MAX_EVENTS_PER_EMAIL = 50;

// Events allowed on the PUBLIC endpoint (excludes cta_action — handled by cta-action route)
const PUBLIC_ALLOWED_EVENTS = new Set([
  'customer_registration',
  'product_page_visit',
  'brochure_download',
  'use_case_download',
]);

/**
 * POST /api/internal/crm/scoring/event
 * Authenticated — CRM staff recording a customer scoring event
 * Body: { lead_id, event_type, idempotency_key? }
 */
const recordCustomerScoringEvent = async (req, res) => {
  try {
    const { lead_id, event_type, idempotency_key } = req.body;

    if (!lead_id || !event_type) {
      return res.status(400).json({ status: 'fail', message: 'lead_id and event_type are required' });
    }

    // Server-side points only — never accept points from request body
    const points = CUSTOMER_SCORE_EVENTS[event_type];
    if (points === undefined) {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid event_type. Valid events: ${Object.keys(CUSTOMER_SCORE_EVENTS).join(', ')}`,
      });
    }

    // Idempotency: skip if this exact event key was already recorded
    if (idempotency_key) {
      const { rows: dup } = await pool.query(
        'SELECT id FROM crm_lead_score_history WHERE lead_id=$1 AND idempotency_key=$2 LIMIT 1',
        [lead_id, idempotency_key]
      );
      if (dup.length) {
        const { rows: lead } = await pool.query(
          'SELECT id, score, score_label, converted_to_opportunity_id FROM crm_leads WHERE id=$1',
          [lead_id]
        );
        return res.json({
          status: 'success',
          duplicate: true,
          data: {
            lead_id,
            event_type,
            points_added: 0,
            customer_score: lead[0]?.score || 0,
            customer_score_label: lead[0]?.score_label || 'Not Scored',
            converted: !!lead[0]?.converted_to_opportunity_id,
          },
        });
      }
    }

    const userId = req.user?.id || null;
    await updateCustomerScore(lead_id, event_type, points, userId);

    const { rows } = await pool.query(
      'SELECT id, score, score_label, converted_to_opportunity_id FROM crm_leads WHERE id=$1',
      [lead_id]
    );

    res.json({
      status: 'success',
      data: {
        lead_id,
        event_type,
        points_added: points,
        customer_score: rows[0]?.score || 0,
        customer_score_label: rows[0]?.score_label || 'Not Scored',
        converted: !!rows[0]?.converted_to_opportunity_id,
      },
    });
  } catch (e) {
    console.error('recordCustomerScoringEvent error:', e);
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// Backward-compat alias used by crm.routes.js
const recordScoringEvent = recordCustomerScoringEvent;

/**
 * POST /api/public/leads/scoring/event
 * Public — no auth — called by marketplace frontend
 * Body: { email, event_type, name?, idempotency_key? }
 *
 * Hardening:
 *   - Only PUBLIC_ALLOWED_EVENTS accepted (cta_action excluded — use /cta-action)
 *   - Points always from server-side CUSTOMER_SCORE_EVENTS map
 *   - Email normalized before upsert
 *   - Idempotency via idempotency_key
 *   - Per-email event cap enforced before scoring
 */
const recordPublicScoringEvent = async (req, res) => {
  try {
    // Destructure only known fields — ignore any client-supplied points
    const { email, event_type, name, idempotency_key } = req.body;

    if (!email || !event_type) {
      return res.status(400).json({ status: 'fail', message: 'email and event_type are required' });
    }

    // Only approved public events — never accept cta_action or unknown types here
    if (!PUBLIC_ALLOWED_EVENTS.has(event_type)) {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid event_type. Allowed: ${[...PUBLIC_ALLOWED_EVENTS].join(', ')}`,
      });
    }

    // Server-side points — client-supplied points are silently ignored
    const points = CUSTOMER_SCORE_EVENTS[event_type];

    const normalizedEmail = email.trim().toLowerCase();

    // Atomic upsert — ON CONFLICT prevents race-condition duplicates
    const { rows: upserted } = await pool.query(
      `INSERT INTO crm_leads
           (name, email, status, lead_stage, score, score_label, lead_source, created_at, updated_at)
         VALUES ($1,$2,'New','New Inquiry',0,'Not Scored','Marketplace',NOW(),NOW())
         ON CONFLICT (email_normalized) WHERE is_deleted = FALSE AND email_normalized IS NOT NULL AND email_normalized <> ''
         DO UPDATE SET updated_at = crm_leads.updated_at
         RETURNING id`,
      [name || normalizedEmail.split('@')[0], normalizedEmail]
    );
    const leadId = upserted[0].id;

    // Idempotency check
    if (idempotency_key) {
      const { rows: dup } = await pool.query(
        'SELECT id FROM crm_lead_score_history WHERE lead_id=$1 AND idempotency_key=$2 LIMIT 1',
        [leadId, idempotency_key]
      );
      if (dup.length) {
        const { rows: lead } = await pool.query(
          'SELECT score, score_label, converted_to_opportunity_id FROM crm_leads WHERE id=$1',
          [leadId]
        );
        return res.json({
          status: 'success',
          duplicate: true,
          data: {
            lead_id: leadId,
            event_type,
            points_added: 0,
            customer_score: lead[0]?.score || 0,
            customer_score_label: lead[0]?.score_label || 'Not Scored',
            converted: !!lead[0]?.converted_to_opportunity_id,
          },
        });
      }
    }

    // Per-email event cap — prevents score inflation via repeated public calls
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) FROM crm_lead_score_history WHERE lead_id=$1',
      [leadId]
    );
    if (parseInt(countRows[0].count) >= MAX_EVENTS_PER_EMAIL) {
      // Silently accept but do not score — return current state
      const { rows: lead } = await pool.query(
        'SELECT score, score_label, converted_to_opportunity_id FROM crm_leads WHERE id=$1',
        [leadId]
      );
      return res.json({
        status: 'success',
        data: {
          lead_id: leadId,
          event_type,
          points_added: 0,
          customer_score: lead[0]?.score || 0,
          customer_score_label: lead[0]?.score_label || 'Not Scored',
          converted: !!lead[0]?.converted_to_opportunity_id,
        },
      });
    }

    await updateCustomerScore(leadId, event_type, points, null);

    const { rows } = await pool.query(
      'SELECT score, score_label, converted_to_opportunity_id FROM crm_leads WHERE id=$1',
      [leadId]
    );

    res.json({
      status: 'success',
      data: {
        lead_id: leadId,
        event_type,
        points_added: points,
        customer_score: rows[0]?.score || 0,
        customer_score_label: rows[0]?.score_label || 'Not Scored',
        converted: !!rows[0]?.converted_to_opportunity_id,
      },
    });
  } catch (e) {
    console.error('recordPublicScoringEvent error:', e);
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

/**
 * GET /api/internal/crm/scoring/history/:lead_id
 * Returns customer score history for a lead
 */
const getCustomerScoringHistory = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT h.*, u.name AS changed_by_name
       FROM crm_lead_score_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.lead_id=$1
       ORDER BY h.created_at DESC`,
      [req.params.lead_id]
    );
    res.json({ status: 'success', data: rows });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// Backward-compat alias
const getScoringHistory = getCustomerScoringHistory;

module.exports = {
  recordCustomerScoringEvent,
  recordScoringEvent,          // backward-compat
  recordPublicScoringEvent,
  getCustomerScoringHistory,
  getScoringHistory,           // backward-compat
};
