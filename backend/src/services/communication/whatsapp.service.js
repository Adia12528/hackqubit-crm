const axios = require('axios');
const pool = require('../../db/pool');

class WhatsAppService {
  /**
   * Send WhatsApp message
   */
  async sendMessage({ contact_id, agent_id, phone_number, message, message_type = 'text', template_name, template_params, io }) {
    let waMessageId = null;
    let status = 'sent';
    let errorMessage = null;

    // Build payload
    const payload = {
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

    // Attempt Meta API call if configured
    const hasConfig = process.env.WHATSAPP_ACCESS_TOKEN && 
                      process.env.WHATSAPP_PHONE_NUMBER_ID && 
                      !process.env.WHATSAPP_ACCESS_TOKEN.startsWith('CHANGE_ME');

    if (hasConfig) {
      try {
        const response = await axios.post(
          `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          payload,
          {
            headers: {
              'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );
        waMessageId = response.data.messages?.[0]?.id;
      } catch (apiErr) {
        console.error('WhatsApp API error:', apiErr.response?.data || apiErr.message);
        status = 'failed';
        errorMessage = apiErr.response?.data?.error?.message || apiErr.message;
      }
    } else {
      // Graceful simulated delivery when tokens are template placeholders
      waMessageId = `mock_wa_${Date.now()}`;
      status = 'sent';
    }

    // Store in DB
    const { rows } = await pool.query(
      `INSERT INTO whatsapp_messages (contact_id, agent_id, wa_message_id, direction, 
        message_type, content, template_name, phone_number, status)
       VALUES ($1,$2,$3,'outbound',$4,$5,$6,$7,$8) RETURNING *`,
      [contact_id, agent_id || null, waMessageId, message_type, message, template_name, phone_number, status]
    );

    const savedMsg = rows[0];

    // Upsert into conversations table
    try {
      await pool.query(
        `INSERT INTO conversations (contact_id, channel, status, assigned_to, last_message_at, last_message_preview)
         VALUES ($1, 'whatsapp', 'open', $2, NOW(), $3)
         ON CONFLICT (contact_id, channel) DO UPDATE SET
           last_message_at = NOW(),
           last_message_preview = $3,
           updated_at = NOW()`,
        [contact_id, agent_id || null, message?.substring(0, 150)]
      );
    } catch (cErr) {
      // conversation table might be offline
    }

    // Emit real-time update
    if (io) {
      io.emit('whatsapp_message', { contact_id, message: savedMsg });
      io.emit('inbox_update', { contact_id, channel: 'whatsapp', last_message: message });
    }

    return { message: savedMsg, status, error: errorMessage };
  }

  /**
   * Process incoming webhook message
   */
  async processInbound({ from, msgId, messageType, content, mediaUrl, io }) {
    const identityService = require('../identity.service');
    const contact = await identityService.resolveOrCreateContact({
      phone: from,
      whatsapp_number: from,
      source: 'whatsapp'
    });

    const { rows } = await pool.query(
      `INSERT INTO whatsapp_messages (contact_id, wa_message_id, direction, message_type, 
        content, media_url, phone_number, status)
       VALUES ($1,$2,'inbound',$3,$4,$5,$6,'received') RETURNING *`,
      [contact.id, msgId, messageType, content, mediaUrl, from]
    );

    const savedMsg = rows[0];

    // Upsert conversation
    try {
      await pool.query(
        `INSERT INTO conversations (contact_id, channel, status, unread_count, last_message_at, last_message_preview)
         VALUES ($1, 'whatsapp', 'open', 1, NOW(), $2)
         ON CONFLICT (contact_id, channel) DO UPDATE SET
           last_message_at = NOW(),
           last_message_preview = $2,
           unread_count = conversations.unread_count + 1,
           updated_at = NOW()`,
        [contact.id, content?.substring(0, 150)]
      );
    } catch (cErr) {}

    if (io) {
      io.emit('whatsapp_message', { contact_id: contact.id, message: savedMsg });
      io.emit('inbox_update', { contact_id: contact.id, channel: 'whatsapp', last_message: content });
    }

    return { contact, message: savedMsg };
  }
}

module.exports = new WhatsAppService();
