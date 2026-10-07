const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const whatsappService = require('../services/communication/whatsapp.service');

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

// POST /api/whatsapp/webhook - receive inbound messages with identity resolution
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    const io = req.app.get('io');

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          
          for (const msg of value.messages || []) {
            const phone = msg.from;

            // Extract message content
            let content = '';
            let messageType = msg.type;
            let mediaUrl = null;

            if (msg.type === 'text') content = msg.text?.body;
            else if (msg.type === 'image') { mediaUrl = msg.image?.id; content = msg.image?.caption || ''; }
            else if (msg.type === 'audio') mediaUrl = msg.audio?.id;
            else if (msg.type === 'document') { mediaUrl = msg.document?.id; content = msg.document?.filename || ''; }

            // Delegate to service with identity resolution & timeline creation
            await whatsappService.processInbound({
              from: phone,
              msgId: msg.id,
              messageType,
              content,
              mediaUrl,
              io,
            });

            console.log(`📱 Processed inbound WhatsApp from ${phone}`);
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
    const io = req.app.get('io');

    const result = await whatsappService.sendMessage({
      contact_id,
      agent_id: req.user.id,
      phone_number,
      message,
      message_type,
      template_name,
      template_params,
      io,
    });

    res.json(result);
  } catch (err) {
    console.error('WhatsApp send error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
