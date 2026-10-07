const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/templates - list message templates
router.get('/', async (req, res) => {
  try {
    const { channel } = req.query;
    let query = 'SELECT * FROM templates';
    const params = [];

    if (channel && channel !== 'all') {
      query += ' WHERE channel = $1 OR channel = \'all\'';
      params.push(channel);
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json({ templates: rows });
  } catch (err) {
    console.error('Templates list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/templates - create template
router.post('/', authorize('manager'), async (req, res) => {
  try {
    const { name, category = 'general', channel = 'all', subject, content, variables = ['first_name', 'company'] } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO templates (name, category, channel, subject, content, variables, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, category, channel, subject, content, variables, req.user.id]
    );
    res.status(201).json({ template: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/templates/:id
router.put('/:id', authorize('manager'), async (req, res) => {
  try {
    const { name, category, channel, subject, content, variables } = req.body;
    const { rows } = await pool.query(
      `UPDATE templates SET 
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        channel = COALESCE($3, channel),
        subject = COALESCE($4, subject),
        content = COALESCE($5, content),
        variables = COALESCE($6, variables),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, category, channel, subject, content, variables, req.params.id]
    );
    res.json({ template: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', authorize('manager'), async (req, res) => {
  try {
    await pool.query('DELETE FROM templates WHERE id = $1', [req.params.id]);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;
