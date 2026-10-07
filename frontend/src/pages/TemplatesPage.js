import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { FileText, Plus, X, Tag } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    name: '',
    category: 'sales',
    channel: 'all',
    subject: '',
    content: '',
  });

  const MOCK_TEMPLATES = [
    {
      id: 't1',
      name: 'Enterprise 20% Discount Offer',
      category: 'promotional',
      channel: 'all',
      subject: 'Exclusive Enterprise Offer for {{company}}',
      content: 'Hi {{first_name}}, We are pleased to offer {{company}} an exclusive 20% discount on our Enterprise CRM Plan. Valid until {{expiry_date}}!',
      variables: ['first_name', 'company', 'expiry_date'],
    },
    {
      id: 't2',
      name: 'Post-Call Demo Summary & Quotation',
      category: 'sales',
      channel: 'email',
      subject: 'Follow-up regarding our discussion today, {{first_name}}',
      content: 'Dear {{first_name}},\n\nThank you for taking the time to speak today regarding {{company}}. Below is our tailored proposal and architectural specification.\n\nBest regards,\nHackQubit CRM Team',
      variables: ['first_name', 'company'],
    },
    {
      id: 't3',
      name: 'Quick SMS Meeting Reminder',
      category: 'notifications',
      channel: 'sms',
      subject: '',
      content: 'Hi {{first_name}}, this is a quick reminder for our CRM demonstration scheduled for today at 3:00 PM.',
      variables: ['first_name'],
    },
  ];

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/templates');
      const list = data.templates || [];
      setTemplates(list.length > 0 ? list : MOCK_TEMPLATES);
    } catch {
      setTemplates(MOCK_TEMPLATES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/templates', form);
      toast.success('Template created!');
      setShowCreateModal(false);
      setForm({ name: '', category: 'sales', channel: 'all', subject: '', content: '' });
      fetchTemplates();
    } catch {
      toast.error('Failed to create template');
    }
  };

  const insertVariable = (varName) => {
    setForm(p => ({ ...p, content: p.content + ` {{${varName}}}` }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.01em' }}>Message Templates</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Multi-channel message templates with dynamic customer variable replacement.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} />
          <span>New Template</span>
        </button>
      </div>

      <div className="grid-2">
        {templates.map(t => (
          <div key={t.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '700' }}>{t.name}</h3>
                <span className="channel-chip" style={{ textTransform: 'capitalize', marginTop: '4px' }}>
                  {t.channel} • {t.category}
                </span>
              </div>
            </div>

            {t.subject && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <strong>Subject:</strong> {t.subject}
              </div>
            )}

            <div style={{
              background: 'var(--bg-secondary)',
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '12.5px',
              color: 'var(--text-primary)',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              marginBottom: '12px',
            }}>
              {t.content}
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(t.variables || ['first_name', 'company']).map(v => (
                <span key={v} style={{
                  fontSize: '11px', background: 'var(--bg-hover)', color: 'var(--blue)',
                  padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)'
                }}>
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} />
                <span>Create Message Template</span>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Template Name *</label>
                <input className="form-input" required placeholder="e.g. Enterprise Welcome Offer" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="sales">Sales</option>
                    <option value="promotional">Promotional</option>
                    <option value="notifications">Notification</option>
                    <option value="support">Customer Support</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Channel Target</label>
                  <select className="form-select" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
                    <option value="all">Omnichannel (All)</option>
                    <option value="whatsapp">WhatsApp Only</option>
                    <option value="sms">SMS Only</option>
                    <option value="email">Email Only</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Subject (Optional)</label>
                <input className="form-input" placeholder="Subject line for email dispatches..." value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Message Template Body *</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['first_name', 'company', 'discount', 'expiry_date'].map(v => (
                      <button
                        type="button"
                        key={v}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '10px', padding: '2px 6px' }}
                        onClick={() => insertVariable(v)}
                      >
                        + {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea className="form-textarea" required rows={5} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Type message with variable placeholders..." />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
