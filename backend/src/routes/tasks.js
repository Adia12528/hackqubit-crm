const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/tasks - list all tasks with contact info
router.get('/', async (req, res) => {
  try {
    const { status, contact_id } = req.query;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (req.user.role_level >= 4) {
      conditions.push(`(t.assigned_to = $${idx} OR t.assigned_to IS NULL)`);
      params.push(req.user.id);
      idx++;
    }

    if (status) {
      conditions.push(`t.status = $${idx++}`);
      params.push(status);
    }
    if (contact_id) {
      conditions.push(`t.contact_id = $${idx++}`);
      params.push(contact_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT t.*, c.full_name as contact_name, c.company, c.phone as contact_phone,
              u.full_name as assigned_to_name
       FROM tasks t
       LEFT JOIN contacts c ON t.contact_id = c.id
       LEFT JOIN users u ON t.assigned_to = u.id
       ${where}
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`,
      params
    );

    res.json({ tasks: rows });
  } catch (err) {
    console.error('Tasks list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks - create standalone or contact task
router.post('/', authorize('agent'), async (req, res) => {
  try {
    const { contact_id, title, description, due_date, priority = 'medium', assigned_to } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO tasks (contact_id, assigned_to, created_by, title, description, due_date, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [contact_id || null, assigned_to || req.user.id, req.user.id, title, description, due_date || null, priority]
    );

    const io = req.app.get('io');
    if (io && contact_id) io.emit('timeline_event', { contact_id, channel: 'task', data: rows[0] });

    res.status(201).json({ task: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id - update task
router.put('/:id', authorize('agent'), async (req, res) => {
  try {
    const { status, priority, due_date, title, description } = req.body;
    const { rows } = await pool.query(
      `UPDATE tasks SET 
        status = COALESCE($1, status),
        priority = COALESCE($2, priority),
        due_date = COALESCE($3, due_date),
        title = COALESCE($4, title),
        description = COALESCE($5, description),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [status, priority, due_date, title, description, req.params.id]
    );

    res.json({ task: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

module.exports = router;
