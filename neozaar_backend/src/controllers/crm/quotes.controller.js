const pool = require('../../config/database');

// Ensure table exists
const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_quotes (
      id SERIAL PRIMARY KEY,
      customer_name VARCHAR(255),
      customer_email VARCHAR(255),
      subject VARCHAR(255),
      items JSONB DEFAULT '[]',
      total DECIMAL(15,2) DEFAULT 0,
      notes TEXT,
      valid_until DATE,
      status VARCHAR(30) DEFAULT 'Draft',
      sent_at TIMESTAMP,
      owner_id INTEGER REFERENCES users(id),
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
};

// GET /api/internal/crm/quotes
const getQuotes = async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT q.*, u.name AS owner_name FROM crm_quotes q
       LEFT JOIN users u ON q.owner_id = u.id
       ORDER BY q.created_at DESC`
    );
    res.json({ status: 'success', data: rows });
  } catch (err) {
    console.error('getQuotes error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to fetch quotes' });
  }
};

// POST /api/internal/crm/quotes
const createQuote = async (req, res) => {
  try {
    await ensureTable();
    const { customer_name, customer_email, subject, items, total, notes, valid_until } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO crm_quotes (customer_name, customer_email, subject, items, total, notes, valid_until, status, owner_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Draft',$8,$8) RETURNING *`,
      [customer_name, customer_email, subject, JSON.stringify(items || []), total || 0, notes, valid_until || null, req.user.id]
    );
    res.json({ status: 'success', data: rows[0] });
  } catch (err) {
    console.error('createQuote error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to create quote' });
  }
};

// PUT /api/internal/crm/quotes/:id
const updateQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, customer_email, subject, items, total, notes, valid_until, status } = req.body;
    await pool.query(
      `UPDATE crm_quotes SET customer_name=$1, customer_email=$2, subject=$3, items=$4, total=$5, notes=$6, valid_until=$7, status=$8, updated_at=NOW()
       WHERE id=$9`,
      [customer_name, customer_email, subject, JSON.stringify(items || []), total || 0, notes, valid_until || null, status || 'Draft', id]
    );
    res.json({ status: 'success', message: 'Quote updated' });
  } catch (err) {
    console.error('updateQuote error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to update quote' });
  }
};

// DELETE /api/internal/crm/quotes/:id
const deleteQuote = async (req, res) => {
  try {
    await pool.query('DELETE FROM crm_quotes WHERE id=$1', [req.params.id]);
    res.json({ status: 'success', message: 'Quote deleted' });
  } catch (err) {
    console.error('deleteQuote error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to delete quote' });
  }
};

// POST /api/internal/crm/quotes/:id/send
const sendQuote = async (req, res) => {
  try {
    await pool.query(
      `UPDATE crm_quotes SET status='Sent', sent_at=NOW(), updated_at=NOW() WHERE id=$1`,
      [req.params.id]
    );
    // TODO: integrate email sending here
    res.json({ status: 'success', message: 'Quote marked as sent' });
  } catch (err) {
    console.error('sendQuote error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to send quote' });
  }
};

// POST /api/internal/crm/quotes/:id/accept
// Transactional: validate → create SO → update quote → audit/activity → COMMIT
// Rolls back everything on failure. Idempotent: returns 409 if already accepted.
const acceptQuote = async (req, res) => {
  try {
    const { handleQuoteAccepted } = require('../crm/lifecycle.engine');
    const orderId = await handleQuoteAccepted(Number(req.params.id), req.user.id);
    res.json({ status: 'success', data: { sales_order_id: orderId } });
  } catch (err) {
    if (err.message === 'Quote already accepted') {
      return res.status(409).json({ status: 'fail', message: err.message });
    }
    if (err.message === 'Quote not found') {
      return res.status(404).json({ status: 'fail', message: err.message });
    }
    console.error('acceptQuote error:', err);
    res.status(500).json({ status: 'fail', message: 'Failed to accept quote' });
  }
};

module.exports = { getQuotes, createQuote, updateQuote, deleteQuote, sendQuote, acceptQuote };
