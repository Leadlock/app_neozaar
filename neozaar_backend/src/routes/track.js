const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const consent = require("../middlewares/consent");
const syncLeadToCRM = require("../services/LeadSyncService");
const verifyToken = require("../middlewares/auth");

// Scoring events that award Customer Score points (server-side values only)
const CRM_CUSTOMER_SCORE_MAP = {
  'product_page_visit': { event: 'product_page_visit', points: 5 },
  'PRODUCT_VIEW':       { event: 'product_page_visit', points: 5 },
  'page_view':          { event: 'product_page_visit', points: 5 },
  'BROCHURE_DOWNLOAD':  { event: 'brochure_download',  points: 5 },
  'CASE_STUDY':         { event: 'use_case_download',  points: 5 },
  'CATALOG_SCROLL':     { event: 'catalog_engagement', points: 2 },
};

// All valid event types accepted by /api/track
const VALID_EVENT_TYPES = new Set([
  'product_page_visit', 'PRODUCT_VIEW', 'page_view',
  'BROCHURE_DOWNLOAD', 'CASE_STUDY',
  'CATALOG_SCROLL',
  'search', 'filter', 'category_view', 'solution_view',
  'demo_request_view', 'pricing_view',
]);

// Dedup window in seconds — same user + event + entity within this window = duplicate
const DEDUP_WINDOW_SECONDS = 60;

// /api/track requires JWT + tracking consent
// Consent middleware returns 204 (no content) when consent is absent,
// which stops the chain — no activity log, no Customer Score awarded.
router.post("/", verifyToken, consent, async (req, res) => {
    const {
        eventType,
        entityType,
        entityId,
        pageUrl,
        metadata,
        utm,
        idempotency_key,   // optional client-supplied dedup key
    } = req.body;
    const userId = req.user.id;

    // Validate event type — reject unknown events
    if (!eventType || !VALID_EVENT_TYPES.has(eventType)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing eventType' });
    }

    // ── Duplicate-event protection ────────────────────────────────────────
    // 1. If the client sent an idempotency_key, check it first (exact match).
    // 2. Otherwise, check for the same (user, eventType, entityId) within
    //    the dedup window — guards against page-refresh / React re-render.
    let isDuplicate = false;

    if (idempotency_key) {
        const { rows: dup } = await pool.query(
            `SELECT id FROM user_activity_logs
             WHERE user_id=$1 AND idempotency_key=$2 LIMIT 1`,
            [userId, idempotency_key]
        );
        if (dup.length) isDuplicate = true;
    }

    if (!isDuplicate && CRM_CUSTOMER_SCORE_MAP[eventType]) {
        // Only apply time-window dedup for scoring events (not every page_view)
        const { rows: recent } = await pool.query(
            `SELECT id FROM user_activity_logs
             WHERE user_id=$1
               AND event_type=$2
               AND COALESCE(entity_id::text,'') = COALESCE($3::text,'')
               AND created_at > NOW() - ($4 || ' seconds')::interval
             LIMIT 1`,
            [userId, eventType, entityId ?? null, DEDUP_WINDOW_SECONDS]
        );
        if (recent.length) isDuplicate = true;
    }

    if (isDuplicate) {
        return res.json({ success: true, duplicate: true });
    }
    // ─────────────────────────────────────────────────────────────────────

    await pool.query(
        `INSERT INTO user_activity_logs
         (user_id, event_type, entity_type, entity_id, page_url, metadata, utm, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [userId, eventType, entityType, entityId, pageUrl, metadata || {}, utm || {}, idempotency_key || null]
    );

    if (utm?.utm_source) {
        await pool.query(
            `UPDATE users SET lead_source = COALESCE(lead_source, $1) WHERE id = $2`,
            [utm.utm_source, userId]
        );
    }

    syncLeadToCRM({ userId, eventType, entityType, entityId, pageUrl, utm, metadata });

    // Update Customer Score — only for mapped scoring events, never for duplicates
    const scoringEntry = CRM_CUSTOMER_SCORE_MAP[eventType];
    if (scoringEntry) {
      try {
        const { updateCustomerScore } = require("../controllers/crm/lifecycle.engine");
        const User = require("../models/User");
        const user = await User.findByPk(userId);
        if (user?.email) {
          const { rows: existing } = await pool.query(
            'SELECT id FROM crm_leads WHERE email_normalized=$1 AND is_deleted=FALSE LIMIT 1',
            [user.email.trim().toLowerCase()]
          );
          if (existing.length) {
            await updateCustomerScore(existing[0].id, scoringEntry.event, scoringEntry.points, userId);
          }
        }
      } catch (e) {
        // Non-critical — do not fail the request
      }
    }

    res.json({ success: true });
});


router.get("/recent", async (req, res) => {
    const userId = req.user.id;
    const { limit = 10 } = req.query;
    const result = await pool.query(
        `SELECT event_type, entity_type, entity_id, page_url, metadata, utm, created_at
         FROM user_activity_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
    );
    res.json({ success: true, logs: result.rows });
});




module.exports = router;
