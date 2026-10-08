const pool = require('../../config/database');

// GET /api/internal/crm/invoices
const getInvoices = async (req, res) => {
  try {
    const { search, status } = req.query;
    const conditions = ['i.id IS NOT NULL'];
    const params = [];

    if (status) { params.push(status); conditions.push(`i.status = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(i.invoice_number ILIKE $${params.length} OR c.name ILIKE $${params.length} OR c.company ILIKE $${params.length})`
      );
    }

    const where = conditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT i.*,
              c.name    AS contact_name,
              c.company AS contact_company,
              c.email   AS contact_email,
              u.name    AS owner_name
       FROM crm_invoices i
       LEFT JOIN crm_contacts c ON c.id = i.contact_id
       LEFT JOIN users        u ON u.id = i.owner_id
       WHERE ${where}
       ORDER BY i.created_at DESC`,
      params
    );
    res.json({ status: 'success', data: rows });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

// POST /api/internal/crm/invoices
const createInvoice = async (req, res) => {
  try {
    const {
      sales_order_id, opportunity_id, contact_id, invoice_number,
      items, subtotal, discount, tax, total,
      amount_paid, status = 'Draft', due_date, notes,
    } = req.body;

    const invoiceNum  = invoice_number || `INV-${Date.now().toString().slice(-8)}`;
    const amountPaid  = amount_paid || 0;
    const amountDue   = (total || 0) - amountPaid;

    const { rows } = await pool.query(
      `INSERT INTO crm_invoices
         (sales_order_id, opportunity_id, contact_id, invoice_number,
          items, subtotal, discount, tax, total,
          amount_paid, amount_due, status, due_date, notes,
          owner_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)
       RETURNING *`,
      [
        sales_order_id || null, opportunity_id || null, contact_id || null,
        invoiceNum, JSON.stringify(items || []),
        subtotal || 0, discount || 0, tax || 0, total || 0,
        amountPaid, amountDue, status, due_date || null, notes || null,
        req.user.id,
      ]
    );
    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

// PUT /api/internal/crm/invoices/:id
const updateInvoice = async (req, res) => {
  try {
    const {
      invoice_number, items, subtotal, discount, tax, total,
      amount_paid, status, due_date, notes,
    } = req.body;

    const amountDue = total != null && amount_paid != null ? total - amount_paid : null;
    const paidAt    = status === 'Paid' ? new Date() : null;

    const { rows } = await pool.query(
      `UPDATE crm_invoices SET
         invoice_number = COALESCE($1,  invoice_number),
         items          = COALESCE($2,  items),
         subtotal       = COALESCE($3,  subtotal),
         discount       = COALESCE($4,  discount),
         tax            = COALESCE($5,  tax),
         total          = COALESCE($6,  total),
         amount_paid    = COALESCE($7,  amount_paid),
         amount_due     = COALESCE($8,  amount_due),
         status         = COALESCE($9,  status),
         due_date       = COALESCE($10, due_date),
         notes          = COALESCE($11, notes),
         paid_at        = COALESCE($12, paid_at),
         updated_at     = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        invoice_number || null,
        items ? JSON.stringify(items) : null,
        subtotal ?? null, discount ?? null, tax ?? null, total ?? null,
        amount_paid ?? null, amountDue,
        status || null, due_date || null, notes ?? null,
        paidAt,
        req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Invoice not found' });
    res.json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

// DELETE /api/internal/crm/invoices/:id
const deleteInvoice = async (req, res) => {
  try {
    await pool.query('DELETE FROM crm_invoices WHERE id=$1', [req.params.id]);
    res.json({ status: 'success', message: 'Invoice deleted' });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

module.exports = { getInvoices, createInvoice, updateInvoice, deleteInvoice };
