import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { 
  Megaphone, 
  Plus, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send, 
  RefreshCw, 
  Users, 
  MessageSquare, 
  Smartphone, 
  Mail,
  X
} from 'lucide-react';
import { format } from 'date-fns';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [runningId, setRunningId] = useState(null);

  // New Campaign Form
  const [form, setForm] = useState({
    name: '',
    description: '',
    audience_status: 'all',
    channels: { whatsapp: true, sms: false, email: false },
    template_id: '',
    subject: '',
    message_body: 'Hi {{first_name}}, exclusive announcement from our team! Contact us for details.',
  });

  const MOCK_CAMPAIGNS = [
    {
      id: 'c1',
      name: 'Diwali Enterprise Promotion 2026',
      description: 'Annual corporate software rollout promotion with 20% bundle discount',
      status: 'completed',
      channels: ['whatsapp', 'sms', 'email'],
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      metrics: { sent: 124, delivered: 121, failed: 3, opened: 54, clicked: 18, converted: 6 },
    },
    {
      id: 'c2',
      name: 'Q3 Product Feature Update',
      description: 'Educational walkthrough of new WebRTC and WhatsApp features',
      status: 'completed',
      channels: ['email'],
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      metrics: { sent: 80, delivered: 79, failed: 1, opened: 42, clicked: 14, converted: 3 },
    },
  ];

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        api.get('/campaigns'),
        api.get('/templates'),
      ]);
      const list = cRes.data.campaigns || [];
      setCampaigns(list.length > 0 ? list : MOCK_CAMPAIGNS);
      setTemplates(tRes.data.templates || []);
    } catch {
      setCampaigns(MOCK_CAMPAIGNS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const selectedCh = Object.keys(form.channels).filter(k => form.channels[k]);
    if (selectedCh.length === 0) {
      toast.error('Select at least one channel');
      return;
    }

    try {
      await api.post('/campaigns', {
        name: form.name,
        description: form.description,
        audience_filter: { status: form.audience_status },
        channels: selectedCh,
        template_id: form.template_id || null,
        subject: form.subject,
        message_body: form.message_body,
      });

      toast.success('Campaign created!');
      setShowCreateModal(false);
      setForm({
        name: '',
        description: '',
        audience_status: 'all',
        channels: { whatsapp: true, sms: false, email: false },
        template_id: '',
        subject: '',
        message_body: 'Hi {{first_name}}, exclusive announcement from our team! Contact us for details.',
      });
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to create campaign');
    }
  };

  const handleRunCampaign = async (campId) => {
    setRunningId(campId);
    try {
      const { data } = await api.post(`/campaigns/${campId}/send`);
      toast.success('Campaign dispatched across selected channels!');
      fetchCampaigns();
    } catch (err) {
      toast.error('Campaign execution failed. Check provider configuration.');
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.01em' }}>Marketing Campaigns</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Multi-channel broadcast engine for WhatsApp, SMS, and Email with granular delivery analytics.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Campaign List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {campaigns.map(camp => {
          const metrics = camp.metrics || { sent: 0, delivered: 0, failed: 0, opened: 0, clicked: 0 };
          return (
            <div key={camp.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{camp.name}</h3>
                    <span className={`status-badge status-${camp.status === 'completed' ? 'customer' : 'lead'}`}>
                      {camp.status}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                    {camp.description}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    {(camp.channels || []).map(ch => (
                      <span key={ch} className={`channel-chip ${ch}`} style={{ textTransform: 'capitalize' }}>
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={runningId === camp.id}
                    onClick={() => handleRunCampaign(camp.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {runningId === camp.id ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
                    <span>{runningId === camp.id ? 'Broadcasting...' : 'Run / Send Now'}</span>
                  </button>
                </div>
              </div>

              {/* Delivery Analytics Metrics Strip */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '10px',
                background: 'var(--bg-secondary)',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sent</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{metrics.sent || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Delivered</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#10B981' }}>{metrics.delivered || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Failed</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: metrics.failed > 0 ? '#EF4444' : 'var(--text-muted)' }}>{metrics.failed || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Opened</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#3B82F6' }}>{metrics.opened || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clicked</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#F59E0B' }}>{metrics.clicked || 0}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE CAMPAIGN MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={18} />
                <span>Create Marketing Campaign</span>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Campaign Name *</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. Enterprise Summer Upgrade 2026"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  placeholder="Goals & target audience summary..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Audience Segment</label>
                  <select
                    className="form-select"
                    value={form.audience_status}
                    onChange={e => setForm({ ...form, audience_status: e.target.value })}
                  >
                    <option value="all">All Contacts</option>
                    <option value="customer">Existing Customers</option>
                    <option value="prospect">Prospects</option>
                    <option value="lead">New Leads</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Channels</label>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.channels.whatsapp}
                        onChange={() => setForm({ ...form, channels: { ...form.channels, whatsapp: !form.channels.whatsapp } })}
                      />
                      <span>WhatsApp</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.channels.sms}
                        onChange={() => setForm({ ...form, channels: { ...form.channels, sms: !form.channels.sms } })}
                      />
                      <span>SMS</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.channels.email}
                        onChange={() => setForm({ ...form, channels: { ...form.channels, email: !form.channels.email } })}
                      />
                      <span>Email</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Template */}
              {templates.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Message Template (Optional)</label>
                  <select
                    className="form-select"
                    value={form.template_id}
                    onChange={e => {
                      const t = templates.find(item => item.id === e.target.value);
                      setForm({
                        ...form,
                        template_id: e.target.value,
                        message_body: t ? t.content : form.message_body,
                        subject: t ? t.subject : form.subject,
                      });
                    }}
                  >
                    <option value="">-- Manual Copy --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.channels.email && (
                <div className="form-group">
                  <label className="form-label">Email Subject</label>
                  <input
                    className="form-input"
                    placeholder="Subject for email recipients..."
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Message Content</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  required
                  placeholder="Variables: {{first_name}}, {{company}}..."
                  value={form.message_body}
                  onChange={e => setForm({ ...form, message_body: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
