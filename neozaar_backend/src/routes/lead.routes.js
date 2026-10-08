// routes/leadRoutes.js
const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const verifyToken = require('../middlewares/auth');
const commonConstant = require('../config/common.constant');
const pool = require("../config/database");

router.post('/create', verifyToken, leadController.createLead);
router.post('/:id/update/status', verifyToken, leadController.updateLead);
router.get('/get-all', verifyToken, leadController.getAllLeads);
router.get('/:id/get-by-id', verifyToken, leadController.getLeadById);
router.post('/assign-lead/:lead_id', verifyToken, leadController.assignLead);
router.post('/update-comment/:lead_id', verifyToken, leadController.updateComment);

router.get("/track/admin/logs", async (req, res) => {
    try {
        const {
            user_id,
            event_type,
            entity_type,
            utm_source,
            utm_medium,
            utm_campaign,
            from_date,
            to_date,
            page = 1,
            limit = 20
        } = req.query;

        const pageNo = parseInt(page, 10);
        const perPage = parseInt(limit, 10);
        const offset = (pageNo - 1) * perPage;

        let conditions = [];
        let values = [];
        let idx = 1;

        if (user_id) {
            conditions.push(`user_id = $${idx++}`);
            values.push(user_id);
        }

        if (event_type) {
            conditions.push(`event_type = $${idx++}`);
            values.push(event_type);
        }

        if (entity_type) {
            conditions.push(`entity_type = $${idx++}`);
            values.push(entity_type);
        }

        if (utm_source) {
            conditions.push(`utm->>'utm_source' ILIKE $${idx++}`);
            values.push(utm_source);
        }

        if (utm_medium) {
            conditions.push(`utm->>'utm_medium' ILIKE $${idx++}`);
            values.push(utm_medium);
        }

        if (utm_campaign) {
            conditions.push(`utm->>'utm_campaign' ILIKE $${idx++}`);
            values.push(utm_campaign);
        }


        if (from_date) {
            conditions.push(`created_at >= $${idx++}`);
            values.push(from_date);
        }

        if (to_date) {
            conditions.push(`created_at <= $${idx++}`);
            values.push(to_date);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        /* ---- DATA QUERY ---- */
        const dataQuery = `
                SELECT
                    ual.id,
                    ual.user_id,
                    u.name AS user_name,
                    u.email AS user_email,
                    p.name AS product_name,
                    ual.event_type,
                    ual.entity_type,
                    ual.entity_id,
                    ual.page_url,
                    ual.utm,
                    ual.metadata,
                    ual.created_at

                FROM user_activity_logs ual
                LEFT JOIN users u ON u.id = ual.user_id
                LEFT JOIN products p ON ual.entity_id = p.id

                ${whereClause}

                ORDER BY ual.id DESC
                LIMIT $${idx++} OFFSET $${idx}
            `;


        const dataValues = [...values, perPage, offset];
        const logsResult = await pool.query(dataQuery, dataValues);

        /* ---- COUNT QUERY (for pagination) ---- */
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM user_activity_logs
            ${whereClause}
        `;

        const countResult = await pool.query(countQuery, values);

        const pagination = commonConstant.PAGINATION.build({ total: parseInt(countResult.rows[0].total, 10), page, limit: perPage });
        
        res.json({
            success: true,
            logs: logsResult.rows,
            pagination
        });

    } catch (error) {
        console.error("Admin Logs Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch admin logs"
        });
    }
});

router.get("/track/admin/logs/product", async (req, res) => {
    try {
        const {
            from_date,
            to_date,
            page = 1,
            limit = 10
        } = req.query;

        const pageNo = Math.max(parseInt(page, 10) || 1, 1);
        const perPage = Math.min(parseInt(limit, 10) || 10, 100);
        const offset = (pageNo - 1) * perPage;

        let conditions = [
            `ual.entity_type = 'product'`
        ];

        let values = [];
        let idx = 1;

        if (from_date) {
            conditions.push(`ual.created_at >= $${idx++}::timestamptz`);
            values.push(from_date);
        }

        if (to_date) {
            conditions.push(`ual.created_at <= $${idx++}::timestamptz`);
            values.push(to_date);
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;

        /* ---------- DATA QUERY ---------- */
        const dataQuery = `
            SELECT
                p.name AS product_name,
                ual.event_type,
                COUNT(*) AS event_count
            FROM user_activity_logs ual
            LEFT JOIN products p ON p.id = ual.entity_id
            ${whereClause}
            GROUP BY
                p.name,
                ual.event_type
            ORDER BY
                p.name ASC,
                event_count DESC
            LIMIT $${idx++} OFFSET $${idx}
        `;

        const dataValues = [...values, perPage, offset];
        const dataResult = await pool.query(dataQuery, dataValues);

        /* ---------- COUNT QUERY (DISTINCT PRODUCTS) ---------- */
        const countQuery = `
            SELECT COUNT(DISTINCT p.name) AS total
            FROM user_activity_logs ual
            LEFT JOIN products p ON p.id = ual.entity_id
            ${whereClause}
        `;

        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total, 10);

        const pagination = commonConstant.PAGINATION.build({ total, page: pageNo, limit: perPage });

        res.json({
            success: true,
            data: dataResult.rows,
            pagination,
        });

    } catch (error) {
        console.error("Admin Product Logs Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch product logs"
        });
    }
});

router.get("/track/admin/logs/user-score", async (req, res) => {
    try {
        const {
            user_id,
            product_id,
            from_date,
            to_date,
            page = 1,
            limit = 10
        } = req.query;

        const pageNo = Math.max(parseInt(page, 10) || 1, 1);
        const perPage = Math.min(parseInt(limit, 10) || 10, 100);
        const offset = (pageNo - 1) * perPage;

        const EVENT_SCORE_MAP = {
            PRODUCT_VIEW: 5,
            PAGE_VIEW: 5,
            PRODUCT_CLICK: 5,
            BROCHURE_DOWNLOAD: 25,
            CASE_STUDY: 10,
            GALLERY_THUMBNAIL_CLICK: 10,
        };

        let conditions = [
            `ual.entity_type = 'product'`
        ];

        let values = [];
        let idx = 1;

        if (user_id) {
            conditions.push(`ual.user_id = $${idx++}`);
            values.push(user_id);
        }

        if (product_id) {
            conditions.push(`ual.entity_id = $${idx++}`);
            values.push(product_id);
        }

        if (from_date) {
            conditions.push(`ual.created_at >= $${idx++}::timestamptz`);
            values.push(from_date);
        }

        if (to_date) {
            conditions.push(`ual.created_at <= $${idx++}::timestamptz`);
            values.push(to_date);
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;

        const query = `
            SELECT
                ual.user_id,
                ual.entity_id AS product_id,
                u.name AS user_name,
                u.email AS user_email,
                p.name AS product_name,
                ual.event_type,
                COUNT(*) AS event_count
            FROM user_activity_logs ual
            LEFT JOIN users u ON u.id = ual.user_id
            LEFT JOIN products p ON p.id = ual.entity_id
            ${whereClause}
            GROUP BY
                ual.user_id,
                ual.entity_id,
                u.name,
                u.email,
                p.name,
                ual.event_type
            ORDER BY ual.user_id, ual.entity_id
        `;

        const result = await pool.query(query, values);

        /* ---------- SCORE AGGREGATION ---------- */
        const scoreMap = {};

        for (const row of result.rows) {
            const key = `${row.user_id}_${row.product_id}`;

            if (!scoreMap[key]) {
                scoreMap[key] = {
                    user_id: row.user_id,
                    user_name: row.user_name,
                    user_email: row.user_email,
                    product_id: row.product_id,
                    product_name: row.product_name,
                    total_score: 0,
                    breakdown: []
                };
            }

            const weight = EVENT_SCORE_MAP[row.event_type] || 0;
            const count = parseInt(row.event_count, 10);
            const score = count * weight;

            scoreMap[key].total_score += score;

            scoreMap[key].breakdown.push({
                event_type: row.event_type,
                count,
                weight,
                score
            });
        }

        /* ---------- PAGINATION ---------- */
        const allData = Object.values(scoreMap);
        const total = allData.length;
        const paginatedData = allData.slice(offset, offset + perPage);
        const pagination = commonConstant.PAGINATION.build({ total, page: pageNo, limit: perPage });

        res.json({
            success: true,
            filters: {
                user_id: user_id || null,
                product_id: product_id || null,
                from_date,
                to_date
            },
            data: paginatedData,
            pagination
        });

    } catch (error) {
        console.error("User Score Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to calculate user scores"
        });
    }
});

router.get("/track/admin/logs/user-track", async (req, res) => {
    try {
        const {
            user_id,
            product_id,
            from_date,
            to_date,
            page = 1,
            limit = 10
        } = req.query;

        const pageNo = Math.max(parseInt(page, 10) || 1, 1);
        const perPage = Math.min(parseInt(limit, 10) || 10, 100);
        const offset = (pageNo - 1) * perPage;

        const TRACK_EVENTS = ['PAGE_VIEW', 'PAGE_CLICK'];

        let conditions = [
            `ual.entity_type = 'product'`,
            `ual.event_type = ANY($1)`
        ];

        let values = [TRACK_EVENTS];
        let idx = 2;

        if (user_id) {
            conditions.push(`ual.user_id = $${idx++}`);
            values.push(user_id);
        }

        if (product_id) {
            conditions.push(`ual.entity_id = $${idx++}`);
            values.push(product_id);
        }

        if (from_date) {
            conditions.push(`ual.created_at >= $${idx++}::timestamptz`);
            values.push(from_date);
        }

        if (to_date) {
            conditions.push(`ual.created_at <= $${idx++}::timestamptz`);
            values.push(to_date);
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;

        /* ---------- MAIN QUERY ---------- */
        const query = `
            WITH lead_type_summary AS (
                SELECT
                    ual.user_id,
                    ual.entity_id AS product_id,
                    LOWER(ld.type) AS lead_type,
                    COUNT(DISTINCT ld.id) AS lead_type_count
                FROM user_activity_logs ual
                LEFT JOIN lead_details ld
                    ON ld.action_id = ual.entity_id
                AND ld.action_type = 'product'
                ${whereClause}
                GROUP BY
                    ual.user_id,
                    ual.entity_id,
                    LOWER(ld.type)
            )
            SELECT
                ual.user_id,
                ual.entity_id AS product_id,

                CASE 
                    WHEN COUNT(ld.id) > 0 THEN MAX(u.name)
                    ELSE NULL
                END AS user_name,

                CASE 
                    WHEN COUNT(ld.id) > 0 THEN MAX(u.email)
                    ELSE NULL
                END AS user_email,

                MAX(p.name) AS product_name,

                COUNT(*) AS click_count,
                COUNT(DISTINCT ld.id) AS lead_count,

                ARRAY_REMOVE(
                    ARRAY_AGG(DISTINCT LOWER(ld.type)),
                    NULL
                ) AS lead_types,

                COALESCE(
                    JSONB_OBJECT_AGG(
                        lts.lead_type,
                        lts.lead_type_count
                    ) FILTER (WHERE lts.lead_type IS NOT NULL),
                    '{}'::jsonb
                ) AS lead_type_counts

            FROM user_activity_logs ual

            LEFT JOIN lead_details ld
                ON ld.action_id = ual.entity_id
            AND ld.action_type = 'product'

            LEFT JOIN lead_type_summary lts
                ON lts.user_id = ual.user_id
            AND lts.product_id = ual.entity_id

            LEFT JOIN users u ON u.id = ual.user_id
            LEFT JOIN products p ON p.id = ual.entity_id

            ${whereClause}

            GROUP BY
                ual.user_id,
                ual.entity_id

            ORDER BY click_count DESC
            LIMIT ${perPage} OFFSET ${offset}
            `;
        
        const countQuery = `
            SELECT COUNT(DISTINCT (ual.user_id, ual.entity_id, ld.type))
            FROM user_activity_logs ual
            LEFT JOIN lead_details ld
                ON ld.action_id = ual.entity_id
               AND ld.action_type = 'product'
            ${whereClause}
        `;

        const [dataResult, countResult] = await Promise.all([
            pool.query(query, values),
            pool.query(countQuery, values)
        ]);

        const total = parseInt(countResult.rows[0].count, 10);

        res.json({
            success: true,
            data: dataResult.rows,
            pagination: {
                total,
                page: pageNo,
                limit: perPage
            }
        });

    } catch (error) {
        console.error("User Track Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user tracking data"
        });
    }
});



// Seller/Affiliate stats for their dashboard
router.get('/seller/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE 1=1) AS total_leads,
        COUNT(*) FILTER (WHERE status = 'won') AS won_leads,
        COUNT(*) FILTER (WHERE status = 'lost') AS lost_leads,
        COUNT(*) FILTER (WHERE status NOT IN ('won','lost')) AS pending_leads
      FROM lead_details ld
      INNER JOIN lead_assigns la ON la.lead_id = ld.id
      WHERE la.assign_user_id = $1
    `, [userId]);

    return res.status(200).json({ success: true, data: rows[0] || { total_leads: 0, won_leads: 0, lost_leads: 0, pending_leads: 0 } });
  } catch (error) {
    console.error('Seller stats error:', error);
    return res.status(200).json({ success: true, data: { total_leads: 0, won_leads: 0, lost_leads: 0, pending_leads: 0 } });
  }
});

module.exports = router;
