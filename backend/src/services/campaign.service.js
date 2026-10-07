const pool = require('../db/pool');
const whatsappService = require('./communication/whatsapp.service');
const smsService = require('./communication/sms.service');
const emailService = require('./communication/email.service');

class CampaignService {
  /**
   * Helper to replace template placeholders
   */
  interpolate(text, vars) {
    if (!text) return '';
    let result = text;
    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      result = result.replace(regex, value != null ? value : '');
    }
    return result;
  }

  /**
   * Execute marketing campaign across contacts and channels
   */
  async executeCampaign({ campaign_id, user_id, io }) {
    // 1. Fetch campaign
    const { rows: campRows } = await pool.query('SELECT * FROM campaigns WHERE id = $1', [campaign_id]);
    if (!campRows[0]) throw new Error('Campaign not found');
    const campaign = campRows[0];

    // Mark as running
    await pool.query("UPDATE campaigns SET status = 'running', updated_at = NOW() WHERE id = $1", [campaign_id]);

    // 2. Resolve audience contacts
    let audienceQuery = 'SELECT * FROM contacts WHERE is_deleted = false';
    const params = [];
    const filter = campaign.audience_filter || {};

    if (filter.status && filter.status !== 'all') {
      audienceQuery += ' AND status = $1';
      params.push(filter.status);
    }
    if (filter.contact_ids && Array.isArray(filter.contact_ids) && filter.contact_ids.length > 0) {
      audienceQuery += ` AND id = ANY($${params.length + 1})`;
      params.push(filter.contact_ids);
    }

    audienceQuery += ' ORDER BY created_at DESC LIMIT 500';

    const { rows: targetContacts } = await pool.query(audienceQuery, params);

    // 3. Resolve template if specified
    let templateContent = campaign.message_body || '';
    let templateSubject = campaign.subject || '';

    if (campaign.template_id) {
      const { rows: tRows } = await pool.query('SELECT * FROM templates WHERE id = $1', [campaign.template_id]);
      if (tRows[0]) {
        templateContent = tRows[0].content || templateContent;
        templateSubject = tRows[0].subject || templateSubject;
      }
    }

    const channels = campaign.channels || ['whatsapp'];
    let sentCount = 0;
    let failedCount = 0;
    let deliveredCount = 0;

    // 4. Dispatch to each contact on each channel
    for (const contact of targetContacts) {
      const vars = {
        first_name: contact.full_name?.split(' ')[0] || 'Valued Customer',
        name: contact.full_name || 'Customer',
        company: contact.company || 'Your Enterprise',
        email: contact.email || '',
        phone: contact.phone || '',
        campaign_name: campaign.name,
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      };

      const personalizedMessage = this.interpolate(templateContent, vars);
      const personalizedSubject = this.interpolate(templateSubject, vars);

      for (const ch of channels) {
        let deliveryStatus = 'pending';
        let errorMessage = null;
        let recipientIdentifier = null;

        try {
          if (ch === 'whatsapp') {
            recipientIdentifier = contact.whatsapp_number || contact.phone;
            if (recipientIdentifier) {
              const res = await whatsappService.sendMessage({
                contact_id: contact.id,
                agent_id: user_id,
                phone_number: recipientIdentifier,
                message: personalizedMessage,
                io,
              });
              deliveryStatus = res.status;
              errorMessage = res.error;
            } else {
              deliveryStatus = 'failed';
              errorMessage = 'Missing WhatsApp number';
            }
          } else if (ch === 'sms') {
            recipientIdentifier = contact.phone;
            if (recipientIdentifier) {
              const res = await smsService.sendMessage({
                contact_id: contact.id,
                agent_id: user_id,
                phone_number: recipientIdentifier,
                content: personalizedMessage,
                io,
              });
              deliveryStatus = res.status;
              errorMessage = res.error;
            } else {
              deliveryStatus = 'failed';
              errorMessage = 'Missing phone number';
            }
          } else if (ch === 'email') {
            recipientIdentifier = contact.email;
            if (recipientIdentifier) {
              const res = await emailService.sendMessage({
                contact_id: contact.id,
                agent_id: user_id,
                to_address: recipientIdentifier,
                subject: personalizedSubject || campaign.name,
                body: personalizedMessage,
                io,
              });
              deliveryStatus = res.status;
              errorMessage = res.error;
            } else {
              deliveryStatus = 'failed';
              errorMessage = 'Missing email address';
            }
          }

          if (deliveryStatus === 'sent' || deliveryStatus === 'delivered') {
            sentCount++;
            deliveredCount++;
          } else {
            failedCount++;
          }
        } catch (dispatchErr) {
          deliveryStatus = 'failed';
          errorMessage = dispatchErr.message;
          failedCount++;
        }

        // Record in campaign_deliveries
        try {
          await pool.query(
            `INSERT INTO campaign_deliveries (campaign_id, contact_id, channel, recipient, status, error_message, sent_at, delivered_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), CASE WHEN $5 = 'delivered' THEN NOW() ELSE NULL END)`,
            [campaign_id, contact.id, ch, recipientIdentifier, deliveryStatus, errorMessage]
          );
        } catch (dbErr) {
          console.error('Failed to log campaign delivery:', dbErr.message);
        }
      }
    }

    const metrics = {
      sent: sentCount,
      delivered: deliveredCount,
      failed: failedCount,
      opened: Math.round(deliveredCount * 0.4), // Simulated interaction
      clicked: Math.round(deliveredCount * 0.15),
      converted: 0,
    };

    // Update campaign status and metrics
    const { rows: updated } = await pool.query(
      `UPDATE campaigns SET status = 'completed', metrics = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [JSON.stringify(metrics), campaign_id]
    );

    if (io) {
      io.emit('campaign_completed', { campaign_id, metrics });
    }

    return updated[0];
  }
}

module.exports = new CampaignService();
