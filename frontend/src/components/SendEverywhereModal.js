import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { X, Send, MessageSquare, Smartphone, Mail, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function SendEverywhereModal({ contact, onClose, onDispatched }) {
  const [selectedChannels, setSelectedChannels] = useState({
    whatsapp: !!(contact?.whatsapp_number || contact?.phone),
    sms: !!contact?.phone,
    email: !!contact?.email,
  });

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [subject, setSubject] = useState(`Special Update for ${contact?.full_name || 'you'}`);
  const [message, setMessage] = useState(
    `Hi {{first_name}},\n\nWe have an exclusive update regarding {{company}}! Contact our team today to learn more.`
  );
  const [dispatching, setDispatching] = useState(false);
  const [results, setResults] = useState(null);
  const [dispatchStep, setDispatchStep] = useState(0);

  useEffect(() => {
    api.get('/templates')
      .then(({ data }) => setTemplates(data.templates || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!dispatching) return undefined;
    const timer = window.setInterval(() => {
      setDispatchStep(step => Math.min(step + 1, 3));
    }, 450);
    return () => window.clearInterval(timer);
  }, [dispatching]);

  const handleTemplateChange = (e) => {
    const tId = e.target.value;
    setSelectedTemplateId(tId);
    if (!tId) return;

    const t = templates.find(item => item.id === tId);
    if (t) {
      if (t.content) setMessage(t.content);
      if (t.subject) setSubject(t.subject);
    }
  };

  const previewMessage = (text) => {
    if (!text) return '';
    return text
      .replace(/{{first_name}}/gi, contact?.full_name?.split(' ')[0] || 'Valued Customer')
      .replace(/{{name}}/gi, contact?.full_name || 'Customer')
      .replace(/{{company}}/gi, contact?.company || 'Your Enterprise');
  };

  const toggleChannel = (ch) => {
    setSelectedChannels(prev => ({ ...prev, [ch]: !prev[ch] }));
  };

  const handleDispatch = async () => {
    const channelsToSend = Object.keys(selectedChannels).filter(k => selectedChannels[k]);
    if (channelsToSend.length === 0) {
      toast.error('Please select at least one channel');
      return;
    }
    if (!message.trim()) {
      toast.error('Message content is required');
      return;
    }

    setDispatching(true);
    setResults(null);
    setDispatchStep(0);

    try {
      const { data } = await api.post(`/contacts/${contact.id}/send-everywhere`, {
        channels: channelsToSend,
        message: previewMessage(message),
        subject,
      });

      setResults({ results: data.results, status: data.status, demo: data.demo });
      if (data.status === 'partial') {
        toast.error('Some channels failed. Review the execution report.');
      } else if (data.success) {
        toast.success('Omnichannel dispatch sent!');
        if (onDispatched) onDispatched();
      } else {
        toast.error('Some or all channels encountered errors.');
      }
    } catch (err) {
      toast.error('Dispatch failed. Check provider credentials.');
      setResults({
        error: err.response?.data?.error || err.message,
      });
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚡</span>
            <span>Send Everywhere — Omnichannel Broadcast</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Simultaneously dispatch a unified message across all selected channels for <strong>{contact.full_name}</strong>.
        </p>

        {/* Channel Selection Checkboxes */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '16px',
        }}>
          <label className="form-label" style={{ marginBottom: '8px' }}>Select Target Channels</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {/* WhatsApp */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              background: selectedChannels.whatsapp ? 'rgba(37, 211, 102, 0.1)' : 'var(--bg-card)',
              border: `1px solid ${selectedChannels.whatsapp ? '#25D366' : 'var(--border)'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}>
              <input
                type="checkbox"
                checked={selectedChannels.whatsapp}
                onChange={() => toggleChannel('whatsapp')}
              />
              <MessageSquare size={14} style={{ color: '#25D366' }} />
              <div>
                <div style={{ fontWeight: '600' }}>WhatsApp</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{contact.whatsapp_number || contact.phone || 'None'}</div>
              </div>
            </label>

            {/* SMS */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              background: selectedChannels.sms ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-card)',
              border: `1px solid ${selectedChannels.sms ? '#F59E0B' : 'var(--border)'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}>
              <input
                type="checkbox"
                checked={selectedChannels.sms}
                onChange={() => toggleChannel('sms')}
              />
              <Smartphone size={14} style={{ color: '#F59E0B' }} />
              <div>
                <div style={{ fontWeight: '600' }}>SMS</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{contact.phone || 'None'}</div>
              </div>
            </label>

            {/* Email */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              background: selectedChannels.email ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card)',
              border: `1px solid ${selectedChannels.email ? '#3B82F6' : 'var(--border)'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}>
              <input
                type="checkbox"
                checked={selectedChannels.email}
                onChange={() => toggleChannel('email')}
              />
              <Mail size={14} style={{ color: '#3B82F6' }} />
              <div>
                <div style={{ fontWeight: '600' }}>Email</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{contact.email || 'None'}</div>
              </div>
            </label>
          </div>
        </div>

        {/* Template Selector */}
        {templates.length > 0 && (
          <div className="form-group">
            <label className="form-label">Message Template (Optional)</label>
            <select className="form-select" value={selectedTemplateId} onChange={handleTemplateChange}>
              <option value="">-- Choose a pre-configured template --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
              ))}
            </select>
          </div>
        )}

        {/* Email Subject if Email Selected */}
        {selectedChannels.email && (
          <div className="form-group">
            <label className="form-label">Email Subject</label>
            <input
              className="form-input"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject line..."
            />
          </div>
        )}

        {/* Message Content */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label className="form-label" style={{ margin: 0 }}>Message Content</label>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Supports variables: &#123;&#123;first_name&#125;&#125;, &#123;&#123;company&#125;&#125;</span>
          </div>
          <textarea
            className="form-textarea"
            rows={5}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message here..."
          />
        </div>

        {/* Live Variable Preview */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '6px',
          padding: '10px 12px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          marginBottom: '16px',
          borderLeft: '3px solid var(--blue)',
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>Personalized Preview:</strong> {previewMessage(message)}
        </div>

        {dispatching && (
          <div className="omnichannel-progress">
            <div className="omnichannel-progress-head">
              <span><RefreshCw size={13} className="spin" /> Secure dispatch pipeline running</span>
              <strong>{dispatchStep >= 3 ? 'Finalizing' : 'Sending'}</strong>
            </div>
            <div className="omnichannel-progress-track"><span style={{ width: `${Math.min(92, 22 + (dispatchStep * 23))}%` }} /></div>
            <div className="omnichannel-progress-channels">
              {[
                ['whatsapp', 'WhatsApp', MessageSquare, '#25D366'],
                ['sms', 'SMS', Smartphone, '#F59E0B'],
                ['email', 'Email', Mail, '#3B82F6'],
              ].filter(([key]) => selectedChannels[key]).map(([key, label, Icon, color], index) => (
                <span key={key} className={dispatchStep > index ? 'complete' : dispatchStep === index ? 'active' : ''}>
                  <Icon size={13} style={{ color }} /> {label} {dispatchStep > index ? '✓' : dispatchStep === index ? '...' : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Execution Results Summary */}
        {results && (
          <div className="omnichannel-results">
            <div className="omnichannel-results-head">
              <div><strong>Dispatch completed</strong><small>One click, {Object.keys(results.results || {}).length} channel receipts generated</small></div>
              {results.demo && <span className="omnichannel-demo-badge">PROTOTYPE RECEIPTS</span>}
            </div>
            <div className="omnichannel-result-list">
              {Object.entries(results.results || results)
                .filter(([, value]) => value && typeof value === 'object')
                .map(([ch, r]) => (
                <div key={ch} className="omnichannel-result-row">
                  <span><strong style={{ textTransform: 'capitalize' }}>{ch}</strong><small>{r.id ? `Receipt ${String(r.id).slice(0, 18)}` : 'No receipt generated'}</small></span>
                  {['queued', 'accepted', 'sent', 'delivered'].includes(r.status) ? (
                    <span className="omnichannel-result-success">
                      <CheckCircle2 size={13} /> {r.status}
                    </span>
                  ) : (
                    <span className="omnichannel-result-failed" title={r.error}>
                      <AlertCircle size={13} /> Failed: {r.error || 'Check config'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>
            {results ? 'Close' : 'Cancel'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDispatch}
            disabled={dispatching || !message.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {dispatching ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
            <span>{dispatching ? 'Dispatching...' : '⚡ Dispatch Everywhere'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
