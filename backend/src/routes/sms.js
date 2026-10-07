const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const smsService = require('../services/communication/sms.service');

const router = express.Router();

// POST /api/sms/webhook - Twilio inbound webhook with identity resolution
router.post('/webhook', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { From, Body, MessageSid } = req.body;
    const io = req.app.get('io');

    await smsService.processInbound({
      from: From,
      body: Body,
      messageSid: MessageSid,
      io,
    });

    // TwiML empty response
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  } catch (err) {
    console.error('SMS webhook error:', err);
    res.status(500).send('<Response></Response>');
  }
});

// All routes below need authentication
router.use(authenticate);

// GET /api/sms - list SMS for a contact
router.get('/', async (req, res) => {
  try {
    const { contact_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT s.*, u.full_name as agent_name
       FROM sms_messages s LEFT JOIN users u ON s.agent_id = u.id
       WHERE s.contact_id = $1
       ORDER BY s.created_at ASC LIMIT $2 OFFSET $3`,
      [contact_id, limit, offset]
    );

    res.json({ messages: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sms/send - send SMS via Twilio
router.post('/send', authorize('agent'), async (req, res) => {
  try {
    const { contact_id, phone_number, content } = req.body;
    const io = req.app.get('io');

    const result = await smsService.sendMessage({
      contact_id,
      agent_id: req.user.id,
      phone_number,
      content,
      io,
    });

    res.json(result);
  } catch (err) {
    console.error('SMS send error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
