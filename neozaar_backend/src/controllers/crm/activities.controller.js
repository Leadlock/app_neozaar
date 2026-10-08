const pool = require('../../config/database');
const { auditLog } = require('./audit.helper');

const SELLER_ROLES = ['M_SELLER', 'ISV_SELLER', 'SELLER', 'AGENT', 'A_MANAGER', 'ISV', 'SUPPORT_PARTNER'];

// ─── ACTIVITIES (v2 schema: entity_type/entity_id, no is_deleted) ─────

const getActivities = async (req, res) => {
  try {
    const { entity_type, entity_id, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['1=1'];
    const params = [];

    if (SELLER_ROLES.includes(req.user.role_type)) { params.push(req.user.id); conditions.push(`a.owner_id = $${params.length}`); }
    if (entity_type) { params.push(entity_type); conditions.push(`a.entity_type = $${params.length}`); }
    if (entity_id) { params.push(entity_id); conditions.push(`a.entity_id = $${params.length}`); }
    if (type) { params.push(type); conditions.push(`a.type = $${params.length}`); }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT a.*, u.name AS owner_name FROM crm_activities a
       LEFT JOIN users u ON u.id = a.owner_id
       WHERE ${where} ORDER BY a.activity_date DESC NULLS LAST, a.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`, params
    );
    res.json({ status: 'success', data: rows });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const createActivity = async (req, res) => {
  try {
    const { type, subject, description, entity_type, entity_id, contact_id, owner_id, activity_date, duration_minutes, outcome } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO crm_activities (entity_type, entity_id, contact_id, type, subject, description, owner_id, activity_date, duration_minutes, outcome, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [entity_type||'lead', entity_id, contact_id, type, subject, description, owner_id||req.user.id, activity_date||new Date(), duration_minutes, outcome, req.user.id]
    );
    await auditLog(req.user.id, 'CREATE_ACTIVITY', 'Activity', rows[0].id, null, rows[0], req);
    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const deleteActivity = async (req, res) => {
  try {
    await pool.query('DELETE FROM crm_activities WHERE id=$1', [req.params.id]);
    res.json({ status: 'success', message: 'Activity deleted' });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

// ─── TASKS (v2 schema: entity_type/entity_id) ────────────────────────

const getTasks = async (req, res) => {
  try {
    const { status, priority, owner_id, entity_type, entity_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['t.is_deleted = FALSE'];
    const params = [];

    if (SELLER_ROLES.includes(req.user.role_type)) { params.push(req.user.id); conditions.push(`t.owner_id = $${params.length}`); }
    else if (owner_id) { params.push(owner_id); conditions.push(`t.owner_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`t.status = $${params.length}`); }
    if (priority) { params.push(priority); conditions.push(`t.priority = $${params.length}`); }
    if (entity_type) { params.push(entity_type); conditions.push(`t.entity_type = $${params.length}`); }
    if (entity_id) { params.push(entity_id); conditions.push(`t.entity_id = $${params.length}`); }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT t.*, u.name AS owner_name FROM crm_tasks t
       LEFT JOIN users u ON u.id = t.owner_id
       WHERE ${where} ORDER BY t.due_date ASC NULLS LAST
       LIMIT $${params.length-1} OFFSET $${params.length}`, params
    );
    res.json({ status: 'success', data: rows });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const createTask = async (req, res) => {
  try {
    const { title, description, owner_id, entity_type, entity_id, contact_id, priority, due_date, reminder_at, status } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO crm_tasks (title, description, owner_id, entity_type, entity_id, contact_id, priority, due_date, reminder_at, status, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING *`,
      [title, description, owner_id||req.user.id, entity_type, entity_id, contact_id, priority||'Medium', due_date, reminder_at, status||'Open', req.user.id]
    );
    await auditLog(req.user.id, 'CREATE_TASK', 'Task', rows[0].id, null, rows[0], req);
    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const updateTask = async (req, res) => {
  try {
    const { rows: ex } = await pool.query('SELECT * FROM crm_tasks WHERE id=$1 AND is_deleted=FALSE', [req.params.id]);
    if (!ex.length) return res.status(404).json({ status: 'fail', message: 'Task not found' });
    if (SELLER_ROLES.includes(req.user.role_type) && ex[0].owner_id !== req.user.id)
      return res.status(403).json({ status: 'fail', message: 'Access denied' });

    const fields = ['title','description','owner_id','entity_type','entity_id','contact_id','priority','due_date','reminder_at','status','completion_notes'];
    const updates = []; const params = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { params.push(req.body[f]); updates.push(`${f}=$${params.length}`); } });
    if (req.body.status === 'Completed') { params.push(new Date()); updates.push(`completed_at=$${params.length}`); }
    params.push(req.user.id, new Date(), req.params.id);
    updates.push(`updated_by=$${params.length-2}`, `updated_at=$${params.length-1}`);

    const { rows } = await pool.query(`UPDATE crm_tasks SET ${updates.join(',')} WHERE id=$${params.length} RETURNING *`, params);
    await auditLog(req.user.id, 'UPDATE_TASK', 'Task', rows[0].id, ex[0], rows[0], req);
    res.json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const deleteTask = async (req, res) => {
  try {
    await pool.query('UPDATE crm_tasks SET is_deleted=TRUE, updated_by=$1, updated_at=NOW() WHERE id=$2', [req.user.id, req.params.id]);
    res.json({ status: 'success', message: 'Task deleted' });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

module.exports = { getActivities, createActivity, deleteActivity, getTasks, createTask, updateTask, deleteTask };
