const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const identityService = require('../services/identity.service');
const whatsappService = require('../services/communication/whatsapp.service');
const smsService = require('../services/communication/sms.service');
const emailService = require('../services/communication/email.service');
const { isSuccessful } = require('../services/communication/provider.utils');
const offerService = require('../services/offer.service');

const router = express.Router();
router.use(authenticate);

// GET /api/contacts - list with omnichannel search, filters, pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 25, search, status, assigned_to } = req.query;
    const offset = (page - 1) * limit;
    let conditions = ['c.is_deleted = false'];
    let params = [];
    let idx = 1;

    // Agents only see contacts assigned to them (role_level >= 4)
    if (req.user.role_level >= 4) {
      conditions.push(`(c.assigned_to = $${idx} OR c.assigned_to IS NULL)`);
      params.push(req.user.id);
      idx++;
    }

    if (search) {
      conditions.push(`(
        c.full_name ILIKE $${idx} OR 
        c.email ILIKE $${idx} OR 
        c.phone ILIKE $${idx} OR 
        c.whatsapp_number ILIKE $${idx} OR 
        c.company ILIKE $${idx} OR
        c.id::text ILIKE $${idx} OR
        $${idx + 1} = ANY(c.tags)
      )`);
      params.push(`%${search}%`);
      params.push(search);
      idx += 2;
    }
    if (status) { 
      conditions.push(`c.status = $${idx++}`); 
      params.push(status); 
    }
    if (assigned_to) { 
      conditions.push(`c.assigned_to = $${idx++}`); 
      params.push(assigned_to); 
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const { rows } = await pool.query(
      `SELECT c.*, u.full_name as assigned_to_name,
              (SELECT COUNT(*) FROM call_recordings WHERE contact_id = c.id) as call_count,
              (SELECT COUNT(*) FROM whatsapp_messages WHERE contact_id = c.id) as whatsapp_count,
              (SELECT COUNT(*) FROM emails WHERE contact_id = c.id) as email_count,
              (SELECT COUNT(*) FROM sms_messages WHERE contact_id = c.id) as sms_count,
              (SELECT COALESCE(SUM(value), 0) FROM deals WHERE contact_id = c.id) as total_deal_value,
              (SELECT MAX(occurred_at) FROM contact_timeline WHERE contact_id = c.id) as last_activity
       FROM contacts c 
       LEFT JOIN users u ON c.assigned_to = u.id
       ${where} 
       ORDER BY c.updated_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM contacts c ${where}`, params.slice(0, idx - 1)
    );

    res.json({
      contacts: rows,
      total: parseInt(countRows[0]?.count || 0),
      page: parseInt(page),
      pages: Math.ceil((countRows[0]?.count || 0) / limit),
    });
  } catch (err) {
    console.error('Contacts list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch contacts. Database may be offline.' });
  }
});

