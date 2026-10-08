const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const verifyToken = require('../middlewares/auth');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const emailService = require('../config/mail');

// GET /api/internal/partners?type=service|revshare
router.get('/', verifyToken, async (req, res) => {
  try {
    const { type, search } = req.query;

    const roleMap = {
      'isv': 'ISV',
      'service': 'SUPPORT_PARTNER',
      'revshare': 'AGENT'
    };

    const roleType = roleMap[type] || 'SUPPORT_PARTNER';

    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.mobile,
        u.designation,
        u.advisor_type,
        u.is_active,
        u.role_type,
        c.company_name AS company,
        c.brand_name,
        c.headquater_country,
        c.website_url,
        i.cloud_partnership,
        i.existing_marketplace_listing,
        i.preferred_engagement,
        i.service_sub_options,
        CASE WHEN u.is_active = true THEN 'active' ELSE 'pending' END AS status,
        u.created_at
      FROM users u
      LEFT JOIN company_detail c ON u.id = c.action_id
      LEFT JOIN isv_details i ON u.id = i.user_id
      WHERE u.role_type = $1
    `;

    const values = [roleType];
    let paramIndex = 2;

    if (search && search.trim()) {
      query += ` AND (
        u.name ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR 
        c.company_name ILIKE $${paramIndex}
      )`;
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    query += ` ORDER BY u.created_at DESC`;

    const result = await pool.query(query, values);

    return res.json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return res.status(500).json({
      status: 'fail',
      message: 'Failed to fetch partners'
    });
  }
});

// PUT /api/internal/partners/:id/status — toggle active status
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    await pool.query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, id]);

    return res.json({ status: 'success', message: 'Status updated' });
  } catch (error) {
    console.error('Error updating partner status:', error);
    return res.status(500).json({ status: 'fail', message: 'Failed to update status' });
  }
});

// PUT /api/internal/partners/:id/verify — approve/verify partner (SUPPORT_PARTNER or AGENT)
router.put('/:id/verify', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND role_type IN ('SUPPORT_PARTNER', 'AGENT')",
      [id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Partner not found' });

    const user = rows[0];
    const tempPassword = crypto.randomBytes(6).toString('hex').slice(0, 10);
    const hashed = await bcrypt.hash(tempPassword, 10);

    await pool.query(
      'UPDATE users SET is_active = TRUE, is_email_verified = TRUE, password = $1, updated_at = NOW() WHERE id = $2',
      [hashed, id]
    );

    try {
      if (user.role_type === 'AGENT') {
        await emailService.sendConsultingAdvisorApprovalEmail(user.email, user.name);
        await emailService.sendWelcomeMailtoUser(user.email, user.name, tempPassword, 'Consulting Advisor');
      } else {
        await emailService.sendSolutionPartnerApprovalEmail(user.email, user.name);
        await emailService.sendWelcomeMailtoUser(user.email, user.name, tempPassword, 'Solution Partner');
      }
    } catch (emailError) {
      console.error('Approval email failed:', emailError.message);
    }

    const message = user.role_type === 'AGENT'
      ? 'Consulting Advisor approved successfully'
      : 'Solution Partner approved successfully';

    return res.json({ status: 'success', message });
  } catch (error) {
    console.error('Error verifying partner:', error);
    return res.status(500).json({ status: 'fail', message: 'Failed to verify partner' });
  }
});

// DELETE /api/internal/partners/:id — delete partner
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete company detail first
    await pool.query('DELETE FROM company_detail WHERE action_id = $1', [id]);
    // Delete the user
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    return res.json({ status: 'success', message: 'Partner deleted' });
  } catch (error) {
    console.error('Error deleting partner:', error);
    return res.status(500).json({ status: 'fail', message: 'Failed to delete partner' });
  }
});

module.exports = router;
