const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { rows } = await pool.query(
      `SELECT u.*, r.name as role_name, r.level as role_level, r.permissions
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email.toLowerCase()]
    );

    if (!rows[0]) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { userId: user.id, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role_name,
        role_level: user.role_level,
        permissions: user.permissions,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Authentication service unavailable. Please try again.' });
  }
});

// POST /api/auth/register (Admin only via app)
router.post('/register', authenticate, async (req, res) => {
  try {
    if (req.user.role_level > 2) {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    const { email, password, full_name, role_id, phone } = req.body;
    
    // Prevent privilege escalation: can't create user with higher role than yourself
    if (role_id && role_id < req.user.role_id) {
      return res.status(403).json({ error: 'Cannot create user with higher privileges' });
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, phone)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role_id`,
      [email.toLowerCase(), hash, full_name, role_id || 4, phone]
    );

    res.status(201).json({ user: rows[0], message: 'User created successfully' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { password_hash, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

module.exports = router;
