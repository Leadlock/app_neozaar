/**
 * Affiliate Database (Contacts) Controller
 * ─────────────────────────────────────────────────────────────
 * Upload/manage affiliate prospect databases.
 *
 * CRITICAL:
 *   - Uploaded contacts are NOT automatically converted to CRM customers.
 *   - Contacts become customers only after they register.
 *   - Affiliate isolation enforced server-side.
 */
const pool = require('../../config/database');
const { affiliateAuditLog } = require('../../services/affiliate/affiliate.attribution.service');
const crypto = require('crypto');

// The same required fields apply to manual entry and each uploaded contact.
function validateContact(contact) {
  const name = typeof contact?.name === 'string' ? contact.name.trim() : '';
  const email = typeof contact?.email === 'string' ? contact.email.trim().toLowerCase() : '';
  const phone = typeof contact?.phone === 'string' ? contact.phone.trim() : '';
  const missing = [];
  if (!name) missing.push('Name');
  if (!email) missing.push('Business email');
  if (!phone) missing.push('Phone number');
  if (missing.length) return { error: `${missing.join(', ')} required.` };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid business email address.' };
  if (name.length > 255 || email.length > 255 || phone.length > 50) {
    return { error: 'Name and business email must be at most 255 characters; phone number at most 50.' };
  }
  return { value: { ...contact, name, email, phone } };
}

