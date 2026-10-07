const axios = require('axios');
const pool = require('../../db/pool');

class SMSService {
  /**
   * Send SMS message
   */
  async sendMessage({ contact_id, agent_id, phone_number, content, io }) {
    let twilioSid = null;
    let status = 'sent';
    let errorMessage = null;

    const hasConfig = process.env.TWILIO_ACCOUNT_SID && 
                      process.env.TWILIO_AUTH_TOKEN && 
                      process.env.TWILIO_PHONE_NUMBER &&
                      !process.env.TWILIO_ACCOUNT_SID.startsWith('CHANGE_ME');

    if (hasConfig) {
      try {
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
            timeout: 10000,
          }
        );
        twilioSid = response.data.sid;
        status = response.data.status || 'sent';
      } catch (twilioErr) {
        console.error('Twilio error:', twilioErr.response?.data || twilioErr.message);
        status = 'failed';
        errorMessage = twilioErr.response?.data?.message || twilioErr.message;
      }
    } else {
      // Mock delivery when twilio not configured
      twilioSid = `mock_sms_${Date.now()}`;
      status = 'sent';
    }

    const { rows } = await pool.query(
      `INSERT INTO sms_messages (contact_id, agent_id, direction, content, phone_number, twilio_sid, status)
       VALUES ($1,$2,'outbound',$3,$4,$5,$6) RETURNING *`,
      [contact_id, agent_id || null, content, phone_number, twilioSid, status]
    );

    const savedMsg = rows[0];

    // Upsert into conversations
    try {
      await pool.query(
        `INSERT INTO conversations (contact_id, channel, status, assigned_to, last_message_at, last_message_preview)
         VALUES ($1, 'sms', 'open', $2, NOW(), $3)
         ON CONFLICT (contact_id, channel) DO UPDATE SET
           last_message_at = NOW(),
           last_message_preview = $3,
           updated_at = NOW()`,
        [contact_id, agent_id || null, content?.substring(0, 150)]
      );
    } catch (cErr) {}

    if (io) {
      io.emit('sms_message', { contact_id, message: savedMsg });
      io.emit('inbox_update', { contact_id, channel: 'sms', last_message: content });
    }

    return { sms: savedMsg, status, error: errorMessage };
  }

  /**
   * Process inbound SMS webhook
   */
  async processInbound({ from, body, messageSid, io }) {
    const identityService = require('../identity.service');
    const contact = await identityService.resolveOrCreateContact({
      phone: from,
      source: 'sms'
    });

    const { rows } = await pool.query(
      `INSERT INTO sms_messages (contact_id, direction, content, phone_number, twilio_sid, status)
       VALUES ($1,'inbound',$2,$3,$4,'received') RETURNING *`,
      [contact.id, body, from, messageSid]
    );

    const savedMsg = rows[0];

    try {
      await pool.query(
        `INSERT INTO conversations (contact_id, channel, status, unread_count, last_message_at, last_message_preview)
         VALUES ($1, 'sms', 'open', 1, NOW(), $2)
         ON CONFLICT (contact_id, channel) DO UPDATE SET
           last_message_at = NOW(),
           last_message_preview = $2,
           unread_count = conversations.unread_count + 1,
           updated_at = NOW()`,
        [contact.id, body?.substring(0, 150)]
      );
    } catch (cErr) {}

    if (io) {
      io.emit('sms_message', { contact_id: contact.id, message: savedMsg });
      io.emit('inbox_update', { contact_id: contact.id, channel: 'sms', last_message: body });
    }

    return { contact, sms: savedMsg };
  }
}

module.exports = new SMSService();
