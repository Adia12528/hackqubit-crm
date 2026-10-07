const pool = require('../db/pool');

/**
 * Customer Identity Resolution Service
 * Resolves contacts across Phone, WhatsApp, Email, and extensible channels
 * Prevents fragmented duplicate profiles.
 */
class IdentityService {
  /**
   * Resolves existing contact or creates a unified profile
   */
  async resolveOrCreateContact({ full_name, email, phone, whatsapp_number, source = 'manual', status = 'lead', company, job_title }) {
    const cleanPhone = phone ? phone.trim().replace(/\s+/g, '') : null;
    const cleanWhatsapp = whatsapp_number ? whatsapp_number.trim().replace(/\s+/g, '') : cleanPhone;
    const cleanEmail = email ? email.trim().toLowerCase() : null;

    let matchedContact = null;

    // 1. Search in contact_channels first (covers all registered identifiers)
    const channelQueries = [];
    const channelParams = [];
    let paramIdx = 1;

    if (cleanPhone) {
      channelQueries.push(`(channel IN ('phone', 'sms') AND identifier = $${paramIdx++})`);
      channelParams.push(cleanPhone);
    }
    if (cleanWhatsapp) {
      channelQueries.push(`(channel = 'whatsapp' AND identifier = $${paramIdx++})`);
      channelParams.push(cleanWhatsapp);
    }
    if (cleanEmail) {
      channelQueries.push(`(channel = 'email' AND LOWER(identifier) = $${paramIdx++})`);
      channelParams.push(cleanEmail);
    }

    if (channelQueries.length > 0) {
      try {
        const { rows } = await pool.query(
          `SELECT c.* FROM contacts c
           JOIN contact_channels cc ON c.id = cc.contact_id
           WHERE c.is_deleted = false AND (${channelQueries.join(' OR ')})
           LIMIT 1`,
          channelParams
        );
        if (rows[0]) matchedContact = rows[0];
      } catch (err) {
        // Table contact_channels might be migrating
      }
    }

    // 2. Direct lookup on contacts table (fallback or legacy)
    if (!matchedContact) {
      let directConditions = [];
      let directParams = [];
      let dIdx = 1;

      if (cleanPhone) {
        directConditions.push(`phone = $${dIdx} OR whatsapp_number = $${dIdx}`);
        directParams.push(cleanPhone);
        dIdx++;
      }
      if (cleanWhatsapp && cleanWhatsapp !== cleanPhone) {
        directConditions.push(`whatsapp_number = $${dIdx} OR phone = $${dIdx}`);
        directParams.push(cleanWhatsapp);
        dIdx++;
      }
      if (cleanEmail) {
        directConditions.push(`LOWER(email) = $${dIdx}`);
        directParams.push(cleanEmail);
        dIdx++;
      }

      if (directConditions.length > 0) {
        try {
          const { rows } = await pool.query(
            `SELECT * FROM contacts WHERE is_deleted = false AND (${directConditions.join(' OR ')}) LIMIT 1`,
            directParams
          );
          if (rows[0]) matchedContact = rows[0];
        } catch (err) {
          console.error('Direct contact search error:', err.message);
        }
      }
    }

    // 3. If contact found, enrich any missing details and ensure channels exist
    if (matchedContact) {
      const updates = [];
      const updateParams = [];
      let uIdx = 1;

      if (cleanEmail && !matchedContact.email) {
        updates.push(`email = $${uIdx++}`);
        updateParams.push(cleanEmail);
      }
      if (cleanPhone && !matchedContact.phone) {
        updates.push(`phone = $${uIdx++}`);
        updateParams.push(cleanPhone);
      }
      if (cleanWhatsapp && !matchedContact.whatsapp_number) {
        updates.push(`whatsapp_number = $${uIdx++}`);
        updateParams.push(cleanWhatsapp);
      }
      if (company && !matchedContact.company) {
        updates.push(`company = $${uIdx++}`);
        updateParams.push(company);
      }
      if (job_title && !matchedContact.job_title) {
        updates.push(`job_title = $${uIdx++}`);
        updateParams.push(job_title);
      }

      if (updates.length > 0) {
        updateParams.push(matchedContact.id);
        const { rows } = await pool.query(
          `UPDATE contacts SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${uIdx} RETURNING *`,
          updateParams
        );
        matchedContact = rows[0] || matchedContact;
      }

      // Link any newly discovered channels
      await this.ensureChannels(matchedContact.id, {
        phone: cleanPhone || matchedContact.phone,
        whatsapp: cleanWhatsapp || matchedContact.whatsapp_number,
        email: cleanEmail || matchedContact.email
      });

      return matchedContact;
    }

    // 4. Create new contact
    const displayName = full_name || cleanEmail || cleanPhone || 'New Customer';
    const { rows: created } = await pool.query(
      `INSERT INTO contacts (full_name, email, phone, whatsapp_number, company, job_title, status, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [displayName, cleanEmail, cleanPhone, cleanWhatsapp, company || null, job_title || null, status, source]
    );

    const newContact = created[0];

    // Seed contact_channels
    await this.ensureChannels(newContact.id, {
      phone: cleanPhone,
      whatsapp: cleanWhatsapp,
      email: cleanEmail
    });

    return newContact;
  }

  /**
   * Ensures channel entries exist in contact_channels
   */
  async ensureChannels(contactId, { phone, whatsapp, email }) {
    try {
      if (phone) {
        await pool.query(
          `INSERT INTO contact_channels (contact_id, channel, identifier, is_primary, is_verified)
           VALUES ($1, 'phone', $2, true, true)
           ON CONFLICT (contact_id, channel, identifier) DO UPDATE SET is_active = true, updated_at = NOW()`,
          [contactId, phone]
        );
        await pool.query(
          `INSERT INTO contact_channels (contact_id, channel, identifier, is_primary, is_verified)
           VALUES ($1, 'sms', $2, true, true)
           ON CONFLICT (contact_id, channel, identifier) DO UPDATE SET is_active = true, updated_at = NOW()`,
          [contactId, phone]
        );
      }
      if (whatsapp) {
        await pool.query(
          `INSERT INTO contact_channels (contact_id, channel, identifier, is_primary, is_verified)
           VALUES ($1, 'whatsapp', $2, true, true)
           ON CONFLICT (contact_id, channel, identifier) DO UPDATE SET is_active = true, updated_at = NOW()`,
          [contactId, whatsapp]
        );
      }
      if (email) {
        await pool.query(
          `INSERT INTO contact_channels (contact_id, channel, identifier, is_primary, is_verified)
           VALUES ($1, 'email', $2, true, true)
           ON CONFLICT (contact_id, channel, identifier) DO UPDATE SET is_active = true, updated_at = NOW()`,
          [contactId, email]
        );
      }
    } catch (err) {
      // Non-fatal if contact_channels table is not yet migrated
      console.warn('ensureChannels notice:', err.message);
    }
  }

  /**
   * Fetch all channels for a contact
   */
  async getContactChannels(contactId) {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM contact_channels WHERE contact_id = $1 AND is_active = true ORDER BY is_primary DESC, created_at ASC`,
        [contactId]
      );
      return rows;
    } catch (err) {
      return [];
    }
  }

  /**
   * Add a new channel identifier
   */
  async addChannel(contactId, { channel, identifier, is_primary = false, is_verified = false, metadata = {} }) {
    const { rows } = await pool.query(
      `INSERT INTO contact_channels (contact_id, channel, identifier, is_primary, is_verified, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (contact_id, channel, identifier) DO UPDATE SET is_active = true, updated_at = NOW()
       RETURNING *`,
      [contactId, channel, identifier, is_primary, is_verified, metadata]
    );

    // If primary, update main contacts table column
    if (is_primary) {
      if (channel === 'phone') await pool.query('UPDATE contacts SET phone = $1, updated_at = NOW() WHERE id = $2', [identifier, contactId]);
      if (channel === 'whatsapp') await pool.query('UPDATE contacts SET whatsapp_number = $1, updated_at = NOW() WHERE id = $2', [identifier, contactId]);
      if (channel === 'email') await pool.query('UPDATE contacts SET email = $1, updated_at = NOW() WHERE id = $2', [identifier, contactId]);
    }

    return rows[0];
  }

  /**
   * Remove a channel
   */
  async removeChannel(contactId, channelId) {
    await pool.query('DELETE FROM contact_channels WHERE id = $1 AND contact_id = $2', [channelId, contactId]);
    return true;
  }
}

module.exports = new IdentityService();
