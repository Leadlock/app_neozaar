const pool = require('../../config/database');

// Ensure tables exist
const ensureTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      permissions JSONB DEFAULT '[]',
      is_system BOOLEAN DEFAULT FALSE,
      role_types JSONB DEFAULT '[]',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE crm_roles ADD COLUMN IF NOT EXISTS role_types JSONB DEFAULT '[]'`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_user_roles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES crm_roles(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id),
      assigned_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, role_id)
    )
  `);
};

// GET /api/internal/crm/roles
const getRoles = async (req, res) => {
  try {
    await ensureTables();
    // user_count = users whose role_type is in the crm_role's role_types array
    // For roles with no role_types mapping, fall back to the crm_user_roles join table
    const { rows } = await pool.query(
      `SELECT r.*,
        CASE
          WHEN jsonb_array_length(COALESCE(r.role_types, '[]'::jsonb)) > 0
          THEN (
            SELECT COUNT(*) FROM users u
            WHERE u.role_type = ANY(
              SELECT jsonb_array_elements_text(r.role_types)
            )
            AND u.is_active = TRUE
          )
          ELSE (SELECT COUNT(*) FROM crm_user_roles ur WHERE ur.role_id = r.id)
        END AS user_count
       FROM crm_roles r ORDER BY r.is_system DESC, r.id ASC`
    );
    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('getRoles error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to fetch roles' });
  }
};

// POST /api/internal/crm/roles
const createRole = async (req, res) => {
  try {
    await ensureTables();
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ status: 'fail', message: 'Role name required' });

    const { rows } = await pool.query(
      `INSERT INTO crm_roles (name, description, permissions, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description || '', JSON.stringify(permissions || []), req.user.id]
    );
    res.json({ status: 'success', data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ status: 'fail', message: 'Role name already exists' });
    console.error('createRole error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to create role' });
  }
};

// PUT /api/internal/crm/roles/:id
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    await pool.query(
      `UPDATE crm_roles SET name=$1, description=$2, permissions=$3, updated_at=NOW() WHERE id=$4`,
      [name, description || '', JSON.stringify(permissions || []), id]
    );
    res.json({ status: 'success', message: 'Role updated' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ status: 'fail', message: 'Role name already exists' });
    console.error('updateRole error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to update role' });
  }
};

// DELETE /api/internal/crm/roles/:id
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    // Don't allow deleting system roles
    const { rows } = await pool.query('SELECT is_system FROM crm_roles WHERE id=$1', [id]);
    if (rows[0]?.is_system) return res.status(400).json({ status: 'fail', message: 'Cannot delete system role' });

    await pool.query('DELETE FROM crm_user_roles WHERE role_id=$1', [id]);
    await pool.query('DELETE FROM crm_roles WHERE id=$1', [id]);
    res.json({ status: 'success', message: 'Role deleted' });
  } catch (err) {
    console.error('deleteRole error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to delete role' });
  }
};

// GET /api/internal/crm/roles/:id/users
const getRoleUsers = async (req, res) => {
  try {
    await ensureTables();
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role_type, ur.assigned_at
       FROM crm_user_roles ur JOIN users u ON ur.user_id = u.id
       WHERE ur.role_id = $1 ORDER BY u.name`,
      [req.params.id]
    );
    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('getRoleUsers error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to fetch role users' });
  }
};

// POST /api/internal/crm/roles/:id/users
const addUserToRole = async (req, res) => {
  try {
    await ensureTables();
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ status: 'fail', message: 'user_id required' });

    await pool.query(
      `INSERT INTO crm_user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [user_id, req.params.id, req.user.id]
    );
    res.json({ status: 'success', message: 'User added to role' });
  } catch (err) {
    console.error('addUserToRole error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to add user to role' });
  }
};

// DELETE /api/internal/crm/roles/:id/users/:userId
const removeUserFromRole = async (req, res) => {
  try {
    await pool.query('DELETE FROM crm_user_roles WHERE role_id=$1 AND user_id=$2', [req.params.id, req.params.userId]);
    res.json({ status: 'success', message: 'User removed from role' });
  } catch (err) {
    console.error('removeUserFromRole error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to remove user' });
  }
};

module.exports = { getRoles, createRole, updateRole, deleteRole, getRoleUsers, addUserToRole, removeUserFromRole };
