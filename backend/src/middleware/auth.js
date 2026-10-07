const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

// =============================================
// JWT Authentication Middleware
// =============================================
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    if (!process.env.JWT_SECRET) {
      console.error('FATAL: JWT_SECRET environment variable is not set');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user + role from DB on every request
    const { rows } = await pool.query(
      `SELECT u.*, r.name as role_name, r.level as role_level, r.permissions
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.userId]
    );

    if (!rows[0]) return res.status(401).json({ error: 'User not found or inactive' });
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Auth middleware error:', err.message);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// =============================================
// 5-Tier RBAC Authorization Middleware
// Usage: authorize('admin') or authorize('manager', 'contacts', 'write')
// =============================================
const authorize = (minRole, resource = null, action = null) => {
  const roleHierarchy = {
    super_admin: 1,
    admin: 2,
    manager: 3,
    agent: 4,
    viewer: 5,
  };

  return (req, res, next) => {
    const userLevel = req.user.role_level;
    const requiredLevel = roleHierarchy[minRole];

    if (!requiredLevel) {
      return res.status(500).json({ error: 'Invalid role configuration' });
    }

    // Level check: lower number = higher privilege
    if (userLevel > requiredLevel) {
      return res.status(403).json({
        error: 'Access denied',
        required: minRole,
        your_role: req.user.role_name,
      });
    }

    // Granular permission check if resource/action specified
    if (resource && action) {
      const perms = req.user.permissions;
      // Super admin bypasses all
      if (perms['*'] === true) return next();

      const resourcePerms = perms[resource];
      if (!resourcePerms) {
        return res.status(403).json({ error: `No access to resource: ${resource}` });
      }
      if (resourcePerms !== true && !resourcePerms[action]) {
        return res.status(403).json({ error: `No ${action} access to ${resource}` });
      }
    }

    next();
  };
};

// Shorthand role guards
const isSuperAdmin = authorize('super_admin');
const isAdmin = authorize('admin');
const isManager = authorize('manager');
const isAgent = authorize('agent');
const isViewer = authorize('viewer');

module.exports = { authenticate, authorize, isSuperAdmin, isAdmin, isManager, isAgent, isViewer };