// ── GET /api/affiliate/database ──────────────────────────────────
const getContacts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    // Always scope to the affiliate
    params.push(req.affiliateScopeId);
    conditions.push(`($${params.length}::int IS NULL OR ac.affiliate_id = $${params.length})`);

    if (status) { params.push(status); conditions.push(`ac.status = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(ac.name ILIKE $${params.length} OR ac.email ILIKE $${params.length} OR ac.company ILIKE $${params.length})`);
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT ac.*, u.name AS affiliate_name,
              CASE WHEN ac.crm_lead_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_customer
       FROM affiliate_contacts ac
       LEFT JOIN users u ON u.id = ac.affiliate_id
       WHERE ${where}
       ORDER BY ac.imported_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*) FROM affiliate_contacts ac WHERE ${where}`, params.slice(0, -2)
    );
    res.json({ status: 'success', data: rows, total: parseInt(cnt[0].count) });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── POST /api/affiliate/database/contacts ─────────────────────────
// Add a single contact manually
const addContact = async (req, res) => {
  try {
    const affiliateId = req.affiliateScopeId || req.user.id;
    const validation = validateContact(req.body);
    if (validation.error) {
      return res.status(400).json({ status: 'fail', message: validation.error });
    }
    const { name, email, phone, company, designation, country, industry, notes } = validation.value;

    // Check for duplicate email within this affiliate's database
    let isDuplicate = false;
    let duplicateOf = null;
    if (email) {
      const { rows: dup } = await pool.query(
        `SELECT id FROM affiliate_contacts
         WHERE affiliate_id=$1 AND LOWER(TRIM(email))=LOWER(TRIM($2)) LIMIT 1`,
        [affiliateId, email]
      );
      if (dup.length) { isDuplicate = true; duplicateOf = dup[0].id; }
    }

    // Check if this email already exists as a CRM lead
    let crmLeadId = null;
    if (email) {
      const { rows: lead } = await pool.query(
        `SELECT id FROM crm_leads
         WHERE email_normalized=LOWER(TRIM($1)) AND is_deleted=FALSE LIMIT 1`,
        [email]
      );
      if (lead.length) crmLeadId = lead[0].id;
    }

    const { rows } = await pool.query(
      `INSERT INTO affiliate_contacts
         (affiliate_id, name, email, phone, company, designation, country, industry, notes,
          crm_lead_id, is_duplicate, duplicate_of, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
               CASE WHEN $10::integer IS NOT NULL THEN 'customer' ELSE 'prospect' END)
       RETURNING *`,
      [affiliateId, name, email || null, phone || null, company || null,
       designation || null, country || null, industry || null, notes || null,
       crmLeadId, isDuplicate, duplicateOf]
    );
    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── POST /api/affiliate/database/import ──────────────────────────
// Bulk import contacts from parsed CSV/Excel data
// Expects body: { contacts: [{name, email, phone, company, ...}] }
const importContacts = async (req, res) => {
  try {
    const affiliateId = req.affiliateScopeId || req.user.id;
    const { contacts } = req.body;

    if (!Array.isArray(contacts) || !contacts.length) {
      return res.status(400).json({ status: 'fail', message: 'contacts array is required' });
    }

    const batchId = crypto.randomBytes(8).toString('hex');
    const results = { imported: 0, duplicates: 0, errors: [] };

    for (const [index, input] of contacts.slice(0, 5000).entries()) { // cap at 5000 per batch
      const validation = validateContact(input);
      if (validation.error) {
        results.errors.push({ row_number: index + 1, error: validation.error });
        continue;
      }
      const contact = validation.value;

      try {
        let isDuplicate = false;
        let duplicateOf = null;
        let crmLeadId = null;

        if (contact.email) {
          const emailNorm = contact.email.trim().toLowerCase();
          // Check duplicate in affiliate's database
          const { rows: dup } = await pool.query(
            `SELECT id FROM affiliate_contacts
             WHERE affiliate_id=$1 AND LOWER(TRIM(email))=$2 LIMIT 1`,
            [affiliateId, emailNorm]
          );
          if (dup.length) { isDuplicate = true; duplicateOf = dup[0].id; results.duplicates++; }

          // Check if email is already a CRM lead
          const { rows: lead } = await pool.query(
            `SELECT id FROM crm_leads WHERE email_normalized=$1 AND is_deleted=FALSE LIMIT 1`,
            [emailNorm]
          );
          if (lead.length) crmLeadId = lead[0].id;
        }

        await pool.query(
          `INSERT INTO affiliate_contacts
             (affiliate_id, name, email, phone, company, designation, country, industry,
              crm_lead_id, is_duplicate, duplicate_of, import_batch,
              status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
                   CASE WHEN $9::integer IS NOT NULL THEN 'customer' ELSE 'prospect' END)
           ON CONFLICT DO NOTHING`,
          [affiliateId,
           contact.name,
           contact.email ? contact.email.trim().toLowerCase() : null,
           contact.phone || null, contact.company || null,
           contact.designation || null, contact.country || null, contact.industry || null,
           crmLeadId, isDuplicate, duplicateOf, batchId]
        );
        if (!isDuplicate) results.imported++;
      } catch (rowErr) {
        results.errors.push({ row_number: index + 1, error: rowErr.message });
      }
    }

    affiliateAuditLog({
      actorId: req.user.id,
      action: 'contacts_imported',
      affiliateId,
      entityType: 'affiliate_contacts',
      newValue: { batch_id: batchId, imported: results.imported, duplicates: results.duplicates },
    });

    res.json({ status: 'success', data: results });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── DELETE /api/affiliate/database/contacts/:id ──────────────────
const deleteContact = async (req, res) => {
  try {
    const affiliateId = req.affiliateScopeId;
    await pool.query(
      `DELETE FROM affiliate_contacts WHERE id=$1 AND ($2::int IS NULL OR affiliate_id=$2)`,
      [req.params.id, affiliateId]
    );
    res.json({ status: 'success', message: 'Contact removed' });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

// ── GET /api/affiliate/database/stats ────────────────────────────
const getDatabaseStats = async (req, res) => {
  try {
    const affiliateId = req.affiliateScopeId;
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE is_duplicate=FALSE) AS unique_contacts,
         COUNT(*) FILTER (WHERE is_duplicate=TRUE)  AS duplicates,
         COUNT(*) FILTER (WHERE crm_lead_id IS NOT NULL) AS registered_customers,
         COUNT(*) FILTER (WHERE crm_lead_id IS NULL)     AS unregistered,
         COUNT(*) FILTER (WHERE unsubscribed=TRUE)       AS unsubscribed
       FROM affiliate_contacts
       WHERE ($1::int IS NULL OR affiliate_id=$1)`,
      [affiliateId]
    );
    res.json({ status: 'success', data: rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

module.exports = {
  getContacts,
  addContact,
  importContacts,
  deleteContact,
  getDatabaseStats,
};
