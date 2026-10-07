const express = require('express');
const multer = require('multer');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const { BUCKETS, getPresignedUrl, uploadFile } = require('../config/minio');
const callService = require('../services/communication/call.service');

const router = express.Router();
router.use(authenticate);

// Multer for in-memory upload (pushed to MinIO)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only audio files allowed.'));
  }
});

// GET /api/calls - list call recordings
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, contact_id, direction } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (contact_id) { conditions.push(`cr.contact_id = $${idx++}`); params.push(contact_id); }
    if (direction) { conditions.push(`cr.direction = $${idx++}`); params.push(direction); }
    if (req.user.role_level >= 4) {
      conditions.push(`cr.agent_id = $${idx++}`);
      params.push(req.user.id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT cr.*, c.full_name as contact_name, c.phone as contact_phone,
              u.full_name as agent_name
       FROM call_recordings cr
       LEFT JOIN contacts c ON cr.contact_id = c.id
       LEFT JOIN users u ON cr.agent_id = u.id
       ${where} ORDER BY cr.started_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    res.json({ calls: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/calls/start - log a call start (WebRTC/SIP)
router.post('/start', authorize('agent'), async (req, res) => {
  try {
    const { contact_id, direction, phone_number, sip_call_id } = req.body;
    const io = req.app.get('io');

    const call = await callService.startCall({
      contact_id,
      agent_id: req.user.id,
      direction,
      phone_number,
      sip_call_id,
      io,
    });

    res.status(201).json({ call });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/calls/:id/end - end call with recording upload
router.post('/:id/end', authorize('agent'), upload.single('recording'), async (req, res) => {
  try {
    const { notes, duration_seconds } = req.body;
    let recording_url = null;

    if (req.file) {
      try {
        const objectName = `${req.params.id}/${Date.now()}.${req.file.mimetype.split('/')[1] || 'webm'}`;
        await uploadFile(
          BUCKETS.RECORDINGS,
          objectName,
          req.file.buffer,
          req.file.size,
          req.file.mimetype
        );
        recording_url = objectName;
      } catch (minioErr) {
        console.warn('MinIO upload unavailable:', minioErr.message);
      }
    }

    const { rows } = await pool.query(
      `UPDATE call_recordings SET 
        call_status='completed', notes=$1, duration_seconds=$2,
        recording_url=$3, recording_size_bytes=$4, ended_at=NOW()
       WHERE id=$5 RETURNING *`,
      [notes, duration_seconds || 0, recording_url, req.file?.size || 0, req.params.id]
    );

    const call = rows[0];
    const io = req.app.get('io');
    if (io) io.emit('call_update', { contact_id: call?.contact_id, call, action: 'ended' });

    res.json({ call });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/calls/:id/recording - stream recording via presigned URL
router.get('/:id/recording', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT recording_url FROM call_recordings WHERE id=$1',
      [req.params.id]
    );

    if (!rows[0]?.recording_url) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const url = await getPresignedUrl(BUCKETS.RECORDINGS, rows[0].recording_url);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/calls/log - log completed call directly
router.post('/log', authorize('agent'), async (req, res) => {
  try {
    const { contact_id, direction, phone_number, duration_seconds, notes, call_status } = req.body;
    const io = req.app.get('io');

    const call = await callService.logCall({
      contact_id,
      agent_id: req.user.id,
      direction,
      phone_number,
      duration_seconds,
      notes,
      call_status,
      io,
    });

    res.status(201).json({ call });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
