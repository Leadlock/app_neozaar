/**
 * CRM Notifications Controller
 * ─────────────────────────────────────────────────────────────
 * Read/Unread management for crm_notifications.
 * Users only see their own notifications.
 */
const pool = require('../../config/database');

/**
 * GET /api/internal/crm/notifications
 * Returns notifications for the authenticated user.
 * Query: ?unread_only=true&page=1&limit=20
 */
const getNotifications = async (req, res) => {
  try {
    const { unread_only, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [`user_id=$1`];
    const params = [req.user.id];

    if (unread_only === 'true') conditions.push('is_read=FALSE');

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT * FROM crm_notifications
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*) FROM crm_notifications WHERE ${where}`,
      params.slice(0, -2)
    );
    const { rows: unread } = await pool.query(
      'SELECT COUNT(*) FROM crm_notifications WHERE user_id=$1 AND is_read=FALSE',
      [req.user.id]
    );

    res.json({
      status: 'success',
      data: rows,
      total: parseInt(cnt[0].count),
      unread_count: parseInt(unread[0].count),
    });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * PUT /api/internal/crm/notifications/:id/read
 * Mark a single notification as read.
 */
const markAsRead = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE crm_notifications
       SET is_read=TRUE, read_at=NOW()
       WHERE id=$1 AND user_id=$2
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Notification not found' });
    res.json({ status: 'success' });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * PUT /api/internal/crm/notifications/:id/unread
 * Mark a single notification as unread.
 */
const markAsUnread = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE crm_notifications
       SET is_read=FALSE, read_at=NULL
       WHERE id=$1 AND user_id=$2
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Notification not found' });
    res.json({ status: 'success' });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * PUT /api/internal/crm/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
const markAllAsRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE crm_notifications SET is_read=TRUE, read_at=NOW()
       WHERE user_id=$1 AND is_read=FALSE`,
      [req.user.id]
    );
    res.json({ status: 'success', message: 'All notifications marked as read' });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

module.exports = { getNotifications, markAsRead, markAsUnread, markAllAsRead };
