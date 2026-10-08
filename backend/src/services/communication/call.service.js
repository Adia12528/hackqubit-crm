const pool = require('../../db/pool');
const { v4: uuidv4 } = require('uuid');
const { BUCKETS, getPresignedUrl, uploadFile } = require('../../config/minio');
const { getDemoRecipient } = require('./provider.utils');

class CallService {
  /**
   * Start a call session
   */
  async startCall({ contact_id, agent_id, direction, phone_number, sip_call_id, io }) {
    phone_number = getDemoRecipient(phone_number);
    const callId = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO call_recordings (id, contact_id, agent_id, direction, phone_number, sip_call_id, 
        call_status, started_at)
       VALUES ($1,$2,$3,$4,$5,$6,'active',NOW()) RETURNING *`,
      [callId, contact_id, agent_id || null, direction || 'outbound', phone_number, sip_call_id]
    );

    const call = rows[0];

    try {
      await pool.query(
        `INSERT INTO conversations (contact_id, channel, status, assigned_to, last_message_at, last_message_preview)
         VALUES ($1, 'call', 'open', $2, NOW(), $3)
         ON CONFLICT (contact_id, channel) DO UPDATE SET
           last_message_at = NOW(),
           last_message_preview = $3,
           updated_at = NOW()`,
        [contact_id, agent_id || null, `Active Call (${direction || 'outbound'})`]
      );
    } catch (cErr) {}

    if (io) {
      io.emit('call_update', { contact_id, call, action: 'started' });
      io.emit('inbox_update', { contact_id, channel: 'call', last_message: `Active Call (${direction})` });
    }

    return call;
  }

  /**
   * Log completed call directly
   */
  async logCall({ contact_id, agent_id, direction, phone_number, duration_seconds, notes, call_status, io }) {
    phone_number = getDemoRecipient(phone_number);
    const { rows } = await pool.query(
      `INSERT INTO call_recordings (contact_id, agent_id, direction, phone_number, 
        duration_seconds, notes, call_status, started_at, ended_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()-($5 || ' seconds')::interval,NOW()) RETURNING *`,
      [contact_id, agent_id || null, direction || 'outbound', phone_number, duration_seconds || 0, notes, call_status || 'completed']
    );

    const call = rows[0];
    const preview = `${call_status || 'completed'} call (${duration_seconds || 0}s): ${notes || 'No notes'}`;

    try {
      await pool.query(
        `INSERT INTO conversations (contact_id, channel, status, assigned_to, last_message_at, last_message_preview)
         VALUES ($1, 'call', 'closed', $2, NOW(), $3)
         ON CONFLICT (contact_id, channel) DO UPDATE SET
           last_message_at = NOW(),
           last_message_preview = $3,
           updated_at = NOW()`,
        [contact_id, agent_id || null, preview]
      );
    } catch (cErr) {}

    if (io) {
      io.emit('call_update', { contact_id, call, action: 'logged' });
      io.emit('inbox_update', { contact_id, channel: 'call', last_message: preview });
    }

    return call;
  }
}

module.exports = new CallService();
