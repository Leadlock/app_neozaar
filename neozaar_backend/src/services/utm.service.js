const db = require("../config/database");

class UTMService {

    static async assignLeadSource(userId, utm) {
        if (!utm?.utm_source || !userId) return;

        await db.query(`
            UPDATE users
            SET lead_source = COALESCE(lead_source, $1)
            WHERE id = $2
        `, [utm.utm_source, userId]);
    }
}

module.exports = UTMService;
