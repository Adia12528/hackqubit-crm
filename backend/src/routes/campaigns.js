const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const campaignService = require('../services/campaign.service');

const router = express.Router();
router.use(authenticate);

// GET /api/campaigns - list campaigns
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.full_name as created_by_name,
              t.name as template_name,
              (SELECT COUNT(*) FROM campaign_deliveries WHERE campaign_id = c.id) as total_recipients,
              (SELECT COUNT(*) FROM campaign_deliveries WHERE campaign_id = c.id AND status = 'delivered') as total_delivered,
              (SELECT COUNT(*) FROM campaign_deliveries WHERE campaign_id = c.id AND status = 'failed') as total_failed
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN templates t ON c.template_id = t.id
       ORDER BY c.created_at DESC`
    );
    res.json({ campaigns: rows });
  } catch (err) {
    console.error('Campaigns list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/campaigns/:id - campaign details with deliveries
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.full_name as created_by_name, t.name as template_name
       FROM campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN templates t ON c.template_id = t.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Campaign not found' });

    const { rows: deliveries } = await pool.query(
      `SELECT cd.*, ct.full_name as contact_name, ct.company, ct.status as contact_status
       FROM campaign_deliveries cd
       JOIN contacts ct ON cd.contact_id = ct.id
       WHERE cd.campaign_id = $1
       ORDER BY cd.created_at DESC LIMIT 100`,
      [req.params.id]
    );

    res.json({ campaign: rows[0], deliveries });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/campaigns - create campaign
router.post('/', authorize('manager'), async (req, res) => {
  try {
    const { name, description, audience_filter = { status: 'all' }, channels = ['whatsapp'], template_id, subject, message_body, scheduled_at } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO campaigns (name, description, audience_filter, channels, template_id, subject, message_body, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, description, audience_filter, channels, template_id || null, subject, message_body, scheduled_at || null, req.user.id]
    );

    res.status(201).json({ campaign: rows[0] });
  } catch (err) {
    console.error('Create campaign error:', err.message);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// POST /api/campaigns/:id/send - execute campaign
router.post('/:id/send', authorize('manager'), async (req, res) => {
  try {
    const io = req.app.get('io');
    const updated = await campaignService.executeCampaign({
      campaign_id: req.params.id,
      user_id: req.user.id,
      io,
    });
    res.json({ campaign: updated, message: 'Campaign executed successfully' });
  } catch (err) {
    console.error('Execute campaign error:', err.message);
    res.status(500).json({ error: err.message || 'Campaign execution failed' });
  }
});

module.exports = router;
