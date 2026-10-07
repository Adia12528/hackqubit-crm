import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  Users, 
  PhoneCall, 
  MessageSquare, 
  Send, 
  ShieldCheck, 
  LogOut,
  Layers
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Layers size={18} strokeWidth={2.5} />
        </div>
        <div>
          <h1>HackQubit CRM</h1>
          <span>Enterprise Portal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Core Operations</div>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><BarChart3 size={17} /></span>
          <span>Analytics KPI</span>
        </NavLink>

        <NavLink to="/contacts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><Users size={17} /></span>
          <span>Customers & Leads</span>
        </NavLink>

        <div className="nav-section-label">Communications</div>
        <NavLink to="/calls" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><PhoneCall size={17} /></span>
          <span>Voice & Calls</span>
        </NavLink>

        <NavLink to="/whatsapp" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><MessageSquare size={17} /></span>
          <span>WhatsApp Cloud</span>
        </NavLink>

        <NavLink to="/omnichannel" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><Send size={17} /></span>
          <span>Email & SMS Gateway</span>
        </NavLink>

        <div className="nav-section-label">Administration</div>
        <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><ShieldCheck size={17} /></span>
          <span>Role Permissions</span>
        </NavLink>
      </nav>

      {/* User Session Footer */}
      <div className="sidebar-footer">
        <div className="user-card" onClick={logout} title="Sign Out">
          <div className="user-avatar">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="user-info">
            <div className="name">{user?.full_name || 'Admin User'}</div>
            <div className="role">
              <span className={`role-badge ${user?.role || 'super_admin'}`}>
                {user?.role?.replace('_', ' ') || 'Super Admin'}
              </span>
            </div>
          </div>
          <button className="logout-btn" title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
