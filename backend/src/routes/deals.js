const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/deals - list all pipeline deals
router.get('/', async (req, res) => {
  try {
    const { stage, contact_id } = req.query;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (stage) {
      conditions.push(`d.stage = $${idx++}`);
      params.push(stage);
    }
    if (contact_id) {
      conditions.push(`d.contact_id = $${idx++}`);
      params.push(contact_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT d.*, c.full_name as contact_name, c.company, c.email as contact_email,
              u.full_name as assigned_to_name
       FROM deals d
       LEFT JOIN contacts c ON d.contact_id = c.id
       LEFT JOIN users u ON d.assigned_to = u.id
       ${where}
       ORDER BY d.created_at DESC`,
      params
    );

    res.json({ deals: rows });
  } catch (err) {
    console.error('Deals list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// PUT /api/deals/:id - update deal stage or values
router.put('/:id', authorize('agent'), async (req, res) => {
  try {
    const { stage, value, probability, notes, expected_close_date } = req.body;
    const { rows } = await pool.query(
      `UPDATE deals SET 
        stage = COALESCE($1, stage),
        value = COALESCE($2, value),
        probability = COALESCE($3, probability),
        notes = COALESCE($4, notes),
        expected_close_date = COALESCE($5, expected_close_date),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [stage, value, probability, notes, expected_close_date, req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Deal not found' });

    const io = req.app.get('io');
    if (io) io.emit('deal_updated', { deal: rows[0] });

    res.json({ deal: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

module.exports = router;
