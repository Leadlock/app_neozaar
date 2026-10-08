const pool = require('../../config/database');

// GET /api/internal/crm/users
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role_type, is_active, created_at 
       FROM users ORDER BY created_at DESC`
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to fetch users' });
  }
};

// PUT /api/internal/crm/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_type } = req.body;
    if (!role_type) return res.status(400).json({ status: 'fail', message: 'role_type required' });

    await pool.query('UPDATE users SET role_type = $1 WHERE id = $2', [role_type, id]);
    res.json({ status: 'success', message: 'Role updated' });
  } catch (err) {
    console.error('updateUserRole error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to update role' });
  }
};

// GET /api/internal/crm/users/:id/permissions
const getUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await pool.query('SELECT id, name, email, role_type FROM users WHERE id = $1', [id]);
    if (!userResult.rows.length) return res.status(404).json({ status: 'fail', message: 'User not found' });

    // Check if crm_user_permissions table exists, if not return empty
    let permissions = [];
    try {
      const permResult = await pool.query(
        'SELECT permission FROM crm_user_permissions WHERE user_id = $1', [id]
      );
      permissions = permResult.rows.map(r => r.permission);
    } catch (e) {
      // Table may not exist yet — return empty permissions
      permissions = [];
    }

    res.json({ status: 'success', data: { user: userResult.rows[0], permissions } });
  } catch (err) {
    console.error('getUserPermissions error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to fetch permissions' });
  }
};

// PUT /api/internal/crm/users/:id/permissions
const updateUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return res.status(400).json({ status: 'fail', message: 'permissions array required' });

    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_user_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        permission VARCHAR(100) NOT NULL,
        granted_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, permission)
      )
    `);

    // Delete existing and re-insert
    await pool.query('DELETE FROM crm_user_permissions WHERE user_id = $1', [id]);
    
    if (permissions.length > 0) {
      const values = permissions.map((p, i) => `($1, $${i + 2}, $${permissions.length + 2})`).join(',');
      const params = [id, ...permissions, req.user.id];
      await pool.query(
        `INSERT INTO crm_user_permissions (user_id, permission, granted_by) VALUES ${values}`,
        params
      );
    }

    res.json({ status: 'success', message: 'Permissions updated' });
  } catch (err) {
    console.error('updateUserPermissions error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to update permissions' });
  }
};

module.exports = { getUsers, updateUserRole, getUserPermissions, updateUserPermissions };
