const db = require("../config/database");

class ConsentService {

    static async saveConsent(userId, consentGiven) {
        return db.query(`
            INSERT INTO user_consents (user_id, consent_given, consent_type)
            VALUES ($1,$2,'analytics')
        `, [userId, consentGiven]);
    }

    static async hasAnalyticsConsent(userId) {
        const { rows } = await db.query(`
            SELECT consent_given
            FROM user_consents
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `, [userId]);

        return rows.length && rows[0].consent_given;
    }
}

module.exports = ConsentService;
