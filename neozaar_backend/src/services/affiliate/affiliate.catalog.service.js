const pool = require('../../config/database');

// Both assignment screens are authoritative, including category assignments.
async function assignedCatalog(affiliateId, catalogId) {
  const { rows } = await pool.query(`SELECT p.id,p.name,p.action_type AS type,p.slug FROM products p
    WHERE p.id=$2 AND p.deleted_at IS NULL AND p.is_publish=TRUE AND (
      EXISTS (SELECT 1 FROM affiliate_assignments a WHERE a.affiliate_id=$1 AND a.catalog_id=p.id AND a.is_active=TRUE)
      OR EXISTS (SELECT 1 FROM seller_assignments s WHERE s.seller_id=$1 AND
        ((s.item_id=p.id AND s.item_type=p.action_type) OR
         (s.item_type='category' AND EXISTS (SELECT 1 FROM categories c WHERE c.id=s.item_id AND c.name=ANY(p.category)
          AND (s.allowed_types IS NULL OR p.action_type=ANY(s.allowed_types))))))
    )`, [affiliateId,catalogId]);
  return rows[0] || null;
}
module.exports = { assignedCatalog };
