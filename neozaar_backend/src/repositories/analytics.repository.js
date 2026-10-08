const db = require("../config/database");

class AnalyticsRepository {

    static insertEvent(data) {
        return db.query(`
            INSERT INTO user_activity_logs
            (user_id, event_type, entity_type, entity_id, page_url, metadata, utm)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
        `, [
            data.userId,
            data.eventType,
            data.entityType,
            data.entityId,
            data.pageUrl,
            data.metadata || {},
            data.utm || {}
        ]);
    }

    static getOverview(from, to) {
        return db.query(`
            SELECT
                COUNT(*) AS total_events,
                COUNT(DISTINCT user_id) AS total_users,
                COUNT(*) FILTER (WHERE event_type='PRODUCT_VIEW') AS product_views,
                COUNT(*) FILTER (WHERE event_type='PRICE_CLICK') AS price_clicks,
                COUNT(*) FILTER (WHERE event_type='BROCHURE_DOWNLOAD') AS brochure_downloads
            FROM user_activity_logs
            WHERE created_at BETWEEN $1 AND $2
        `, [from, to]);
    }

    static getDailyActivity(from, to) {
        return db.query(`
            SELECT DATE(created_at) AS date, COUNT(*) AS events
            FROM user_activity_logs
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY date
            ORDER BY date
        `, [from, to]);
    }

    static getTopProducts(limit) {
        return db.query(`
            SELECT
                entity_id AS product_id,
                COUNT(*) FILTER (WHERE event_type='PRODUCT_VIEW') AS views,
                COUNT(*) FILTER (WHERE event_type='PRICE_CLICK') AS price_clicks
            FROM user_activity_logs
            WHERE entity_type='product'
            GROUP BY product_id
            ORDER BY views DESC
            LIMIT $1
        `, [limit]);
    }

    static getProductFunnel(productId) {
        return db.query(`
            SELECT
                COUNT(*) FILTER (WHERE event_type='PRODUCT_VIEW') AS product_views,
                COUNT(*) FILTER (WHERE event_type='PRICE_CLICK') AS price_clicks,
                COUNT(*) FILTER (WHERE event_type='BROCHURE_DOWNLOAD') AS brochure_downloads,
                COUNT(*) FILTER (WHERE event_type='ADD_TO_CART') AS add_to_cart
            FROM user_activity_logs
            WHERE entity_id = $1
        `, [productId]);
    }
    static getUserActivity(userId) {
        return db.query(`
            SELECT
                event_type,
                entity_type,
                entity_id,
                page_url,
                created_at
            FROM user_activity_logs
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 100
        `, [userId]);
    }
    static getUtmSources() {
        return db.query(`
            SELECT
                utm->>'utm_source' AS utm_source,
                COUNT(DISTINCT user_id) AS users
            FROM user_activity_logs
            WHERE utm->>'utm_source' IS NOT NULL
            GROUP BY utm_source
            ORDER BY users DESC
        `);
    }

    static getUtmCampaigns() {
        return db.query(`
            SELECT
                utm->>'utm_campaign' AS campaign,
                COUNT(*) FILTER (WHERE event_type='PRODUCT_VIEW') AS views,
                COUNT(*) FILTER (WHERE event_type='PRICE_CLICK') AS price_clicks
            FROM user_activity_logs
            WHERE utm->>'utm_campaign' IS NOT NULL
            GROUP BY campaign
            ORDER BY views DESC
        `);
    }
    static exportEvents(from, to) {
        return db.query(`
            SELECT *
            FROM user_activity_logs
            WHERE created_at BETWEEN $1 AND $2
            ORDER BY created_at DESC
        `, [from, to]);
    }

    static deleteUserData(userId) {
        return Promise.all([
            db.query(`DELETE FROM user_activity_logs WHERE user_id = $1`, [userId]),
            db.query(`DELETE FROM user_consents WHERE user_id = $1`, [userId])
        ]);
    }
}

module.exports = AnalyticsRepository;
