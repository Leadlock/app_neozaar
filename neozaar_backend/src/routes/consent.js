const express = require("express");
const router = express.Router();
const db = require("../config/database");
const verifyToken = require("../middlewares/auth");
const ledger = require("../services/consentLedger.service");

// Resolved consent state + full history for the signed-in caller.
// Pass ?anonId=<uuid> to also fold in choices made before login.
router.get("/me", verifyToken, async (req, res, next) => {
    try {
        const anonId = req.query.anonId || null;
        const [state, historyRows] = await Promise.all([
            ledger.currentState({ anonId, userId: req.user.id }),
            ledger.history({ anonId, userId: req.user.id }),
        ]);
        res.json({ success: true, state, history: historyRows });
    } catch (error) {
        next(error);
    }
});

router.get("/", verifyToken, async (req, res, next) => {
    try {
        const { rows } = await db.query(
            `SELECT consent_given, created_at
             FROM user_consents
             WHERE user_id = $1 AND consent_type = 'analytics'
             ORDER BY created_at DESC LIMIT 1`,
            [req.user.id]
        );
        res.json({ success: true, consentGiven: rows.length ? rows[0].consent_given : null });
    } catch (error) {
        next(error);
    }
});

router.post("/", verifyToken, async (req, res, next) => {
    try {
        const { consentGiven } = req.body;
        if (typeof consentGiven !== "boolean") {
            return res.status(400).json({ success: false, message: "consentGiven must be a boolean" });
        }

        const latest = await db.query(
            `SELECT consent_given FROM user_consents
             WHERE user_id = $1 AND consent_type = 'analytics'
             ORDER BY created_at DESC LIMIT 1`,
            [req.user.id]
        );

        if (!latest.rows.length || latest.rows[0].consent_given !== consentGiven) {
            await db.query(
                `INSERT INTO user_consents (user_id, consent_given, consent_type)
                 VALUES ($1,$2,'analytics')`,
                [req.user.id, consentGiven]
            );
        }

        res.json({ success: true, consentGiven });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
/*
UTM-wise Leads
SELECT 
    utm->>'utm_source' AS source,
    COUNT(DISTINCT user_id) AS leads
FROM user_activity_logs
WHERE utm->>'utm_source' IS NOT NULL
GROUP BY source
ORDER BY leads DESC;

Campaign Performance
SELECT
    utm->>'utm_campaign' AS campaign,
    COUNT(*) FILTER (WHERE event_type = 'PRODUCT_VIEW') AS views,
    COUNT(*) FILTER (WHERE event_type = 'PRICE_CLICK') AS price_clicks
FROM user_activity_logs
GROUP BY campaign;
*/
