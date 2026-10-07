const express = require('express');
const axios = require('axios');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// =============================================
// WEBHOOK: Meta sends inbound messages here
// GET /api/whatsapp/webhook - verification
// =============================================
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Verification failed' });
  }
});

// POST /api/whatsapp/webhook - receive inbound messages
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          
          for (const msg of value.messages || []) {
            const phone = msg.from;
            
            // Find or create contact by phone
            let { rows: contacts } = await pool.query(
              'SELECT id FROM contacts WHERE whatsapp_number = $1 OR phone = $1 LIMIT 1',
              [phone]
            );
            
            let contactId = contacts[0]?.id;
            if (!contactId) {
              const contact = value.contacts?.[0];
              const { rows: newContact } = await pool.query(
                `INSERT INTO contacts (full_name, phone, whatsapp_number, source, status)
                 VALUES ($1, $2, $2, 'whatsapp', 'lead') RETURNING id`,
                [contact?.profile?.name || phone, phone]
              );
              contactId = newContact[0].id;
            }

            // Extract message content
            let content = '';
            let messageType = msg.type;
            let mediaUrl = null;

            if (msg.type === 'text') content = msg.text?.body;
            else if (msg.type === 'image') { mediaUrl = msg.image?.id; content = msg.image?.caption || ''; }
            else if (msg.type === 'audio') mediaUrl = msg.audio?.id;
            else if (msg.type === 'document') { mediaUrl = msg.document?.id; content = msg.document?.filename || ''; }

            // Save to DB
            await pool.query(
              `INSERT INTO whatsapp_messages (contact_id, wa_message_id, direction, message_type, 
                content, media_url, phone_number, status)
               VALUES ($1,$2,'inbound',$3,$4,$5,$6,'received')`,
              [contactId, msg.id, messageType, content, mediaUrl, phone]
            );

            console.log(`📱 WhatsApp message from ${phone}: ${content}`);
          }
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// All routes below need authentication
router.use(authenticate);

// GET /api/whatsapp/messages - list messages
router.get('/messages', async (req, res) => {
  try {
    const { contact_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT wm.*, u.full_name as agent_name
       FROM whatsapp_messages wm
       LEFT JOIN users u ON wm.agent_id = u.id
       WHERE wm.contact_id = $1
       ORDER BY wm.created_at ASC LIMIT $2 OFFSET $3`,
      [contact_id, limit, offset]
    );

    res.json({ messages: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/whatsapp/send - send outbound message
router.post('/send', authorize('agent'), async (req, res) => {
  try {
    const { contact_id, phone_number, message, message_type = 'text', template_name, template_params } = req.body;

    // Build WhatsApp API payload
    let payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone_number,
    };

    if (message_type === 'template') {
      payload.type = 'template';
      payload.template = {
        name: template_name,
        language: { code: 'en_US' },
        components: template_params || [],
      };
    } else {
      payload.type = 'text';
      payload.text = { body: message, preview_url: false };
    }

    // Send via Meta API
    let waMessageId = null;
    let status = 'sent';
    
    try {
      const response = await axios.post(
        `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          }
        }
      );
      waMessageId = response.data.messages?.[0]?.id;
    } catch (apiErr) {
      console.error('WhatsApp API error:', apiErr.response?.data);
      status = 'failed';
    }

    // Log to DB regardless
    const { rows } = await pool.query(
      `INSERT INTO whatsapp_messages (contact_id, agent_id, wa_message_id, direction, 
        message_type, content, template_name, phone_number, status)
       VALUES ($1,$2,$3,'outbound',$4,$5,$6,$7,$8) RETURNING *`,
      [contact_id, req.user.id, waMessageId, message_type, message, template_name, phone_number, status]
    );

    res.json({ message: rows[0], status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
