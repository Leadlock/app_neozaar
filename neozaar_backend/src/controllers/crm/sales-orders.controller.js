const pool = require('../../config/database');

// GET /api/internal/crm/sales-orders
const getSalesOrders = async (req, res) => {
  try {
    const { search, status } = req.query;
    const conditions = ['o.id IS NOT NULL'];
    const params = [];

    if (status) { params.push(status); conditions.push(`o.status = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(o.order_number ILIKE $${params.length} OR c.name ILIKE $${params.length} OR c.company ILIKE $${params.length})`);
    }

    const where = conditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT o.*,
              c.name AS contact_name, c.company AS contact_company, c.email AS contact_email,
              u.name AS owner_name
       FROM crm_sales_orders o
       LEFT JOIN crm_contacts c ON c.id = o.contact_id
       LEFT JOIN users u ON u.id = o.owner_id
       WHERE ${where}
       ORDER BY o.created_at DESC`, params
    );
    res.json({ status: 'success', data: rows });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

// POST /api/internal/crm/sales-orders
const createSalesOrder = async (req, res) => {
  try {
    const {
      quote_id, opportunity_id, contact_id, order_number,
      items, subtotal, discount, tax, total,
      status = 'Pending', delivery_date, notes
    } = req.body;

    // Auto-generate order number if not provided
    const orderNum = order_number || `SO-${Date.now().toString().slice(-8)}`;

    const { rows } = await pool.query(
      `INSERT INTO crm_sales_orders
         (quote_id, opportunity_id, contact_id, order_number, items,
          subtotal, discount, tax, total, status, delivery_date, notes,
          owner_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
       RETURNING *`,
      [
        quote_id || null, opportunity_id || null, contact_id || null,
        orderNum, JSON.stringify(items || []),
        subtotal || 0, discount || 0, tax || 0, total || 0,
        status, delivery_date || null, notes || null,
        req.user.id,
      ]
    );
    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

// PUT /api/internal/crm/sales-orders/:id
const updateSalesOrder = async (req, res) => {
  try {
    const {
      order_number, items, subtotal, discount, tax, total,
      status, delivery_date, notes
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE crm_sales_orders SET
         order_number   = COALESCE($1, order_number),
         items          = COALESCE($2, items),
         subtotal       = COALESCE($3, subtotal),
         discount       = COALESCE($4, discount),
         tax            = COALESCE($5, tax),
         total          = COALESCE($6, total),
         status         = COALESCE($7, status),
         delivery_date  = COALESCE($8, delivery_date),
         notes          = COALESCE($9, notes),
         updated_at     = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        order_number || null, items ? JSON.stringify(items) : null,
        subtotal ?? null, discount ?? null, tax ?? null, total ?? null,
        status || null, delivery_date || null, notes ?? null,
        req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Sales order not found' });
    res.json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

// DELETE /api/internal/crm/sales-orders/:id
const deleteSalesOrder = async (req, res) => {
  try {
    await pool.query('DELETE FROM crm_sales_orders WHERE id=$1', [req.params.id]);
    res.json({ status: 'success', message: 'Sales order deleted' });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

module.exports = { getSalesOrders, createSalesOrder, updateSalesOrder, deleteSalesOrder };
