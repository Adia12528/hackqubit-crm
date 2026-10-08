const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const emailService = require('../services/communication/email.service');

const router = express.Router();

// POST /api/emails/inbound - receive parsed inbound email (Mailgun, SendGrid, Postmark)
router.post('/inbound', async (req, res) => {
  try {
    const { from, to, subject, body, message_id, contact_id } = req.body;
    const io = req.app.get('io');

    await emailService.processInbound({
      from,
      to,
      subject,
      body,
      message_id,
      contact_id,
      io,
    });

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Email webhook error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// All routes below need authentication
router.use(authenticate);

// GET /api/emails - list emails for a contact
router.get('/', async (req, res) => {
  try {
    const { contact_id, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT e.*, u.full_name as agent_name
       FROM emails e LEFT JOIN users u ON e.agent_id = u.id
       WHERE e.contact_id = $1
       ORDER BY e.created_at DESC LIMIT $2 OFFSET $3`,
      [contact_id, limit, offset]
    );

    res.json({ emails: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/emails/send - send email to contact
router.post('/send', authorize('agent'), async (req, res) => {
  try {
    const { contact_id, to_address, subject, body, body_html, cc_addresses } = req.body;
    const io = req.app.get('io');

    const result = await emailService.sendMessage({
      contact_id,
      agent_id: req.user.id,
      to_address,
      subject,
      body,
      body_html,
      cc_addresses,
      io,
    });

    if (result.status === 'failed') {
      return res.status(502).json(result);
    }

    return res.json(result);
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
