const pool = require('../config/database');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Consent middleware for /api/track.
// Runs AFTER verifyToken so req.user is populated for signed-in callers.
// Returns 204 (no content, no score) when analytics consent is absent.
module.exports = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.body.userId;

        if (userId) {
            const { rows } = await pool.query(
                `SELECT consent_given FROM user_consents
                 WHERE user_id = $1 AND consent_type = 'analytics'
                 ORDER BY created_at DESC LIMIT 1`,
                [userId]
            );
            if (rows.length && rows[0].consent_given) return next();
            return res.status(204).end();
        }

        // Anonymous caller — gate on the consent ledger (Phase 3).
        const anonId = req.get('x-anon-id') || req.body.anonId;
        if (anonId && UUID_RE.test(anonId)) {
            const { rows } = await pool.query(
                `SELECT purposes FROM consent_events
                 WHERE anon_id = $1 ORDER BY id DESC LIMIT 1`,
                [anonId]
            );
            if (rows.length && rows[0].purposes && rows[0].purposes.analytics === true) {
                return next();
            }
        }

        // No consent — do not store behavioural tracking or award Customer Score.
        return res.status(204).end();
    } catch (err) {
        // Fail closed: on any error, do not record tracking.
        return res.status(204).end();
    }
};
