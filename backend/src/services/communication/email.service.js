const nodemailer = require('nodemailer');
const pool = require('../../db/pool');
const { isConfigured, providerUnavailable, isDemoMode } = require('./provider.utils');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatEmailHtml(body) {
  const paragraphs = String(body)
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map(paragraph => `<p style="margin:0 0 16px;">${escapeHtml(paragraph).replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `
    <div style="margin:0;background:#f4f7fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#172033;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;overflow:hidden;">
        <div style="background:#172554;padding:22px 28px;color:#ffffff;">
          <div style="font-size:18px;font-weight:700;letter-spacing:-.02em;">HackQubit CRM</div>
          <div style="margin-top:4px;font-size:12px;color:#bfdbfe;">Customer communication</div>
        </div>
        <div style="padding:28px;font-size:15px;line-height:1.65;">
          ${paragraphs}
        </div>
        <div style="border-top:1px solid #e5eaf2;padding:16px 28px;color:#64748b;font-size:12px;">
          Sent from HackQubit CRM
        </div>
      </div>
    </div>
  `;
}

class EmailService {
  createTransporter() {
    const rawPass = process.env.SMTP_PASS || '';
    // Strip spaces if user provided a 16-character Gmail app password with spaces
    const cleanPass = (process.env.SMTP_HOST || '').includes('gmail')
      ? rawPass.replace(/\s+/g, '')
      : rawPass;

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: cleanPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }

  /**
   * Send Email message
   */
  async sendMessage({ contact_id, agent_id, to_address, subject, body, body_html, cc_addresses, io }) {
    const recipient = typeof to_address === 'string' ? to_address.trim() : '';
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return { status: 'failed', error: 'A valid recipient email address is required.' };
    }

    const textBody = typeof body === 'string' ? body.trim() : '';
    if (!textBody) {
      return { status: 'failed', error: 'Email body is required.' };
    }

    let status = 'sent';
    let messageId = null;
    let errorMessage = null;
    const formattedHtml = body_html || formatEmailHtml(textBody);

    const hasConfig = isConfigured(
      process.env.SMTP_HOST,
      process.env.SMTP_USER,
      process.env.SMTP_PASS,
    );

    if (isDemoMode()) {
      messageId = `demo_email_${Date.now()}@hackqubit.local`;
      status = 'sent';
    } else if (hasConfig) {
      try {
        const transporter = this.createTransporter();
        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM || `HackQubit CRM <${process.env.SMTP_USER}>`,
          to: recipient,
          cc: Array.isArray(cc_addresses) && cc_addresses.length > 0 ? cc_addresses.join(', ') : undefined,
          subject: subject || 'Message from HackQubit CRM',
          text: textBody,
          html: formattedHtml,
        });
        messageId = info.messageId;
      } catch (smtpErr) {
        console.error('SMTP error:', smtpErr.message);
        status = 'failed';
        errorMessage = `SMTP Delivery Error: ${smtpErr.message}`;
      }
    } else {
      if (process.env.MOCK_PROVIDERS === 'true') {
        messageId = `mock_email_${Date.now()}@hackqubit.local`;
        status = 'sent';
      } else {
        status = 'failed';
        errorMessage = providerUnavailable('SMTP email').error;
      }
    }

    const sanitizedCc = Array.isArray(cc_addresses) && cc_addresses.length > 0 ? cc_addresses : null;

    const { rows } = await pool.query(
      `INSERT INTO emails (contact_id, agent_id, direction, subject, body, body_html,
        from_address, to_address, cc_addresses, status, message_id)
       VALUES ($1,$2,'outbound',$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        contact_id || null,
        agent_id || null,
        subject || 'Message from HackQubit CRM',
        textBody,
        formattedHtml,
        process.env.SMTP_USER || 'crm@hackqubit.local',
        recipient,
        sanitizedCc,
        status,
        messageId || null,
      ]
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
