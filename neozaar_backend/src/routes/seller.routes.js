const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth');
const pool = require('../config/database');
const commonConstant = require('../config/common.constant');
const emailService = require('../config/mail');

const { saveAssignments } = require('../controllers/seller-assignments.controller');

// Replace catalog selections atomically.
router.post('/assign-replace', verifyToken, saveAssignments(true));

// Get assignments for the logged-in seller (for seller dashboard)
router.get('/my-assignments', verifyToken, async (req, res) => {
  try {
    const sellerId = req.user.id;

    const account = await pool.query('SELECT id FROM users WHERE id=$1 AND is_active=true', [sellerId]);
    if (!account.rows.length) {
      return res.status(401).json({ success: false, message: 'This account no longer exists or is inactive. Please sign in again.' });
    }

    // 1. Direct product/service/solution assignments
    const directResult = await pool.query(
      `SELECT p.action_type AS item_type, p.id,
              p.name AS item_name, p.product_logo AS item_logo, p.action_type,
              p.brand_name, p.category,
              NULL AS from_category
       FROM products p
       WHERE p.is_publish = true AND p.deleted_at IS NULL
         AND p.action_type IN ('product','service','solution')
         AND (EXISTS (
           SELECT 1 FROM seller_assignments sa
           WHERE sa.seller_id = $1 AND sa.item_id = p.id AND sa.item_type = p.action_type
         ) OR EXISTS (
           SELECT 1 FROM affiliate_assignments aa
           WHERE aa.affiliate_id = $1 AND aa.catalog_id = p.id AND aa.is_active = true
         ))`,
      [sellerId]
    );

    // 2. Category assignments → expand to all products in those categories
    const categoryResult = await pool.query(
      `SELECT sa.item_id AS category_id, c.name AS category_name, sa.allowed_types
       FROM seller_assignments sa
       JOIN categories c ON c.id = sa.item_id
       WHERE sa.seller_id = $1 AND sa.item_type = 'category'`,
      [sellerId]
    );

    let categoryProducts = [];
    if (categoryResult.rows.length) {
      const categoryNames = categoryResult.rows.map(r => r.category_name);
      const prodResult = await pool.query(
        `SELECT p.id, p.name AS item_name, p.product_logo AS item_logo, p.action_type, p.category, p.brand_name,
                c.category_name AS from_category
         FROM products p
         JOIN (SELECT UNNEST($1::text[]) AS category_name) c
           ON p.category @> ARRAY[c.category_name::text]
         WHERE p.action_type IN ('product','service','solution')
           AND p.is_publish = true AND p.deleted_at IS NULL`,
        [categoryNames]
      );

      // Build a map of category_name -> allowed_types for filtering
      const allowedMap = {};
      categoryResult.rows.forEach(r => { allowedMap[r.category_name] = r.allowed_types; });

      const seen = new Set(directResult.rows.map(r => r.id));
      categoryProducts = prodResult.rows
        .filter(r => {
          if (seen.has(r.id)) return false;
          const allowed = allowedMap[r.from_category];
          // null means all types allowed
          if (allowed?.length && !allowed.includes(r.action_type)) return false;
          seen.add(r.id);
          return true;
        })
        .map(r => ({ ...r, item_type: r.action_type }));
    }

    // 3. Category entries themselves (for display only, no UTM)
    const categoryDisplay = categoryResult.rows.map(r => ({
      id: r.category_id,
      item_type: 'category',
      item_name: r.category_name,
      item_logo: null,
      action_type: null,
      from_category: null
    }));

    const data = [
      ...categoryDisplay,
      ...directResult.rows.map(r => ({ ...r, item_type: r.item_type || r.action_type })),
      ...categoryProducts
    ];

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('my-assignments error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
});

// Add catalog selections using the same validation and permissions.
router.post('/assign', verifyToken, saveAssignments(false));

// Unassign item from seller
router.post('/unassign', verifyToken, async (req, res) => {
  try {
    const { seller_id, item_type, item_id } = req.body;
    await pool.query(
      'DELETE FROM seller_assignments WHERE seller_id=$1 AND item_type=$2 AND item_id=$3',
      [seller_id, item_type, item_id]
    );
    return res.status(200).json({ success: true, message: 'Item unassigned' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to unassign item' });
  }
});

// Get all assignments for a seller
router.get('/my-items', verifyToken, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const result = await pool.query(
      `SELECT sa.id, sa.item_type, sa.item_id, sa.assigned_at,
              p.name AS item_name, p.product_logo AS item_logo, p.action_type
       FROM seller_assignments sa
       LEFT JOIN products p ON p.id = sa.item_id AND sa.item_type IN ('product','service','solution')
       WHERE sa.seller_id = $1
       ORDER BY sa.assigned_at DESC`,
      [sellerId]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
});

// Get all sellers with their assigned items (SUPERADMIN)
router.get('/sellers-with-items', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id AS seller_id, u.name, u.email, u.role_type,
              json_agg(json_build_object(
                'assignment_id', sa.id,
                'item_type', sa.item_type,
                'item_id', sa.item_id,
                'item_name', p.name,
                'assigned_at', sa.assigned_at
              )) FILTER (WHERE sa.id IS NOT NULL) AS assignments
       FROM users u
       LEFT JOIN seller_assignments sa ON sa.seller_id = u.id
       LEFT JOIN products p ON p.id = sa.item_id
       WHERE u.role_type IN ('ISV_SELLER','AGENT')
       GROUP BY u.id, u.name, u.email, u.role_type
       ORDER BY u.role_type, u.name`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sellers' });
  }
});

// Get assignments for a specific item (to show which sellers have it)
router.get('/item-sellers', verifyToken, async (req, res) => {
  try {
    const { item_type, item_id } = req.query;
    const result = await pool.query(
      `SELECT sa.id, sa.seller_id, u.name AS seller_name, u.email AS seller_email, sa.assigned_at
       FROM seller_assignments sa
       JOIN users u ON u.id = sa.seller_id
       WHERE sa.item_type = $1 AND sa.item_id = $2`,
      [item_type, item_id]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch item sellers' });
  }
});

// Get all sellers list (for assign dropdown)
router.get('/sellers-list', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role_type FROM users WHERE role_type IN ('ISV_SELLER','AGENT') AND is_active = true ORDER BY role_type, name`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sellers' });
  }
});

// Get all assignable options (categories, products, services, solutions)
router.get('/assign-options', verifyToken, async (req, res) => {
  try {
    const [categories, products, services, solutions] = await Promise.all([
      pool.query(`
        SELECT c.id, c.name,
               COUNT(p.id) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.category @> ARRAY[c.name::text] AND p.action_type = 'product'
        GROUP BY c.id, c.name
        ORDER BY c.name
      `),
      pool.query(`SELECT id, name, category FROM products WHERE action_type = 'product' AND is_publish = true ORDER BY name`),
      pool.query(`SELECT id, name FROM products WHERE action_type = 'service' AND is_publish = true ORDER BY name`),
      pool.query(`SELECT id, name FROM products WHERE action_type = 'solution' AND is_publish = true ORDER BY name`),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        categories: categories.rows,
        products: products.rows,
        services: services.rows,
        solutions: solutions.rows,
      }
    });
  } catch (error) {
    console.error('assign-options error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch options' });
  }
});

