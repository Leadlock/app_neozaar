const pool = require('../../config/database');
const { auditLog } = require('./audit.helper');

const SELLER_ROLES = ['M_SELLER', 'ISV_SELLER', 'SELLER', 'AGENT', 'A_MANAGER', 'ISV', 'SUPPORT_PARTNER'];

// Roles that only see their own data (M_SELLER sees all SELLER data, so excluded from ownership filter)
const OWNERSHIP_RESTRICTED_ROLES = ['ISV_SELLER', 'SELLER', 'AGENT', 'A_MANAGER', 'ISV', 'SUPPORT_PARTNER'];

const getContacts = async (req, res) => {
  try {
    const { search, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['c.is_deleted = FALSE'];
    const params = [];

    if (OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type)) {
      params.push(req.user.id);
      // A SELLER sees contacts they own OR linked to their assigned opportunities
      // (direct contact_id OR via the lead row, for older records without contact_id set)
      conditions.push(`(c.owner_id = $${params.length} OR c.id IN (
        SELECT contact_id FROM crm_opportunities
        WHERE seller_id = $${params.length} AND is_deleted = FALSE AND contact_id IS NOT NULL
        UNION
        SELECT l.contact_id FROM crm_opportunities o
        JOIN crm_leads l ON l.id = o.lead_id
        WHERE o.seller_id = $${params.length} AND o.is_deleted = FALSE AND l.contact_id IS NOT NULL
      ))`);
    }
    if (type) { params.push(type); conditions.push(`c.type = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(c.name ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.company ILIKE $${params.length})`); }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT c.*, u.name AS owner_name, a.name AS account_name FROM crm_contacts c
       LEFT JOIN users u ON u.id = c.owner_id
       LEFT JOIN crm_accounts a ON a.id = c.account_id
       WHERE ${where} ORDER BY c.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`, params
    );
    const { rows: cnt } = await pool.query(`SELECT COUNT(*) FROM crm_contacts c WHERE ${where}`, params.slice(0,-2));
    res.json({ status: 'success', data: rows, total: parseInt(cnt[0].count) });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const getContactById = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS owner_name, a.name AS account_name FROM crm_contacts c
       LEFT JOIN users u ON u.id = c.owner_id
       LEFT JOIN crm_accounts a ON a.id = c.account_id
       WHERE c.id=$1 AND c.is_deleted=FALSE`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Contact not found' });
    // SELLER: allow if they own the contact OR have an opportunity assigned to it
    if (OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type) && rows[0].owner_id !== req.user.id) {
      const { rows: oppCheck } = await pool.query(
        'SELECT 1 FROM crm_opportunities WHERE seller_id=$1 AND contact_id=$2 AND is_deleted=FALSE LIMIT 1',
        [req.user.id, req.params.id]
      );
      if (!oppCheck.length)
        return res.status(403).json({ status: 'fail', message: 'Access denied' });
    }
    res.json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const createContact = async (req, res) => {
  try {
    const { name, email, phone, whatsapp, company, designation, country, industry, website, type, owner_id, account_id, notes } = req.body;

    // If an email is supplied, check for an existing active contact first.
    // The unique index uq_crm_contacts_email_active prevents duplicate active emails,
    // so return the existing record rather than crashing with a 500.
    if (email && email.trim()) {
      const { rows: existing } = await pool.query(
        `SELECT * FROM crm_contacts WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND is_deleted = FALSE LIMIT 1`,
        [email]
      );
      if (existing.length) {
        return res.status(200).json({ status: 'success', data: existing[0], existing: true });
      }
    }

    // Resolve account_id — use supplied one, or find/create by email then company name
    let resolvedAccountId = account_id || null;
    if (!resolvedAccountId) {
      let existingAccId = null;
      if (email && email.trim()) {
        const { rows: accByEmail } = await pool.query(
          'SELECT id FROM crm_accounts WHERE LOWER(TRIM(email))=LOWER(TRIM($1)) AND is_deleted=FALSE LIMIT 1',
          [email]
        );
        if (accByEmail.length) existingAccId = accByEmail[0].id;
      }
      if (!existingAccId && company && company.trim()) {
        const { rows: accByName } = await pool.query(
          'SELECT id FROM crm_accounts WHERE LOWER(TRIM(name))=LOWER(TRIM($1)) AND is_deleted=FALSE LIMIT 1',
          [company]
        );
        if (accByName.length) existingAccId = accByName[0].id;
      }
      if (existingAccId) {
        resolvedAccountId = existingAccId;
      } else if (company && company.trim()) {
        // Auto-create a Prospect account from the contact's company details
        const accName = company || name || (email ? email.split('@')[0] : 'Unknown');
        const { rows: newAcc } = await pool.query(
          `INSERT INTO crm_accounts (name, email, phone, type, industry, country, owner_id, created_by, updated_by)
           VALUES ($1,$2,$3,'Prospect',$4,$5,$6,$6,$6) RETURNING id`,
          [accName, email || null, phone || null, industry || null, country || null, owner_id || req.user.id]
        );
        resolvedAccountId = newAcc[0].id;
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO crm_contacts (name,email,phone,whatsapp,company,designation,country,industry,website,type,owner_id,account_id,notes,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14) RETURNING *`,
      [name, email || null, phone, whatsapp, company, designation, country, industry, website, type||'lead', owner_id||req.user.id, resolvedAccountId, notes, req.user.id]
    );
    await auditLog(req.user.id, 'CREATE_CONTACT', 'Contact', rows[0].id, null, rows[0], req);
    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const updateContact = async (req, res) => {
  try {
    const { rows: ex } = await pool.query('SELECT * FROM crm_contacts WHERE id=$1 AND is_deleted=FALSE', [req.params.id]);
    if (!ex.length) return res.status(404).json({ status: 'fail', message: 'Contact not found' });
    if (OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type) && ex[0].owner_id !== req.user.id)
      return res.status(403).json({ status: 'fail', message: 'Access denied' });

    const fields = ['name','email','phone','whatsapp','company','designation','country','industry','website','type','owner_id','account_id','notes'];
    const updates = []; const params = [];
    fields.forEach(f => { if (req.body[f] !== undefined) { params.push(req.body[f]); updates.push(`${f}=$${params.length}`); } });
    params.push(req.user.id, new Date(), req.params.id);
    updates.push(`updated_by=$${params.length-2}`, `updated_at=$${params.length-1}`);

    const { rows } = await pool.query(`UPDATE crm_contacts SET ${updates.join(',')} WHERE id=$${params.length} RETURNING *`, params);
    await auditLog(req.user.id, 'UPDATE_CONTACT', 'Contact', rows[0].id, ex[0], rows[0], req);
    res.json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const deleteContact = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE crm_contacts SET is_deleted=TRUE, updated_by=$1, updated_at=NOW() WHERE id=$2 AND is_deleted=FALSE RETURNING id',
      [req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Contact not found' });
    await auditLog(req.user.id, 'DELETE_CONTACT', 'Contact', req.params.id, null, null, req);
    res.json({ status: 'success', message: 'Contact deleted' });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

module.exports = { getContacts, getContactById, createContact, updateContact, deleteContact };
