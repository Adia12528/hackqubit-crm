import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

// ========== Unified Timeline Item ==========
function TimelineItem({ item }) {
  const CHANNEL_CONFIG = {
    call: { icon: '📞', label: 'Call', className: 'call' },
    whatsapp: { icon: '💬', label: 'WhatsApp', className: 'whatsapp' },
    email: { icon: '📧', label: 'Email', className: 'email' },
    sms: { icon: '💬', label: 'SMS', className: 'sms' },
  };

  const cfg = CHANNEL_CONFIG[item.channel] || { icon: '📌', label: item.channel, className: 'call' };
  const data = item.data || {};

  const renderBody = () => {
    switch (item.channel) {
      case 'call':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`status-badge status-${data.status || 'completed'}`}>{data.status}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {data.direction === 'inbound' ? '⬇️ Inbound' : '⬆️ Outbound'}
            </span>
            {data.duration > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                ⏱ {Math.floor(data.duration / 60)}m {data.duration % 60}s
              </span>
            )}
            {data.recording_url && (
              <button className="btn btn-ghost btn-sm" onClick={() => {/* play recording */}}>
                ▶️ Play
              </button>
            )}
          </div>
        );
      case 'whatsapp':
      case 'sms':
        return <div className="timeline-body">{data.content?.substring(0, 120)}{data.content?.length > 120 ? '...' : ''}</div>;
      case 'email':
        return <div className="timeline-body">📧 {data.subject}</div>;
      default:
        return null;
    }
  };

  return (
    <div className="timeline-item">
      <div className={`timeline-dot ${cfg.className}`}>{cfg.icon}</div>
      <div className="timeline-content">
        <div className="timeline-header">
          <span className={`channel-chip ${cfg.className}`}>{cfg.label}</span>
          <span className="timeline-time">
            {item.occurred_at ? formatDistanceToNow(new Date(item.occurred_at), { addSuffix: true }) : ''}
          </span>
        </div>
        {renderBody()}
      </div>
    </div>
  );
}

