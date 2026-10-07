import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { ShieldCheck, UserPlus } from 'lucide-react';

export default function UsersPage() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'agent', phone: '' });

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/auth/users');
      setUsersList(data.users);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const roleTiers = [
    { level: 1, role: 'super_admin', label: 'Tier 1: Super Admin', desc: 'Unrestricted system access, Docker host controls & DB operations' },
    { level: 2, role: 'admin', label: 'Tier 2: Admin', desc: 'Org management, user provisioning, global integrations' },
    { level: 3, role: 'manager', label: 'Tier 3: Manager', desc: 'Team pipeline supervision, call audit playback, bulk exports' },
    { level: 4, role: 'agent', label: 'Tier 4: Agent', desc: 'Assigned contacts only, dialer calling, WhatsApp & SMS dispatch' },
    { level: 5, role: 'viewer', label: 'Tier 5: Viewer', desc: 'Read-only metrics, audits & timelines (No dispatch/delete)' },
  ];

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      toast.error('Name, email, and password are required');
      return;
    }

    const levelMap = { super_admin: 1, admin: 2, manager: 3, agent: 4, viewer: 5 };
    try {
      await api.post('/auth/register', {
        full_name: newUser.full_name,
        email: newUser.email,
        password: newUser.password,
        phone: newUser.phone,
        role_id: levelMap[newUser.role] || 4,
      });
      toast.success(`User ${newUser.full_name} created under ${newUser.role}`);
      setShowAddModal(false);
      setNewUser({ full_name: '', email: '', password: '', role: 'agent', phone: '' });
      await loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to create user');
    }
  };

  return (
    <div>
      {/* 5-Tier RBAC Architecture Showcase Banner */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={22} style={{ color: 'var(--blue)' }} />
              <h2 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.01em' }}>Granular 5-Tier RBAC Policy Engine</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px', maxWidth: '750px' }}>
              Enforced at database layer and API middleware via JWT role hierarchies. Lower numeric level grants strictly superior privilege.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserPlus size={15} />
            <span>Provision User</span>
          </button>
        </div>

        {/* Tier Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '20px' }}>
          {roleTiers.map(t => (
            <div
              key={t.level}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '14px',
                borderTop: `3px solid ${
                  t.level === 1 ? '#EF4444' :
                  t.level === 2 ? '#8B5CF6' :
                  t.level === 3 ? '#3B82F6' :
                  t.level === 4 ? '#10B981' : '#64748B'
                }`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`role-badge ${t.role}`}>{t.role}</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>L{t.level}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
                {t.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title">Authorized Personnel Directory</div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Current Session: <strong>{user?.role_name || user?.role}</strong></span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Assigned Role</th>
                <th>Access Level</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Policy Rule</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6">Loading users...</td></tr>
              ) : usersList.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 'bold', fontSize: '13px'
                      }}>
                        {u.full_name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600' }}>{u.full_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${u.role}`}>{u.role.replace('_', ' ')}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                    Level {u.level}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {u.phone}
                  </td>
                  <td>
                    <span className="status-badge status-customer">Active</span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {u.level <= 2 ? 'Full Admin Gate' : u.level === 3 ? 'Team Scope Gate' : u.level === 4 ? 'Agent Scope Gate' : 'Strict Read-Only'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Provision New Organization Member</div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" required value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="John Doe" />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="john@enterprise.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Temporary Password</label>
                <input className="form-input" type="password" required minLength="8" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="At least 8 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} placeholder="+91 99999 88888" />
              </div>
              <div className="form-group">
                <label className="form-label">Assign 5-Tier Role</label>
                <select className="form-select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="viewer">Tier 5: Viewer (Read-only)</option>
                  <option value="agent">Tier 4: Agent (Calls, WhatsApp & CRM)</option>
                  <option value="manager">Tier 3: Manager (Team Audit & Call Playback)</option>
                  <option value="admin">Tier 2: Admin (Full CRM Management)</option>
                  <option value="super_admin">Tier 1: Super Admin (System & Docker Controls)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
