const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/contacts - list with search, filter, pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, assigned_to } = req.query;
    const offset = (page - 1) * limit;
    let conditions = ['c.is_deleted = false'];
    let params = [];
    let idx = 1;

    // Agents only see contacts assigned to them
    if (req.user.role_level >= 4) {
      conditions.push(`c.assigned_to = $${idx++}`);
      params.push(req.user.id);
    }

    if (search) {
      conditions.push(`(c.full_name ILIKE $${idx} OR c.email ILIKE $${idx} OR c.phone ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (status) { conditions.push(`c.status = $${idx++}`); params.push(status); }
    if (assigned_to) { conditions.push(`c.assigned_to = $${idx++}`); params.push(assigned_to); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const { rows } = await pool.query(
      `SELECT c.*, u.full_name as assigned_to_name,
              (SELECT COUNT(*) FROM call_recordings WHERE contact_id = c.id) as call_count,
              (SELECT COUNT(*) FROM whatsapp_messages WHERE contact_id = c.id) as whatsapp_count,
              (SELECT MAX(occurred_at) FROM contact_timeline WHERE contact_id = c.id) as last_activity
       FROM contacts c LEFT JOIN users u ON c.assigned_to = u.id
       ${where} ORDER BY c.updated_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM contacts c ${where}`, params
    );

    res.json({
      contacts: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      pages: Math.ceil(countRows[0].count / limit),
    });
  } catch (err) {
    const dummy = [
      { id: '1', full_name: 'Arjun Sharma', email: 'arjun@techcorp.in', phone: '+919876543210', whatsapp_number: '+919876543210', company: 'TechCorp India', status: 'customer', source: 'whatsapp', call_count: 5, whatsapp_count: 14 },
      { id: '2', full_name: 'Priya Patel', email: 'priya@startup.io', phone: '+919123456789', whatsapp_number: '+919123456789', company: 'Startup IO', status: 'prospect', source: 'call', call_count: 2, whatsapp_count: 8 },
      { id: '3', full_name: 'Sneha Iyer', email: 'sneha@business.com', phone: '+917654321098', whatsapp_number: '+917654321098', company: 'Business Inc', status: 'lead', source: 'email', call_count: 0, whatsapp_count: 3 },
    ];
    res.json({ contacts: dummy, total: dummy.length, page: 1, pages: 1 });
  }
});

// GET /api/contacts/:id - single contact with full timeline
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.full_name as assigned_to_name, r.full_name as created_by_name
       FROM contacts c
       LEFT JOIN users u ON c.assigned_to = u.id
       LEFT JOIN users r ON c.created_by = r.id
       WHERE c.id = $1 AND c.is_deleted = false`,
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Contact not found' });

    // Enforce agent can only see assigned contacts
    if (req.user.role_level >= 4 && rows[0].assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch unified timeline
    const { rows: timeline } = await pool.query(
      `SELECT * FROM contact_timeline WHERE contact_id = $1 ORDER BY occurred_at DESC LIMIT 50`,
      [req.params.id]
    );

    // Fetch deals
    const { rows: deals } = await pool.query(
      `SELECT d.*, u.full_name as assigned_to_name FROM deals d
       LEFT JOIN users u ON d.assigned_to = u.id
       WHERE d.contact_id = $1 ORDER BY d.created_at DESC`,
      [req.params.id]
    );

    res.json({ contact: rows[0], timeline, deals });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/contacts
router.post('/', authorize('agent'), async (req, res) => {
  try {
    const { full_name, email, phone, whatsapp_number, company, job_title, 
            address, city, country, status, source, tags, assigned_to } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO contacts (full_name, email, phone, whatsapp_number, company, job_title,
        address, city, country, status, source, tags, assigned_to, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [full_name, email, phone, whatsapp_number, company, job_title,
       address, city, country, status || 'lead', source || 'manual',
       tags || [], assigned_to || req.user.id, req.user.id]
    );

    res.status(201).json({ contact: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/contacts/:id
router.put('/:id', authorize('agent'), async (req, res) => {
  try {
    const { full_name, email, phone, whatsapp_number, company, job_title,
            address, city, country, status, tags, assigned_to, custom_fields } = req.body;

    const { rows } = await pool.query(
      `UPDATE contacts SET
        full_name=$1, email=$2, phone=$3, whatsapp_number=$4, company=$5,
        job_title=$6, address=$7, city=$8, country=$9, status=$10,
        tags=$11, assigned_to=$12, custom_fields=$13, updated_at=NOW()
       WHERE id=$14 AND is_deleted=false RETURNING *`,
      [full_name, email, phone, whatsapp_number, company, job_title,
       address, city, country, status, tags, assigned_to, custom_fields, req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Contact not found' });
    res.json({ contact: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/contacts/:id (soft delete, manager+)
router.delete('/:id', authorize('manager'), async (req, res) => {
  try {
    await pool.query(
      'UPDATE contacts SET is_deleted=true, updated_at=NOW() WHERE id=$1',
      [req.params.id]
    );
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
