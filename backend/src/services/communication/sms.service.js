const axios = require('axios');
const pool = require('../../db/pool');
const { isConfigured, providerUnavailable, isDemoMode, getDemoRecipient } = require('./provider.utils');
const msg91Service = require('./msg91.service');

class SMSService {
  /**
   * Send SMS message
   */
  async sendMessage({ contact_id, agent_id, phone_number, content, io }) {
    phone_number = getDemoRecipient(phone_number);
    let twilioSid = null;
    let status = 'sent';
    let errorMessage = null;

    const hasMsg91Config = isConfigured(
      process.env.MSG91_AUTH_KEY,
      process.env.MSG91_FLOW_TEMPLATE_ID,
    );
    const hasTwilioConfig = isConfigured(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
      process.env.TWILIO_PHONE_NUMBER,
    );

    if (isDemoMode()) {
      twilioSid = `demo_sms_${Date.now()}`;
      status = 'sent';
    } else if ((process.env.SMS_PROVIDER || 'msg91').toLowerCase() === 'msg91') {
      if (!hasMsg91Config) {
        status = 'failed';
        errorMessage = 'MSG91 is not configured. Add MSG91_AUTH_KEY and MSG91_FLOW_TEMPLATE_ID.';
      } else {
        try {
          const response = await msg91Service.sendMessage({ phone_number, content });
          twilioSid = response.providerId;
          status = response.status;
        } catch (msg91Err) {
          console.error('MSG91 error:', msg91Err.response?.data || msg91Err.message);
          status = 'failed';
          errorMessage = msg91Err.response?.data?.message || msg91Err.message;
        }
      }
    } else if (hasTwilioConfig) {
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
      if (process.env.MOCK_PROVIDERS === 'true') {
        twilioSid = `mock_sms_${Date.now()}`;
        status = 'sent';
      } else {
        status = 'failed';
        errorMessage = providerUnavailable('SMS provider').error;
      }
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
