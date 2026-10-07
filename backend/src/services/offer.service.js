const pool = require('../db/pool');
const whatsappService = require('./communication/whatsapp.service');
const smsService = require('./communication/sms.service');
const emailService = require('./communication/email.service');

class OfferService {
  /**
   * Dispatch a commercial offer directly to a contact
   */
  async sendOfferToContact({ offer_id, contact_id, channels = ['whatsapp'], custom_notes, user_id, io }) {
    // 1. Fetch offer and contact
    const [offerRes, contactRes] = await Promise.all([
      pool.query('SELECT * FROM offers WHERE id = $1', [offer_id]),
      pool.query('SELECT * FROM contacts WHERE id = $1', [contact_id]),
    ]);

    if (!offerRes.rows[0]) throw new Error('Offer not found');
    if (!contactRes.rows[0]) throw new Error('Contact not found');

    const offer = offerRes.rows[0];
    const contact = contactRes.rows[0];

    const firstName = contact.full_name?.split(' ')[0] || 'Valued Customer';
    const messageText = `Special Offer for ${firstName}!\n\n🏷️ ${offer.title}\nBenefit: ${offer.discount_value || 'Special pricing'}\n\n${offer.description || ''}\n${offer.terms ? `Terms: ${offer.terms}` : ''}\n${custom_notes ? `\nPersonal Note: ${custom_notes}` : ''}`;
    const emailSubject = `Special Offer: ${offer.title} for ${contact.company || firstName}`;

    const channelResults = {};

    for (const ch of channels) {
      try {
        if (ch === 'whatsapp') {
          const ph = contact.whatsapp_number || contact.phone;
          if (ph) {
            const res = await whatsappService.sendMessage({
              contact_id,
              agent_id: user_id,
              phone_number: ph,
              message: messageText,
              io,
            });
            channelResults.whatsapp = { status: res.status, error: res.error };
          } else {
            channelResults.whatsapp = { status: 'failed', error: 'No WhatsApp number' };
          }
        } else if (ch === 'sms') {
          const ph = contact.phone;
          if (ph) {
            const res = await smsService.sendMessage({
              contact_id,
              agent_id: user_id,
              phone_number: ph,
              content: messageText,
              io,
            });
            channelResults.sms = { status: res.status, error: res.error };
          } else {
            channelResults.sms = { status: 'failed', error: 'No phone number' };
          }
        } else if (ch === 'email') {
          if (contact.email) {
            const res = await emailService.sendMessage({
              contact_id,
              agent_id: user_id,
              to_address: contact.email,
              subject: emailSubject,
              body: messageText,
              io,
            });
            channelResults.email = { status: res.status, error: res.error };
          } else {
            channelResults.email = { status: 'failed', error: 'No email address' };
          }
        }
      } catch (err) {
        channelResults[ch] = { status: 'failed', error: err.message };
      }
    }

    // Record into contact_offers
    const { rows: coRows } = await pool.query(
      `INSERT INTO contact_offers (offer_id, contact_id, sent_by, channels, status, custom_notes, sent_at)
       VALUES ($1, $2, $3, $4, 'sent', $5, NOW()) RETURNING *`,
      [offer_id, contact_id, user_id, channels, custom_notes]
    );

    if (io) {
      io.emit('offer_sent', { contact_id, offer_id, channels: channelResults });
      io.emit('timeline_event', { contact_id, channel: 'offer', data: { title: offer.title } });
    }

    return {
      contact_offer: coRows[0],
      channelResults,
    };
  }
}

module.exports = new OfferService();
