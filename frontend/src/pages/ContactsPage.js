import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  Phone, 
  MessageSquare, 
  Mail, 
  Building, 
  Clock, 
  ChevronRight, 
  X,
  Briefcase
} from 'lucide-react';
import Contact360Profile from '../components/Contact360Profile';

// ========== Contact Creation / Edit Modal ==========
function ContactFormModal({ contact, onClose, onSaved }) {
  const [form, setForm] = useState(contact || { status: 'lead', source: 'manual', tags: [] });
  const [tagsInput, setTagsInput] = useState((contact?.tags || []).join(', '));
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (contact?.id) {
        await api.put(`/contacts/${contact.id}`, payload);
      } else {
        await api.post('/contacts', payload);
      }
      toast.success(contact?.id ? 'Customer updated!' : 'Customer profile created!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const f = (field) => ({
    value: form[field] || '',
    onChange: e => setForm(p => ({ ...p, [field]: e.target.value })),
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div className="modal-title">
            {contact?.id ? 'Edit Customer Profile' : '➕ Create New Customer Profile'}
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSave}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" required placeholder="e.g. Rahul Kumar" {...f('full_name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input className="form-input" placeholder="e.g. Acme Corp" {...f('company')} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="rahul@enterprise.com" {...f('email')} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone (Voice/SMS)</label>
              <input className="form-input" placeholder="+91 98765 43210" {...f('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp Number</label>
              <input className="form-input" placeholder="+91 98765 43210" {...f('whatsapp_number')} />
            </div>
            <div className="form-group">
              <label className="form-label">Job Title</label>
              <input className="form-input" placeholder="e.g. Procurement VP" {...f('job_title')} />
            </div>
            <div className="form-group">
              <label className="form-label">Customer Lifecycle Status</label>
              <select className="form-select" {...f('status')}>
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="customer">Customer</option>
                <option value="churned">Churned</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Inbound Acquisition Source</label>
              <select className="form-select" {...f('source')}>
                <option value="manual">Manual Entry</option>
                <option value="whatsapp">WhatsApp Inbound</option>
                <option value="email">Email Outreach</option>
                <option value="call">Phone Call</option>
                <option value="web">Website Form</option>
                <option value="import">Bulk Import</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Tags (comma-separated)</label>
              <input
                className="form-input"
                placeholder="vip, enterprise, retail, priority"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== MAIN CUSTOMERS & CONTACTS PAGE ==========
export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { can } = useAuth();

  const MOCK_CONTACTS = [
    { id: '1', full_name: 'Rahul Kumar', email: 'rahul@enterprise.com', phone: '+919876543210', whatsapp_number: '+919876543210', company: 'Acme Pvt Ltd', job_title: 'VP Operations', status: 'customer', source: 'whatsapp', total_deal_value: 250000, call_count: 5, whatsapp_count: 18, email_count: 4 },
    { id: '2', full_name: 'Priya Sharma', email: 'priya@startup.io', phone: '+919123456789', whatsapp_number: '+919123456789', company: 'InnoTech Labs', job_title: 'Founder & CEO', status: 'prospect', source: 'email', total_deal_value: 120000, call_count: 3, whatsapp_count: 7, email_count: 8 },
    { id: '3', full_name: 'Amit Singh', email: 'amit@logistics.in', phone: '+918765432109', whatsapp_number: '+918765432109', company: 'Freight Express', job_title: 'IT Director', status: 'lead', source: 'call', total_deal_value: 80000, call_count: 2, whatsapp_count: 1, email_count: 2 },
    { id: '4', full_name: 'Sonal Verma', email: 'sonal@fintech.co', phone: '+917654321098', whatsapp_number: '+917654321098', company: 'PayFast Digital', job_title: 'Head of Sales', status: 'customer', source: 'web', total_deal_value: 450000, call_count: 9, whatsapp_count: 34, email_count: 12 },
  ];

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/contacts', {
        params: { search, status: statusFilter },
      });
      const list = data.contacts || [];
      setContacts(list.length > 0 ? list : MOCK_CONTACTS);
      if (!selectedId && (list.length > 0 || MOCK_CONTACTS.length > 0)) {
        setSelectedId((list[0] || MOCK_CONTACTS[0]).id);
      }
    } catch {
      setContacts(MOCK_CONTACTS);
      if (!selectedId && MOCK_CONTACTS.length > 0) {
        setSelectedId(MOCK_CONTACTS[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search, statusFilter]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '380px 1fr',
      gap: '16px',
      height: 'calc(100vh - 100px)',
      overflow: 'hidden',
    }}>
      {/* LEFT: CUSTOMER DIRECTORY & SEARCH */}
      <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Search & Actions Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '15px' }}>
              <Users size={18} style={{ color: 'var(--blue)' }} />
              <span>Customers (360°)</span>
            </div>
            {can('agent') && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                <Plus size={14} /> New
              </button>
            )}
          </div>

          {/* Omnichannel Search Input */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '30px', fontSize: '13px' }}
              placeholder="Search by name, phone, email, tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Lifecycle Filter */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['', 'lead', 'prospect', 'customer'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={() => setStatusFilter(s)}
              >
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Directory List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" /></div>
          ) : contacts.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-icon">🔍</div>
              <h3>No matching customers</h3>
              <p>Try searching with another term.</p>
            </div>
          ) : (
            contacts.map(c => {
              const isSelected = selectedId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--blue)' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: isSelected ? 'var(--blue)' : 'var(--text-primary)' }}>
                      {c.full_name}
                    </div>
                    <span className={`status-badge status-${c.status}`} style={{ fontSize: '10px' }}>
                      {c.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Building size={12} />
                    <span>{c.company || 'Private Customer'}</span>
                    {c.job_title && <span>• {c.job_title}</span>}
                  </div>

                  {/* Channel Quick Indicators */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {c.whatsapp_number && <span style={{ color: '#25D366' }} title="WhatsApp Ready">💬</span>}
                      {c.phone && <span style={{ color: '#10B981' }} title="Phone Ready">📞</span>}
                      {c.email && <span style={{ color: '#3B82F6' }} title="Email Ready">✉️</span>}
                    </div>
                    <div>
                      {c.total_deal_value > 0 ? (
                        <span style={{ color: '#10B981', fontWeight: '600' }}>₹{c.total_deal_value}</span>
                      ) : (
                        <span>{(c.call_count || 0) + (c.whatsapp_count || 0)} touchpoints</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: COMPLETE 360° CUSTOMER PROFILE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedId ? (
          <Contact360Profile
            contactId={selectedId}
            onUpdateContact={fetchContacts}
          />
        ) : (
          <div className="empty-state" style={{ margin: 'auto' }}>
            <div className="empty-icon">👤</div>
            <h3>Select a Customer</h3>
            <p>Choose any contact on the left to inspect their 360° profile.</p>
          </div>
        )}
      </div>

      {/* CREATE CUSTOMER MODAL */}
      {showCreateModal && (
        <ContactFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={fetchContacts}
        />
      )}
    </div>
  );
}
