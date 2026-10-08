const pool = require('../../config/database');

/**
 * Friendly action labels for notifications
 */
const ACTION_LABELS = {
  'CREATE_CONTACT': 'created a new contact',
  'UPDATE_CONTACT': 'updated a contact',
  'DELETE_CONTACT': 'deleted a contact',
  'CREATE_LEAD': 'created a new lead',
  'UPDATE_LEAD': 'updated a lead',
  'DELETE_LEAD': 'deleted a lead',
  'ASSIGN_LEAD': 'assigned a lead',
  'CONVERT_LEAD': 'converted a lead',
  'CREATE_OPPORTUNITY': 'created a new opportunity',
  'UPDATE_OPPORTUNITY': 'updated an opportunity',
  'DELETE_OPPORTUNITY': 'deleted an opportunity',
  'ASSIGN_SELLER': 'assigned a seller to an opportunity',
  'CREATE_ACTIVITY': 'logged an activity',
  'DELETE_ACTIVITY': 'deleted an activity',
  'CREATE_TASK': 'created a task',
  'UPDATE_TASK': 'updated a task',
  'DELETE_TASK': 'deleted a task',
};

const auditLog = async (userId, action, entityType, entityId, oldValues, newValues, req) => {
  try {
    await pool.query(
      `INSERT INTO crm_audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        req?.ip || null,
        req?.headers?.['user-agent'] || null,
      ]
    );

    // If the acting user is a SELLER, notify M_SELLER and ADMIN users
    if (req?.user?.role_type === 'SELLER') {
      await notifyManagersOfSellerAction(userId, req.user.name || 'Seller', action, entityType, entityId);
    }
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
};

/**
 * Notify M_SELLER and ADMIN/SUPER_ADMIN users when a SELLER performs a CRM action
 */
async function notifyManagersOfSellerAction(sellerId, sellerName, action, entityType, entityId) {
  try {
    const actionLabel = ACTION_LABELS[action] || action.toLowerCase().replace(/_/g, ' ');
    const title = `Seller Activity: ${sellerName}`;
    const message = `${sellerName} ${actionLabel} (${entityType} #${entityId})`;

    // Get all M_SELLER, ADMIN, SUPER_ADMIN users (except the acting seller)
    const { rows: managers } = await pool.query(
      `SELECT id FROM users
       WHERE role_type IN ('M_SELLER', 'ADMIN', 'SUPER_ADMIN')
         AND is_active = true
         AND id != $1`,
      [sellerId]
    );

    if (!managers.length) return;

    // Batch insert notifications
    const values = managers.map((_, i) =>
      `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
    ).join(',');

    const params = managers.flatMap(m => [
      m.id,
      'seller_activity',
      title,
      message,
      entityType.toLowerCase(),
      entityId
    ]);

    await pool.query(
      `INSERT INTO crm_notifications (user_id, type, title, message, entity_type, entity_id)
       VALUES ${values}`,
      params
    );
  } catch (e) {
    console.error('notifyManagersOfSellerAction error:', e.message);
  }
}

module.exports = { auditLog, notifyManagersOfSellerAction };
