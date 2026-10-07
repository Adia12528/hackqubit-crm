const express = require('express');
const nodemailer = require('nodemailer');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Create reusable transporter
const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

    const transporter = createTransporter();
    let status = 'sent';
    let messageId = null;

    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: to_address,
        cc: cc_addresses?.join(', '),
        subject,
        text: body,
        html: body_html || `<p>${body}</p>`,
      });
      messageId = info.messageId;
    } catch (smtpErr) {
      console.error('SMTP error:', smtpErr.message);
      status = 'failed';
    }

    const { rows } = await pool.query(
      `INSERT INTO emails (contact_id, agent_id, direction, subject, body, body_html,
        from_address, to_address, cc_addresses, status, message_id)
       VALUES ($1,$2,'outbound',$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [contact_id, req.user.id, subject, body, body_html,
       process.env.SMTP_USER, to_address, cc_addresses, status, messageId]
    );

    res.json({ email: rows[0], status });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/emails/inbound - receive parsed inbound email (from webhook like Mailgun/SendGrid)
router.post('/inbound', async (req, res) => {
  try {
    const { from, to, subject, body, message_id, contact_id } = req.body;

    // Find contact by email
    let cId = contact_id;
    if (!cId) {
      const { rows } = await pool.query(
        'SELECT id FROM contacts WHERE email = $1 LIMIT 1',
        [from]
      );
      cId = rows[0]?.id;
    }

    await pool.query(
      `INSERT INTO emails (contact_id, direction, subject, body, from_address, to_address, 
        status, message_id) VALUES ($1,'inbound',$2,$3,$4,$5,'received',$6)`,
      [cId, subject, body, from, to, message_id]
    );

    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
