const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/offers - list all commercial offers
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, u.full_name as created_by_name,
              (SELECT COUNT(*) FROM contact_offers WHERE offer_id = o.id) as dispatched_count,
              (SELECT COUNT(*) FROM contact_offers WHERE offer_id = o.id AND status = 'accepted') as accepted_count
       FROM offers o
       LEFT JOIN users u ON o.created_by = u.id
       ORDER BY o.created_at DESC`
    );
    res.json({ offers: rows });
  } catch (err) {
    console.error('Offers list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// POST /api/offers - create new commercial offer
router.post('/', authorize('manager'), async (req, res) => {
  try {
    const { title, description, discount_type = 'percentage', discount_value, valid_from, valid_until, terms, status = 'active', target_audience } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO offers (title, description, discount_type, discount_value, valid_from, valid_until, terms, status, target_audience, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title, description, discount_type, discount_value, valid_from || new Date(), valid_until || null, terms, status, target_audience, req.user.id]
    );

    res.status(201).json({ offer: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// PUT /api/offers/:id
router.put('/:id', authorize('manager'), async (req, res) => {
  try {
    const { title, description, discount_type, discount_value, valid_until, terms, status } = req.body;
    const { rows } = await pool.query(
      `UPDATE offers SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        discount_type = COALESCE($3, discount_type),
        discount_value = COALESCE($4, discount_value),
        valid_until = COALESCE($5, valid_until),
        terms = COALESCE($6, terms),
        status = COALESCE($7, status),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [title, description, discount_type, discount_value, valid_until, terms, status, req.params.id]
    );
    res.json({ offer: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update offer' });
  }
});

// DELETE /api/offers/:id
router.delete('/:id', authorize('manager'), async (req, res) => {
  try {
    await pool.query('DELETE FROM offers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Offer deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete offer' });
  }
});

module.exports = router;
