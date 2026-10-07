import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">Q</div>
        <div>
          <h1>HackQubit CRM</h1>
          <span>Self-Hosted Suite</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Core Operations</div>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📊</span>
          <span>Analytics KPI</span>
        </NavLink>

        <NavLink to="/contacts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">👥</span>
          <span>Customers & CRM</span>
        </NavLink>

        <div className="nav-section-label">Omni-Channel</div>
        <NavLink to="/calls" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📞</span>
          <span>Voice & Recordings</span>
        </NavLink>

        <NavLink to="/whatsapp" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">💬</span>
          <span>WhatsApp Cloud</span>
        </NavLink>

        <NavLink to="/omnichannel" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">⚡</span>
          <span>Email & SMS Hub</span>
        </NavLink>

        <div className="nav-section-label">Security & Control</div>
        <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🛡️</span>
          <span>5-Tier RBAC</span>
        </NavLink>
      </nav>

      {/* User Session Footer */}
      <div className="sidebar-footer">
        <div className="user-card" onClick={logout} title="Click to Logout">
          <div className="user-avatar">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="user-info">
            <div className="name">{user?.full_name || 'Admin User'}</div>
            <div className="role">
              <span className={`role-badge ${user?.role || 'super_admin'}`}>
                {user?.role || 'super_admin'}
              </span>
            </div>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>🚪</span>
        </div>
      </div>
    </aside>
  );
}
