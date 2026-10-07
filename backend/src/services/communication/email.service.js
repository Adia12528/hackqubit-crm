const nodemailer = require('nodemailer');
const pool = require('../../db/pool');

class EmailService {
  createTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 5000,
    });
  }

  /**
   * Send Email message
   */
  async sendMessage({ contact_id, agent_id, to_address, subject, body, body_html, cc_addresses, io }) {
    let status = 'sent';
    let messageId = null;
    let errorMessage = null;

    const hasConfig = process.env.SMTP_HOST && 
                      process.env.SMTP_USER && 
                      !process.env.SMTP_HOST.startsWith('CHANGE_ME');

    if (hasConfig) {
      try {
        const transporter = this.createTransporter();
        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM || `HackQubit CRM <${process.env.SMTP_USER}>`,
          to: to_address,
          cc: cc_addresses?.join(', '),
          subject: subject || 'Message from HackQubit CRM',
          text: body,
          html: body_html || `<div style="font-family:sans-serif;line-height:1.6;">${(body || '').replace(/\n/g, '<br/>')}</div>`,
        });
        messageId = info.messageId;
      } catch (smtpErr) {
        console.error('SMTP error:', smtpErr.message);
        status = 'failed';
        errorMessage = smtpErr.message;
      }
    } else {
      // Mock sent when SMTP placeholder
      messageId = `mock_email_${Date.now()}@hackqubit.local`;
      status = 'sent';
    }

    const { rows } = await pool.query(
      `INSERT INTO emails (contact_id, agent_id, direction, subject, body, body_html,
        from_address, to_address, cc_addresses, status, message_id)
       VALUES ($1,$2,'outbound',$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [contact_id, agent_id || null, subject, body, body_html,
       process.env.SMTP_USER || 'crm@hackqubit.local', to_address, cc_addresses, status, messageId]
    );

    const savedEmail = rows[0];

    // Upsert into conversations
    try {
      await pool.query(
        `INSERT INTO conversations (contact_id, channel, status, assigned_to, last_message_at, last_message_preview)
         VALUES ($1, 'email', 'open', $2, NOW(), $3)
         ON CONFLICT (contact_id, channel) DO UPDATE SET
           last_message_at = NOW(),
           last_message_preview = $3,
           updated_at = NOW()`,
        [contact_id, agent_id || null, subject || body?.substring(0, 150)]
      );
    } catch (cErr) {}

    if (io) {
      io.emit('email_message', { contact_id, email: savedEmail });
      io.emit('inbox_update', { contact_id, channel: 'email', last_message: subject });
    }

    return { email: savedEmail, status, error: errorMessage };
  }

  /**
   * Inbound email webhook
   */
  async processInbound({ from, to, subject, body, message_id, contact_id, io }) {
    const identityService = require('../identity.service');
    let cId = contact_id;

    if (!cId) {
      const contact = await identityService.resolveOrCreateContact({
        email: from,
        source: 'email'
      });
      cId = contact.id;
    }

    const { rows } = await pool.query(
      `INSERT INTO emails (contact_id, direction, subject, body, from_address, to_address, 
        status, message_id) VALUES ($1,'inbound',$2,$3,$4,$5,'received',$6) RETURNING *`,
      [cId, subject, body, from, to, message_id]
    );

    const savedEmail = rows[0];

    try {
      await pool.query(
        `INSERT INTO conversations (contact_id, channel, status, unread_count, last_message_at, last_message_preview)
         VALUES ($1, 'email', 'open', 1, NOW(), $2)
         ON CONFLICT (contact_id, channel) DO UPDATE SET
           last_message_at = NOW(),
           last_message_preview = $2,
           unread_count = conversations.unread_count + 1,
           updated_at = NOW()`,
        [cId, subject || body?.substring(0, 150)]
      );
    } catch (cErr) {}

    if (io) {
      io.emit('email_message', { contact_id: cId, email: savedEmail });
      io.emit('inbox_update', { contact_id: cId, channel: 'email', last_message: subject });
    }

    return { contact_id: cId, email: savedEmail };
  }
}

module.exports = new EmailService();
