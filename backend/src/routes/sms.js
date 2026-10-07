const express = require('express');
const axios = require('axios');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
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

    let twilioSid = null;
    let status = 'sent';

    try {
      // Twilio REST API call
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const response = await axios.post(
        twilioUrl,
        new URLSearchParams({
          From: process.env.TWILIO_PHONE_NUMBER,
          To: phone_number,
          Body: content,
        }),
        {
          auth: {
            username: process.env.TWILIO_ACCOUNT_SID,
            password: process.env.TWILIO_AUTH_TOKEN,
          },
        }
      );
      twilioSid = response.data.sid;
      status = response.data.status;
    } catch (twilioErr) {
      console.error('Twilio error:', twilioErr.response?.data);
      status = 'failed';
    }

    const { rows } = await pool.query(
      `INSERT INTO sms_messages (contact_id, agent_id, direction, content, phone_number, twilio_sid, status)
       VALUES ($1,$2,'outbound',$3,$4,$5,$6) RETURNING *`,
      [contact_id, req.user.id, content, phone_number, twilioSid, status]
    );

    res.json({ sms: rows[0], status });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sms/webhook - Twilio inbound webhook
router.post('/webhook', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { From, Body, MessageSid } = req.body;

    // Find contact
    const { rows: contacts } = await pool.query(
      'SELECT id FROM contacts WHERE phone = $1 OR whatsapp_number = $1 LIMIT 1',
      [From]
    );

    let contactId = contacts[0]?.id;
    if (!contactId) {
      const { rows } = await pool.query(
        `INSERT INTO contacts (full_name, phone, source, status)
         VALUES ($1,$1,'sms','lead') RETURNING id`,
        [From]
      );
      contactId = rows[0].id;
    }

    await pool.query(
      `INSERT INTO sms_messages (contact_id, direction, content, phone_number, twilio_sid, status)
       VALUES ($1,'inbound',$2,$3,$4,'received')`,
      [contactId, Body, From, MessageSid]
    );

    // TwiML empty response
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  } catch (err) {
    console.error('SMS webhook error:', err);
    res.status(500).send('<Response></Response>');
  }
});

module.exports = router;
