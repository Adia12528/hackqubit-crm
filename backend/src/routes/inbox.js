const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/inbox - Unified Omnichannel Inbox
router.get('/', async (req, res) => {
  try {
    const { channel, search, status = 'all' } = req.query;
    let conditions = ['c.is_deleted = false'];
    let params = [];
    let idx = 1;

    // Agent role filter
    if (req.user.role_level >= 4) {
      conditions.push(`(c.assigned_to = $${idx} OR c.assigned_to IS NULL)`);
      params.push(req.user.id);
      idx++;
    }

    if (channel && channel !== 'all') {
      conditions.push(`conv.channel = $${idx++}`);
      params.push(channel);
    }

    if (search) {
      conditions.push(`(c.full_name ILIKE $${idx} OR conv.last_message_preview ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query unified conversations
    const query = `
      SELECT 
        conv.id as conversation_id,
        conv.channel,
        conv.status as conversation_status,
        conv.last_message_at,
        conv.last_message_preview,
        conv.unread_count,
        c.id as contact_id,
        c.full_name as contact_name,
        c.email as contact_email,
        c.phone as contact_phone,
        c.whatsapp_number,
        c.company,
        c.status as contact_status,
        u.full_name as assigned_to_name
      FROM conversations conv
      JOIN contacts c ON conv.contact_id = c.id
      LEFT JOIN users u ON conv.assigned_to = u.id
      ${where}
      ORDER BY conv.last_message_at DESC
      LIMIT 100
    `;

    const { rows } = await pool.query(query, params);

    // Summary counts by channel for tab badges
    const { rows: counts } = await pool.query(`
      SELECT conv.channel, COUNT(*) as count, SUM(conv.unread_count) as unread
      FROM conversations conv
      JOIN contacts c ON conv.contact_id = c.id
      WHERE c.is_deleted = false
      GROUP BY conv.channel
    `);

    res.json({
      conversations: rows,
      channelStats: counts,
    });
  } catch (err) {
    console.error('Unified inbox error:', err.message);
    res.status(500).json({ error: 'Failed to fetch unified inbox' });
  }
});

// POST /api/inbox/:contactId/read - Mark conversation as read
router.post('/:contactId/read', async (req, res) => {
  try {
    const { channel } = req.body;
    let query = 'UPDATE conversations SET unread_count = 0, updated_at = NOW() WHERE contact_id = $1';
    let params = [req.params.contactId];

    if (channel) {
      query += ' AND channel = $2';
      params.push(channel);
    }

    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
