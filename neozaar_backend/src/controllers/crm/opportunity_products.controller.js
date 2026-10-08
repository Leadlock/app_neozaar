/**
 * Opportunity Products Controller
 * ─────────────────────────────────────────────────────────────
 * Links marketplace products/services to CRM opportunities.
 * Reuses existing products.id — no duplicate product records.
 * ISV is resolved from products.user_id (the ISV who owns the product).
 *
 * When a product is added, the relevant ISV is notified.
 * ISV users can only see opportunities containing their products.
 */
const pool = require('../../config/database');
const { auditLog } = require('./audit.helper');
const { createNotification } = require('./lifecycle.engine');

/**
 * GET /api/internal/crm/opportunities/:id/products
 */
const getOpportunityProducts = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT op.*,
              p.name AS marketplace_product_name, p.product_logo,
              p.action_type AS marketplace_type, p.starting_price,
              p.brand_name, p.slug AS product_slug,
              iv.name AS isv_name, iv.email AS isv_email
       FROM crm_opportunity_products op
       LEFT JOIN products p  ON p.id  = op.product_id
       LEFT JOIN users   iv ON iv.id = op.isv_id
       WHERE op.opportunity_id=$1
       ORDER BY op.created_at ASC`,
      [req.params.id]
    );
    res.json({ status: 'success', data: rows });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * POST /api/internal/crm/opportunities/:id/products
 * Body: { product_id, quantity?, unit_price?, discount?, notes? }
 *
 * Resolves ISV from products.user_id automatically.
 * Notifies the ISV after adding.
 */
const addOpportunityProduct = async (req, res) => {
  try {
    const oppId = Number(req.params.id);
    const { product_id, quantity = 1, unit_price, discount = 0, notes } = req.body;

    if (!product_id) {
      return res.status(400).json({ status: 'fail', message: 'product_id is required' });
    }

    // Verify opportunity exists
    const { rows: oppRows } = await pool.query(
      'SELECT id, name, owner_id FROM crm_opportunities WHERE id=$1 AND is_deleted=FALSE', [oppId]
    );
    if (!oppRows.length) return res.status(404).json({ status: 'fail', message: 'Opportunity not found' });

    // Resolve product and ISV from marketplace
    const { rows: prodRows } = await pool.query(
      `SELECT p.id, p.name, p.action_type, p.starting_price, p.user_id AS isv_user_id,
              u.name AS isv_name
       FROM products p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id=$1 AND p.is_publish=TRUE AND p.deleted_at IS NULL`,
      [product_id]
    );
    if (!prodRows.length) {
      return res.status(404).json({ status: 'fail', message: 'Product not found or not published' });
    }
    const prod = prodRows[0];
    const resolvedPrice = unit_price !== undefined ? unit_price : (prod.starting_price || 0);
    const total = (resolvedPrice * quantity) - discount;

    const { rows } = await pool.query(
      `INSERT INTO crm_opportunity_products
         (opportunity_id, product_id, product_name, product_type, isv_id,
          quantity, unit_price, discount, total, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (opportunity_id, product_id) DO UPDATE SET
         quantity   = EXCLUDED.quantity,
         unit_price = EXCLUDED.unit_price,
         discount   = EXCLUDED.discount,
         total      = EXCLUDED.total,
         notes      = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING *`,
      [oppId, product_id, prod.name, prod.action_type || 'product',
       prod.isv_user_id, quantity, resolvedPrice, discount, total, notes || null, req.user.id]
    );

    await auditLog(req.user.id, 'ADD_OPPORTUNITY_PRODUCT', 'Opportunity', oppId,
      null, { product_id, product_name: prod.name, isv_id: prod.isv_user_id }, req);

    // Notify ISV — post-insert, non-critical
    try {
      if (prod.isv_user_id) {
        await createNotification(
          prod.isv_user_id, 'opportunity_product_added',
          'Your product added to an opportunity',
          `"${prod.name}" has been added to opportunity "${oppRows[0].name}".`,
          'opportunity', oppId
        );
      }
    } catch (notifErr) {
      console.error('addOpportunityProduct notification error:', notifErr.message);
    }

    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * PUT /api/internal/crm/opportunities/:id/products/:productId
 */
const updateOpportunityProduct = async (req, res) => {
  try {
    const { quantity, unit_price, discount, notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE crm_opportunity_products
       SET quantity=$1, unit_price=$2, discount=$3,
           total=($2 * $1) - $3, notes=$4, updated_at=NOW()
       WHERE opportunity_id=$5 AND product_id=$6
       RETURNING *`,
      [quantity, unit_price, discount || 0, notes || null,
       req.params.id, req.params.productId]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Product not found on opportunity' });
    res.json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * DELETE /api/internal/crm/opportunities/:id/products/:productId
 */
const removeOpportunityProduct = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM crm_opportunity_products WHERE opportunity_id=$1 AND product_id=$2 RETURNING id',
      [req.params.id, req.params.productId]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Product not found on opportunity' });
    await auditLog(req.user.id, 'REMOVE_OPPORTUNITY_PRODUCT', 'Opportunity', req.params.id,
      { product_id: req.params.productId }, null, req);
    res.json({ status: 'success', message: 'Product removed from opportunity' });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

module.exports = {
  getOpportunityProducts,
  addOpportunityProduct,
  updateOpportunityProduct,
  removeOpportunityProduct,
};