// GET /api/contacts/:id - full 360° Profile
router.get('/:id', async (req, res) => {
  try {
    const contactId = req.params.id;

    const { rows: contactRows } = await pool.query(
      `SELECT c.*, u.full_name as assigned_to_name, r.full_name as created_by_name
       FROM contacts c
       LEFT JOIN users u ON c.assigned_to = u.id
       LEFT JOIN users r ON c.created_by = r.id
       WHERE c.id = $1 AND c.is_deleted = false`,
      [contactId]
    );

    if (!contactRows[0]) return res.status(404).json({ error: 'Contact not found' });
    const contact = contactRows[0];

    // Enforce agent assignment check
    if (req.user.role_level >= 4 && contact.assigned_to && contact.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Parallel fetch 360° profile components
    const [
      channelsRes,
      timelineRes,
      dealsRes,
      notesRes,
      tasksRes,
      offersRes,
      campaignsRes,
      conversationsRes,
    ] = await Promise.all([
      // Channels
      pool.query(`SELECT * FROM contact_channels WHERE contact_id = $1 ORDER BY is_primary DESC, created_at ASC`, [contactId]).catch(() => ({ rows: [] })),
      // Unified Timeline (9 sources)
      pool.query(`SELECT * FROM contact_timeline WHERE contact_id = $1 ORDER BY occurred_at DESC LIMIT 100`, [contactId]).catch(() => ({ rows: [] })),
      // Deals
      pool.query(`SELECT d.*, u.full_name as assigned_to_name FROM deals d LEFT JOIN users u ON d.assigned_to = u.id WHERE d.contact_id = $1 ORDER BY d.created_at DESC`, [contactId]).catch(() => ({ rows: [] })),
      // Notes
      pool.query(`SELECT n.*, u.full_name as author_name FROM notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.contact_id = $1 ORDER BY n.created_at DESC`, [contactId]).catch(() => ({ rows: [] })),
      // Tasks
      pool.query(`SELECT t.*, u.full_name as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.contact_id = $1 ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`, [contactId]).catch(() => ({ rows: [] })),
      // Contact Offers
      pool.query(`SELECT co.*, o.title, o.discount_value, o.valid_until, u.full_name as sent_by_name FROM contact_offers co JOIN offers o ON co.offer_id = o.id LEFT JOIN users u ON co.sent_by = u.id WHERE co.contact_id = $1 ORDER BY co.sent_at DESC`, [contactId]).catch(() => ({ rows: [] })),
      // Campaigns
      pool.query(`SELECT cd.*, cmp.name as campaign_name, cmp.status as campaign_status FROM campaign_deliveries cd JOIN campaigns cmp ON cd.campaign_id = cmp.id WHERE cd.contact_id = $1 ORDER BY cd.created_at DESC`, [contactId]).catch(() => ({ rows: [] })),
      // Conversations
      pool.query(`SELECT * FROM conversations WHERE contact_id = $1 ORDER BY last_message_at DESC`, [contactId]).catch(() => ({ rows: [] })),
    ]);

    // Calculate Customer 360° metrics
    const totalDealValue = dealsRes.rows.reduce((sum, d) => sum + parseFloat(d.value || 0), 0);
    const wonDealValue = dealsRes.rows.filter(d => d.stage === 'won').reduce((sum, d) => sum + parseFloat(d.value || 0), 0);
    const totalInteractions = timelineRes.rows.length;
    const lastInteraction = timelineRes.rows[0]?.occurred_at || contact.updated_at;

    // Preferred channel calculation
    const channelCounts = {};
    timelineRes.rows.forEach(t => {
      channelCounts[t.channel] = (channelCounts[t.channel] || 0) + 1;
    });
    const preferredChannel = Object.keys(channelCounts).reduce((a, b) => (channelCounts[a] > channelCounts[b] ? a : b), 'whatsapp');

    res.json({
      contact,
      channels: channelsRes.rows,
      timeline: timelineRes.rows,
      deals: dealsRes.rows,
      notes: notesRes.rows,
      tasks: tasksRes.rows,
      offers: offersRes.rows,
      campaigns: campaignsRes.rows,
      conversations: conversationsRes.rows,
      metrics: {
        totalInteractions,
        lastInteraction,
        totalDealValue,
        wonDealValue,
        preferredChannel,
      },
    });
  } catch (err) {
    console.error('Contact 360 profile error:', err.message);
    res.status(500).json({ error: 'Server error loading customer profile' });
  }
});

// POST /api/contacts - create contact with identity resolution
router.post('/', authorize('agent'), async (req, res) => {
  try {
    const contact = await identityService.resolveOrCreateContact({
      ...req.body,
      source: req.body.source || 'manual',
    });
    res.status(201).json({ contact });
  } catch (err) {
    console.error('Create contact error:', err.message);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// PUT /api/contacts/:id - update contact
router.put('/:id', authorize('agent'), async (req, res) => {
  try {
    const { full_name, email, phone, whatsapp_number, company, job_title,
            address, city, country, status, tags, assigned_to, custom_fields } = req.body;

    const { rows } = await pool.query(
      `UPDATE contacts SET
        full_name=$1, email=$2, phone=$3, whatsapp_number=$4, company=$5,
        job_title=$6, address=$7, city=$8, country=$9, status=$10,
        tags=$11, assigned_to=$12, custom_fields=$13, updated_at=NOW()
       WHERE id=$14 AND is_deleted=false RETURNING *`,
      [full_name, email, phone, whatsapp_number, company, job_title,
       address, city, country, status, tags, assigned_to, custom_fields, req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Contact not found' });

    // Sync channels
    await identityService.ensureChannels(req.params.id, { phone, whatsapp: whatsapp_number, email });

    res.json({ contact: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/contacts/:id - soft delete (manager+)
router.delete('/:id', authorize('manager'), async (req, res) => {
  try {
    await pool.query('UPDATE contacts SET is_deleted=true, updated_at=NOW() WHERE id=$1', [req.params.id]);
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// ONE-CLICK "SEND EVERYWHERE"
// POST /api/contacts/:id/send-everywhere
// =============================================
router.post('/:id/send-everywhere', authorize('agent'), async (req, res) => {
  try {
    const contactId = req.params.id;
    const { channels = ['whatsapp', 'sms', 'email'], message, subject } = req.body;
    const allowedChannels = ['whatsapp', 'sms', 'email'];
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: 'channels must be an array' });
    }
    const invalidChannels = channels.filter((channel) => !allowedChannels.includes(channel));
    if (invalidChannels.length > 0) {
      return res.status(400).json({ error: `Unsupported channel(s): ${invalidChannels.join(', ')}` });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const io = req.app.get('io');

    const { rows } = await pool.query('SELECT * FROM contacts WHERE id = $1 AND is_deleted = false', [contactId]);
    if (!rows[0]) return res.status(404).json({ error: 'Contact not found' });
    const contact = rows[0];

    const results = {};
    let atLeastOneSuccess = false;

    // 1. WhatsApp
    if (channels.includes('whatsapp')) {
      const ph = contact.whatsapp_number || contact.phone;
      if (ph) {
        try {
          const resp = await whatsappService.sendMessage({
            contact_id: contactId,
            agent_id: req.user.id,
            phone_number: ph,
            message,
            io,
          });
          results.whatsapp = { status: resp.status, id: resp.message?.id, error: resp.error };
          if (isSuccessful(resp.status)) atLeastOneSuccess = true;
        } catch (err) {
          results.whatsapp = { status: 'failed', error: err.message };
        }
      } else {
        results.whatsapp = { status: 'failed', error: 'No phone/WhatsApp number available' };
      }
    }

    // 2. SMS
    if (channels.includes('sms')) {
      const ph = contact.phone;
      if (ph) {
        try {
          const resp = await smsService.sendMessage({
            contact_id: contactId,
            agent_id: req.user.id,
            phone_number: ph,
            content: message,
            io,
          });
          results.sms = { status: resp.status, id: resp.sms?.id, error: resp.error };
          if (isSuccessful(resp.status)) atLeastOneSuccess = true;
        } catch (err) {
          results.sms = { status: 'failed', error: err.message };
        }
      } else {
        results.sms = { status: 'failed', error: 'No phone number available' };
      }
    }

    // 3. Email
    if (channels.includes('email')) {
      if (contact.email) {
        try {
          const resp = await emailService.sendMessage({
            contact_id: contactId,
            agent_id: req.user.id,
            to_address: contact.email,
            subject: subject || `Notification for ${contact.full_name}`,
            body: message,
            io,
          });
          results.email = { status: resp.status, id: resp.email?.id, error: resp.error };
          if (isSuccessful(resp.status)) atLeastOneSuccess = true;
        } catch (err) {
          results.email = { status: 'failed', error: err.message };
        }
      } else {
        results.email = { status: 'failed', error: 'No email address available' };
      }
    }

    if (io) {
      io.emit('send_everywhere_completed', { contact_id: contactId, results });
    }

    const statuses = Object.values(results).map((result) => result.status);
    const success = atLeastOneSuccess;
    res.status(success && statuses.some((status) => status === 'failed') ? 207 : 200).json({
      success,
      demo: process.env.DEMO_MODE === 'true' && process.env.MOCK_PROVIDERS === 'true',
      status: success && statuses.some((status) => status === 'failed') ? 'partial' : (success ? 'sent' : 'failed'),
      results,
      summary: Object.entries(results).map(([ch, r]) => `${ch}: ${r.status}`).join(' | '),
    });
  } catch (err) {
    console.error('Send everywhere error:', err.message);
    res.status(500).json({ error: 'Failed to dispatch across channels' });
  }
});

// =============================================
// SEND OFFER DIRECTLY
// POST /api/contacts/:id/send-offer
// =============================================
router.post('/:id/send-offer', authorize('agent'), async (req, res) => {
  try {
    const { offer_id, channels = ['whatsapp'], custom_notes } = req.body;
    const io = req.app.get('io');

    const result = await offerService.sendOfferToContact({
      offer_id,
      contact_id: req.params.id,
      channels,
      custom_notes,
      user_id: req.user.id,
      io,
    });

    res.json(result);
  } catch (err) {
    console.error('Send offer error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to dispatch offer' });
  }
});

// =============================================
// CONTACT CHANNELS MANAGEMENT
// =============================================
router.post('/:id/channels', authorize('agent'), async (req, res) => {
  try {
    const { channel, identifier, is_primary, is_verified } = req.body;
    const ch = await identityService.addChannel(req.params.id, {
      channel,
      identifier,
      is_primary,
      is_verified,
    });
    res.status(201).json({ channel: ch });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add channel' });
  }
});

router.delete('/:id/channels/:channelId', authorize('agent'), async (req, res) => {
  try {
    await identityService.removeChannel(req.params.id, req.params.channelId);
    res.json({ message: 'Channel deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// =============================================
// NOTES
// =============================================
router.post('/:id/notes', authorize('agent'), async (req, res) => {
  try {
    const { title, content } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO notes (contact_id, user_id, title, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.user.id, title || 'Internal Note', content]
    );

    const note = rows[0];
    const io = req.app.get('io');
    if (io) io.emit('timeline_event', { contact_id: req.params.id, channel: 'note', data: note });

    res.status(201).json({ note });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// =============================================
// TASKS
// =============================================
router.post('/:id/tasks', authorize('agent'), async (req, res) => {
  try {
    const { title, description, due_date, priority = 'medium', assigned_to } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO tasks (contact_id, assigned_to, created_by, title, description, due_date, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, assigned_to || req.user.id, req.user.id, title, description, due_date || null, priority]
    );

    const task = rows[0];
    const io = req.app.get('io');
    if (io) io.emit('timeline_event', { contact_id: req.params.id, channel: 'task', data: task });

    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:id/tasks/:taskId', authorize('agent'), async (req, res) => {
  try {
    const { status, priority, due_date } = req.body;
    const { rows } = await pool.query(
      `UPDATE tasks SET 
        status = COALESCE($1, status),
        priority = COALESCE($2, priority),
        due_date = COALESCE($3, due_date),
        updated_at = NOW()
       WHERE id = $4 AND contact_id = $5 RETURNING *`,
      [status, priority, due_date, req.params.taskId, req.params.id]
    );
    res.json({ task: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// =============================================
// DEALS
// =============================================
router.post('/:id/deals', authorize('agent'), async (req, res) => {
  try {
    const { title, stage = 'new', value = 0, currency = 'INR', probability = 20, notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO deals (contact_id, assigned_to, title, stage, value, currency, probability, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.params.id, req.user.id, title, stage, value, currency, probability, notes]
    );

    const deal = rows[0];
    const io = req.app.get('io');
    if (io) io.emit('timeline_event', { contact_id: req.params.id, channel: 'deal', data: deal });

    res.status(201).json({ deal });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

module.exports = router;