// ========== Send Message Modal ==========
function SendModal({ contact, channel, onClose, onSent }) {
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const phoneNumber = contact.whatsapp_number || contact.phone;
      if (channel === 'whatsapp') {
        await api.post('/whatsapp/send', { contact_id: contact.id, phone_number: phoneNumber, message: content });
      } else if (channel === 'email') {
        await api.post('/emails/send', { contact_id: contact.id, to_address: contact.email, subject, body: content });
      } else if (channel === 'sms') {
        await api.post('/sms/send', { contact_id: contact.id, phone_number: phoneNumber, content });
      }
      toast.success(`${channel} sent!`);
      onSent();
      onClose();
    } catch (err) {
      toast.error('Failed to send. Check API config.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            {channel === 'whatsapp' && '💬'} {channel === 'email' && '📧'} {channel === 'sms' && '📱'}
            {' '}Send via {channel.charAt(0).toUpperCase() + channel.slice(1)}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          To: <strong>{contact.full_name}</strong> ({channel === 'email' ? contact.email : contact.phone})
        </p>

        {channel === 'email' && (
          <div className="form-group">
            <label className="form-label">Subject</label>
            <input className="form-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Message</label>
          <textarea
            className="form-textarea"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`Type your ${channel} message...`}
            rows={4}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSend} disabled={sending || !content.trim()}>
            {sending ? '📤 Sending...' : '📤 Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== Contact Form Modal ==========
function ContactFormModal({ contact, onClose, onSaved }) {
  const [form, setForm] = useState(contact || { status: 'lead', source: 'manual' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (contact?.id) {
        await api.put(`/contacts/${contact.id}`, form);
      } else {
        await api.post('/contacts', form);
      }
      toast.success(contact?.id ? 'Contact updated!' : 'Contact created!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const f = (field) => ({ value: form[field] || '', onChange: e => setForm(p => ({ ...p, [field]: e.target.value })) });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div className="modal-title">{contact?.id ? 'Edit Contact' : '➕ New Contact'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="grid-2">
          <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" {...f('full_name')} placeholder="John Doe" /></div>
          <div className="form-group"><label className="form-label">Company</label><input className="form-input" {...f('company')} placeholder="Acme Corp" /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" {...f('email')} placeholder="john@acme.com" /></div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-input" {...f('phone')} placeholder="+91 98765 43210" /></div>
          <div className="form-group"><label className="form-label">WhatsApp Number</label><input className="form-input" {...f('whatsapp_number')} placeholder="+91 98765 43210" /></div>
          <div className="form-group"><label className="form-label">Job Title</label><input className="form-input" {...f('job_title')} placeholder="CEO" /></div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" {...f('status')}>
              {['lead', 'prospect', 'customer', 'churned', 'inactive'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Source</label>
            <select className="form-select" {...f('source')}>
              {['manual', 'whatsapp', 'email', 'call', 'web', 'import'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.full_name}>
            {saving ? '💾 Saving...' : '💾 Save Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== Contact Detail Panel ==========
function ContactDetail({ contactId, onClose }) {
  const [data, setData] = useState(null);
  const [sendModal, setSendModal] = useState(null);

  useEffect(() => {
    if (!contactId) return;
    api.get(`/contacts/${contactId}`)
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Failed to load contact'));
  }, [contactId]);

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <div className="spinner" />
    </div>
  );

  const { contact, timeline = [], deals = [] } = data;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: '800', color: 'white',
          }}>
            {contact.full_name?.charAt(0)}
          </div>
          <div>
            <h3 style={{ fontWeight: '700', fontSize: '16px' }}>{contact.full_name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{contact.job_title} {contact.company && `@ ${contact.company}`}</p>
          </div>
          <span className={`status-badge status-${contact.status}`} style={{ marginLeft: 'auto' }}>{contact.status}</span>
        </div>

        {/* Contact Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '14px' }}>
          {contact.email && <div style={{ color: 'var(--text-secondary)' }}>📧 {contact.email}</div>}
          {contact.phone && <div style={{ color: 'var(--text-secondary)' }}>📞 {contact.phone}</div>}
          {contact.whatsapp_number && <div style={{ color: 'var(--text-secondary)' }}>💬 {contact.whatsapp_number}</div>}
          {contact.city && <div style={{ color: 'var(--text-secondary)' }}>📍 {contact.city}, {contact.country}</div>}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button className="btn btn-sm" style={{ background: '#10B981', color: 'white' }} onClick={() => toast.success('WebRTC call initiating...')}>
            📞 Call
          </button>
          {contact.whatsapp_number && (
            <button className="btn btn-sm" style={{ background: '#25D366', color: 'white' }} onClick={() => setSendModal('whatsapp')}>
              💬 WhatsApp
            </button>
          )}
          {contact.email && (
            <button className="btn btn-sm" style={{ background: '#3B82F6', color: 'white' }} onClick={() => setSendModal('email')}>
              📧 Email
            </button>
          )}
          {contact.phone && (
            <button className="btn btn-sm" style={{ background: '#F59E0B', color: 'white' }} onClick={() => setSendModal('sms')}>
              📱 SMS
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
          Activity Timeline ({timeline.length})
        </div>

        {timeline.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No activity yet</h3>
            <p>Start by calling or sending a message</p>
          </div>
        ) : (
          <div className="timeline">
            {timeline.map(item => <TimelineItem key={item.id} item={item} />)}
          </div>
        )}
      </div>

      {sendModal && (
        <SendModal
          contact={contact}
          channel={sendModal}
          onClose={() => setSendModal(null)}
          onSent={() => api.get(`/contacts/${contactId}`).then(({ data }) => setData(data))}
        />
      )}
    </div>
  );
}

// ========== Main Contacts Page ==========
export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { can } = useAuth();

  // Mock data fallback
  const MOCK_CONTACTS = [
    { id: '1', full_name: 'Arjun Sharma', email: 'arjun@techcorp.in', phone: '+919876543210', whatsapp_number: '+919876543210', company: 'TechCorp India', status: 'customer', source: 'whatsapp', call_count: 8, whatsapp_count: 23 },
    { id: '2', full_name: 'Priya Patel', email: 'priya@startup.io', phone: '+919123456789', whatsapp_number: '+919123456789', company: 'Startup IO', status: 'prospect', source: 'call', call_count: 3, whatsapp_count: 7 },
    { id: '3', full_name: 'Rahul Gupta', email: 'rahul@enterprise.com', phone: '+918765432109', company: 'Enterprise Ltd', status: 'lead', source: 'email', call_count: 1, whatsapp_count: 0 },
    { id: '4', full_name: 'Sneha Iyer', email: 'sneha@business.in', phone: '+917654321098', whatsapp_number: '+917654321098', company: 'Business Inc', status: 'customer', source: 'manual', call_count: 12, whatsapp_count: 45 },
  ];

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = { search, status: statusFilter };
      const { data } = await api.get('/contacts', { params });
      setContacts(data.contacts);
    } catch {
      setContacts(MOCK_CONTACTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, [search, statusFilter]);

  const filtered = contacts.filter(c =>
    (!search || c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     c.email?.toLowerCase().includes(search.toLowerCase()) ||
     c.phone?.includes(search))
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 380px' : '1fr', gap: '20px', height: '100%' }}>
      {/* Left: Contact List */}
      <div>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ maxWidth: '280px' }}
            placeholder="🔍 Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="form-select" style={{ maxWidth: '140px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {['lead', 'prospect', 'customer', 'churned'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          {can('agent') && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              ➕ New Contact
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Company</th>
                  <th>Channels</th>
                  <th>Activity</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                    style={{ background: selectedId === c.id ? 'var(--bg-hover)' : '' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: '700', color: 'white', flexShrink: 0,
                        }}>{c.full_name?.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '13.5px' }}>{c.full_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`status-badge status-${c.status}`}>{c.status}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{c.company || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {c.phone && <span title="Phone">📞</span>}
                        {c.whatsapp_number && <span title="WhatsApp">💬</span>}
                        {c.email && <span title="Email">📧</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {c.call_count || 0} calls • {c.whatsapp_count || 0} msgs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right: Contact Detail */}
      {selectedId && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: 0, maxHeight: 'calc(100vh - 108px)' }}>
          <ContactDetail contactId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <ContactFormModal
          onClose={() => setShowForm(false)}
          onSaved={fetchContacts}
        />
      )}
    </div>
  );
}