// Get current assignments for a specific seller
router.get('/assignments/:seller_id', verifyToken, async (req, res) => {
  try {
    const { seller_id } = req.params;
    const result = await pool.query(
      `SELECT sa.id, sa.item_type, sa.item_id, sa.allowed_types,
              COALESCE(p.name, c.name) AS item_name
       FROM seller_assignments sa
       LEFT JOIN products p ON p.id = sa.item_id AND sa.item_type IN ('product','service','solution')
       LEFT JOIN categories c ON c.id = sa.item_id AND sa.item_type = 'category'
       WHERE sa.seller_id = $1
       ORDER BY sa.item_type, item_name`,
      [seller_id]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
});

// Get ALL published items for ISV_SELLER (sellers see everything)
router.get('/all-items', verifyToken, async (req, res) => {
  try {
    if (req.user.role_type !== 'ISV_SELLER') {
      return res.status(403).json({ success: false, message: 'Only sellers can access all items' });
    }
    const result = await pool.query(
      `SELECT id AS item_id, name AS item_name, product_logo AS item_logo, action_type AS item_type
       FROM products
       WHERE is_publish = true
       ORDER BY action_type, name`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch items' });
  }
});

// Get sellers AND affiliates list (for assign dropdown)
router.get('/partners-list', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role_type FROM users WHERE role_type IN ('ISV_SELLER','AGENT') AND is_active = true ORDER BY role_type, name`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch partners' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ISV ASSIGNMENT — M_SELLER assigns ISVs to SELLERs
// ═══════════════════════════════════════════════════════════════

// Assign ISV to a seller (M_SELLER only)
router.post('/assign-isv', verifyToken, async (req, res) => {
  try {
    if (req.user.role_type !== 'M_SELLER' && req.user.role_type !== 'SUPER_ADMIN' && req.user.role_type !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only Master Sellers or Admins can assign ISVs to sellers' });
    }

    const { seller_id, isv_id } = req.body;
    if (!seller_id || !isv_id) {
      return res.status(400).json({ success: false, message: 'seller_id and isv_id are required' });
    }

    // Verify seller exists and is a SELLER
    const { rows: sellerRows } = await pool.query(
      "SELECT id, name FROM users WHERE id=$1 AND role_type='SELLER' AND is_active=true", [seller_id]
    );
    if (!sellerRows.length) {
      return res.status(400).json({ success: false, message: 'Invalid seller_id' });
    }

    // Verify ISV exists
    const { rows: isvRows } = await pool.query(
      "SELECT id, name FROM users WHERE id=$1 AND role_type='ISV'", [isv_id]
    );
    if (!isvRows.length) {
      return res.status(400).json({ success: false, message: 'Invalid isv_id' });
    }

    // Assign
    await pool.query(
      `INSERT INTO seller_assignments (seller_id, item_type, item_id, assigned_by)
       VALUES ($1, 'isv', $2, $3)
       ON CONFLICT (seller_id, item_type, item_id) DO NOTHING`,
      [seller_id, isv_id, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: `ISV "${isvRows[0].name}" assigned to seller "${sellerRows[0].name}"`
    });
  } catch (error) {
    console.error('assign-isv error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign ISV' });
  }
});

// Unassign ISV from a seller (M_SELLER only)
router.post('/unassign-isv', verifyToken, async (req, res) => {
  try {
    if (req.user.role_type !== 'M_SELLER' && req.user.role_type !== 'SUPER_ADMIN' && req.user.role_type !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only Master Sellers or Admins can unassign ISVs' });
    }

    const { seller_id, isv_id } = req.body;
    await pool.query(
      "DELETE FROM seller_assignments WHERE seller_id=$1 AND item_type='isv' AND item_id=$2",
      [seller_id, isv_id]
    );
    return res.status(200).json({ success: true, message: 'ISV unassigned from seller' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to unassign ISV' });
  }
});

// Get ISVs assigned to a specific seller
router.get('/assigned-isvs/:seller_id', verifyToken, async (req, res) => {
  try {
    const { seller_id } = req.params;
    const result = await pool.query(
      `SELECT sa.item_id AS isv_id, u.name AS isv_name, u.email AS isv_email, sa.assigned_at
       FROM seller_assignments sa
       JOIN users u ON u.id = sa.item_id
       WHERE sa.seller_id = $1 AND sa.item_type = 'isv'
       ORDER BY sa.assigned_at DESC`,
      [seller_id]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch assigned ISVs' });
  }
});

// Get my assigned ISVs (for logged-in SELLER)
router.get('/my-isvs', verifyToken, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const result = await pool.query(
      `SELECT sa.item_id AS isv_id, u.name AS isv_name, u.email AS isv_email,
              u.mobile AS isv_mobile, u.designation AS isv_designation, sa.assigned_at
       FROM seller_assignments sa
       JOIN users u ON u.id = sa.item_id
       WHERE sa.seller_id = $1 AND sa.item_type = 'isv'
       ORDER BY sa.assigned_at DESC`,
      [sellerId]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch your ISVs' });
  }
});

// Get all sellers with their assigned ISV count (M_SELLER overview)
router.get('/isv-assignments-overview', verifyToken, async (req, res) => {
  try {
    if (req.user.role_type !== 'M_SELLER' && req.user.role_type !== 'SUPER_ADMIN' && req.user.role_type !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT u.id AS seller_id, u.name AS seller_name, u.email AS seller_email,
              COUNT(sa.id) AS assigned_isv_count
       FROM users u
       LEFT JOIN seller_assignments sa ON sa.seller_id = u.id AND sa.item_type = 'isv'
       WHERE u.role_type = 'SELLER' AND u.is_active = true
       GROUP BY u.id, u.name, u.email
       ORDER BY u.name`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch overview' });
  }
});

module.exports = router;
