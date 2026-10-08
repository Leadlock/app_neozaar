const pool = require('../config/database');
const emailService = require('../config/mail');

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'A_MANAGER', 'M_SELLER'];
const ITEM_TYPES = ['product', 'service', 'solution', 'category'];
const isId = value => /^(?:[1-9]\d*)$/.test(String(value)) && Number.isSafeInteger(Number(value));

// Serialize changes per recipient and keep the old assignments if any insert fails.
const saveAssignments = (replace = false) => async (req, res) => {
  if (!MANAGER_ROLES.includes(req.user?.role_type)) {
    return res.status(403).json({ success: false, message: 'Manager access is required to assign catalog items' });
  }
  const { seller_id, items } = req.body;
  if (!isId(seller_id) || !Array.isArray(items) || (!replace && !items.length)) {
    return res.status(400).json({ success: false, message: 'A valid affiliate or seller and an items array are required' });
  }
  const unique = new Map();
  for (const item of items) {
    if (!item || !ITEM_TYPES.includes(item.item_type) || !isId(item.item_id) ||
        (item.allowed_types != null && (!Array.isArray(item.allowed_types) ||
          item.allowed_types.some(type => !['product', 'service', 'solution'].includes(type))))) {
      return res.status(400).json({ success: false, message: 'Invalid catalog item or category type filter' });
    }
    unique.set(`${item.item_type}:${Number(item.item_id)}`, {
      item_type: item.item_type,
      item_id: Number(item.item_id),
      allowed_types: item.item_type === 'category' && item.allowed_types?.length
        ? [...new Set(item.allowed_types)] : null,
    });
  }
  const normalized = [...unique.values()];
  let client;
  let recipient;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, name, email FROM users
       WHERE id=$1 AND role_type IN ('AGENT','ISV_SELLER','SELLER') AND is_active=true
       FOR UPDATE`, [seller_id]
    );
    recipient = rows[0];
    if (!recipient) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Affiliate or seller no longer exists or is inactive. Refresh the list and select the current account.' });
    }
    const invalid = await client.query(
      `SELECT i.item_id FROM jsonb_to_recordset($1::jsonb) AS i(item_type text, item_id integer)
       WHERE (i.item_type = 'category' AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.id=i.item_id))
          OR (i.item_type <> 'category' AND NOT EXISTS (
            SELECT 1 FROM products p WHERE p.id=i.item_id AND p.action_type=i.item_type AND p.deleted_at IS NULL
          ))`, [JSON.stringify(normalized)]
    );
    if (invalid.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'One or more selected items no longer exist or have the wrong type. Reload the assignment options.' });
    }
    if (replace) {
      // This screen replaces catalog selections only; preserve separately managed ISV assignments.
      await client.query("DELETE FROM seller_assignments WHERE seller_id=$1 AND item_type IN ('category','product','service','solution')", [seller_id]);
    }
    if (normalized.length) {
      await client.query(
        `INSERT INTO seller_assignments (seller_id, item_type, item_id, assigned_by, allowed_types)
         SELECT $1, i.item_type, i.item_id, $2, i.allowed_types
         FROM jsonb_to_recordset($3::jsonb) AS i(item_type text, item_id integer, allowed_types text[])
         ON CONFLICT (seller_id, item_type, item_id) DO UPDATE
           SET allowed_types=EXCLUDED.allowed_types, assigned_by=EXCLUDED.assigned_by, assigned_at=NOW()`,
        [seller_id, req.user.id, JSON.stringify(normalized)]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Save seller assignments failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to save assignments. Existing assignments have been preserved.' });
  } finally {
    if (client) client.release();
  }
  // Notification failure must not turn a committed save into an apparent failure.
  try {
    await emailService.sendSellerAssignmentEmail(recipient.email, recipient.name, normalized.length);
  } catch (error) {
    console.error('Seller assignment notification failed:', error);
  }
  return res.status(200).json({ success: true, message: 'Assignments saved' });
};

module.exports = { saveAssignments };
