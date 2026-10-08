const pool = require('../../config/database');
const { auditLog } = require('./audit.helper');

// M_SELLER sees all accounts (no row filter). Only row-level restricted roles get filtered.
const OWNERSHIP_RESTRICTED_ROLES = ['ISV_SELLER', 'SELLER', 'AGENT', 'A_MANAGER', 'ISV', 'SUPPORT_PARTNER'];

const getAccounts = async (req, res) => {
  try {
    const { type, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['a.is_deleted = FALSE'];
    const params = [];

    if (OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type)) {
      params.push(req.user.id);
      // A SELLER sees accounts they own OR linked to their assigned opportunities
      // (direct account_id OR via the lead row, for older records without account_id set)
      conditions.push(`(a.owner_id = $${params.length} OR a.id IN (
        SELECT account_id FROM crm_opportunities
        WHERE seller_id = $${params.length} AND is_deleted = FALSE AND account_id IS NOT NULL
        UNION
        SELECT l.account_id FROM crm_opportunities o
        JOIN crm_leads l ON l.id = o.lead_id
        WHERE o.seller_id = $${params.length} AND o.is_deleted = FALSE AND l.account_id IS NOT NULL
      ))`);
    }
    if (type) { params.push(type); conditions.push(`a.type = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`a.name ILIKE $${params.length}`); }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT a.*, u.name AS owner_name FROM crm_accounts a
       LEFT JOIN users u ON u.id = a.owner_id
       WHERE ${where} ORDER BY a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`, params
    );
    const { rows: c } = await pool.query(`SELECT COUNT(*) FROM crm_accounts a WHERE ${where}`, params.slice(0,-2));
    res.json({ status: 'success', data: rows, total: parseInt(c[0].count) });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const getAccountById = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, u.name AS owner_name FROM crm_accounts a
       LEFT JOIN users u ON u.id = a.owner_id
       WHERE a.id=$1 AND a.is_deleted=FALSE`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Account not found' });
    // SELLER: allow if they own the account OR have an opportunity assigned to it
    if (OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type)) {
      const uid = req.user.id;
      if (rows[0].owner_id !== uid) {
        const { rows: oppCheck } = await pool.query(
          'SELECT 1 FROM crm_opportunities WHERE seller_id=$1 AND account_id=$2 AND is_deleted=FALSE LIMIT 1',
          [uid, req.params.id]
        );
        if (!oppCheck.length)
          return res.status(403).json({ status: 'fail', message: 'Access denied' });
      }
    }

    const { rows: contacts } = await pool.query(
      'SELECT * FROM crm_contacts WHERE account_id=$1 AND is_deleted=FALSE', [req.params.id]
    );
    const { rows: opps } = await pool.query(
      'SELECT * FROM crm_opportunities WHERE account_id=$1 AND is_deleted=FALSE', [req.params.id]
    );
    res.json({ status: 'success', data: { ...rows[0], contacts, opportunities: opps } });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const createAccount = async (req, res) => {
  try {
    const { name,type,industry,country,website,phone,email,address,owner_id,annual_revenue,employee_count,cloud_preference,edp_eligible,macc_eligible,notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO crm_accounts (name,type,industry,country,website,phone,email,address,owner_id,annual_revenue,employee_count,cloud_preference,edp_eligible,macc_eligible,notes,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16) RETURNING *`,
      [name,type,industry,country,website,phone,email,address,owner_id||req.user.id,annual_revenue,employee_count,cloud_preference,edp_eligible||false,macc_eligible||false,notes,req.user.id]
    );
    await auditLog(req.user.id, 'CREATE_ACCOUNT', 'Account', rows[0].id, null, rows[0], req);
    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const updateAccount = async (req, res) => {
  try {
    const { rows: ex } = await pool.query('SELECT * FROM crm_accounts WHERE id=$1 AND is_deleted=FALSE', [req.params.id]);
    if (!ex.length) return res.status(404).json({ status: 'fail', message: 'Account not found' });
    if (OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type) && ex[0].owner_id !== req.user.id)
      return res.status(403).json({ status: 'fail', message: 'Access denied' });

    const fields = ['name','type','industry','country','website','phone','email','address','owner_id','annual_revenue','employee_count','cloud_preference','edp_eligible','macc_eligible','notes'];
    const updates = []; const params = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { params.push(req.body[f]); updates.push(`${f}=$${params.length}`); } });
    params.push(req.user.id, new Date(), req.params.id);
    updates.push(`updated_by=$${params.length-2}`, `updated_at=$${params.length-1}`);

    const { rows } = await pool.query(`UPDATE crm_accounts SET ${updates.join(',')} WHERE id=$${params.length} RETURNING *`, params);

    // Sync company name to linked contacts and company_detail when name changes
    if (req.body.name && req.body.name !== ex[0].name) {
      await pool.query(
        'UPDATE crm_contacts SET company=$1, updated_at=NOW() WHERE account_id=$2 AND is_deleted=FALSE',
        [req.body.name, req.params.id]
      );
      await pool.query(
        `UPDATE company_detail SET company_name=$1, updated_at=NOW()
         WHERE action_id::bigint=(SELECT id FROM users WHERE LOWER(TRIM(email))=LOWER(TRIM($2)) LIMIT 1)
         AND action_type='CLIENT'`,
        [req.body.name, rows[0].email]
      );
    }

    await auditLog(req.user.id, 'UPDATE_ACCOUNT', 'Account', rows[0].id, ex[0], rows[0], req);
    res.json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const deleteAccount = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE crm_accounts SET is_deleted=TRUE, updated_by=$1, updated_at=NOW() WHERE id=$2 AND is_deleted=FALSE RETURNING id',
      [req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Account not found' });
    await auditLog(req.user.id, 'DELETE_ACCOUNT', 'Account', req.params.id, null, null, req);
    res.json({ status: 'success', message: 'Account deleted' });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

module.exports = { getAccounts, getAccountById, createAccount, updateAccount, deleteAccount };
