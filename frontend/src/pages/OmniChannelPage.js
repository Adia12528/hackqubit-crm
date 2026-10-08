import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import { Mail, Smartphone, Send, PhoneCall, MessageSquare, CheckCircle2 } from 'lucide-react';

export default function OmniChannelPage() {
  const [activeTab, setActiveTab] = useState('email');
  const [emailForm, setEmailForm] = useState({ to: 'arjun@techcorp.in', subject: 'Product Demo & Proposal Follow-up', body: 'Dear Arjun,\n\nFollowing our call today, please find attached the SLA specification and pricing model for the self-hosted CRM setup.\n\nBest regards,\nHackQubit CRM Team' });
  const [smsForm, setSmsForm] = useState({ to: '+919876543210', content: 'HackQubit CRM: Your verification code for portal access is 849201. Valid for 10 minutes.' });
  const [sending, setSending] = useState(false);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await api.post('/emails/send', {
        to_address: emailForm.to,
        subject: emailForm.subject,
        body: emailForm.body
      });
      if (data.status === 'sent' || data.status === 'queued' || data.status === 'delivered') {
        toast.success('Email sent successfully via SMTP');
      } else {
        toast.error(data.error || 'Email was not sent');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Email could not be sent. Check SMTP settings.');
    } finally {
      setSending(false);
    }
  };

  const handleSendSms = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/sms/send', {
        phone_number: smsForm.to,
        content: smsForm.content
      });
      toast.success('SMS dispatched via Twilio Gateway');
    } catch (err) {
      toast.error(err.response?.data?.error || 'SMS could not be sent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.01em' }}>Omnichannel Dispatch Gateway</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Direct asynchronous gateway for Email (SMTP/IMAP) & SMS (Twilio/Kannel) linked to customer histories.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          className={`btn ${activeTab === 'email' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('email')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Mail size={15} />
          <span>Email Dispatcher (SMTP)</span>
        </button>
        <button
          className={`btn ${activeTab === 'sms' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('sms')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Smartphone size={15} />
          <span>SMS Gateway (Twilio)</span>
        </button>
      </div>

      {/* Content */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {activeTab === 'email' ? 'Compose Outbound Email' : 'Trigger Outbound SMS'}
            </div>
            <span className={`channel-chip ${activeTab}`}>
              {activeTab === 'email' ? 'Nodemailer Transport' : 'Twilio REST API'}
            </span>
          </div>

          {activeTab === 'email' ? (
            <form onSubmit={handleSendEmail}>
              <div className="form-group">
                <label className="form-label">Recipient Email</label>
                <input
                  className="form-input"
                  required
                  type="email"
                  value={emailForm.to}
                  onChange={e => setEmailForm({ ...emailForm, to: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Subject Line</label>
                <input
                  className="form-input"
                  required
                  value={emailForm.subject}
                  onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Body (Markdown / Plain Text)</label>
                <textarea
                  className="form-textarea"
                  rows={6}
                  required
                  value={emailForm.body}
                  onChange={e => setEmailForm({ ...emailForm, body: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Send size={14} />
                <span>{sending ? 'Sending...' : 'Send Outbound Email'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSendSms}>
              <div className="form-group">
                <label className="form-label">Recipient Phone (E.164 Format)</label>
                <input
                  className="form-input"
                  required
                  value={smsForm.to}
                  onChange={e => setSmsForm({ ...smsForm, to: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">SMS Message (160 char limits apply)</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  required
                  value={smsForm.content}
                  onChange={e => setSmsForm({ ...smsForm, content: e.target.value })}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                  {smsForm.content.length} characters • {Math.ceil(smsForm.content.length / 160)} segment(s)
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Send size={14} />
                <span>{sending ? 'Sending...' : 'Dispatch Twilio SMS'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Live Status and Webhook Monitor */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Omnichannel Integration Status</div>
            <span className="status-badge status-customer">Online</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '13px' }}>
                  <PhoneCall size={14} style={{ color: '#10B981' }} />
                  <span>Voice (WebRTC & SIP)</span>
                </div>
                <span style={{ color: '#10B981', fontSize: '12px', fontWeight: '500' }}>STUN/TURN Ready</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Direct browser media streaming + automated MinIO object archiving on hangup.
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '13px' }}>
                  <MessageSquare size={14} style={{ color: '#25D366' }} />
                  <span>WhatsApp Cloud API</span>
                </div>
                <span style={{ color: '#25D366', fontSize: '12px', fontWeight: '500' }}>Webhook Active</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Inbound endpoint: <code>/api/whatsapp/webhook</code> with SHA-256 verification.
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '13px' }}>
                  <Mail size={14} style={{ color: '#3B82F6' }} />
                  <span>SMTP / IMAP Mailer</span>
                </div>
                <span style={{ color: '#3B82F6', fontSize: '12px', fontWeight: '500' }}>TLS Configured</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Full MIME parsing, attachments saved to MinIO bucket <code>attachments</code>.
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '13px' }}>
                  <Smartphone size={14} style={{ color: '#F59E0B' }} />
                  <span>SMS Webhook Bridge</span>
                </div>
                <span style={{ color: '#F59E0B', fontSize: '12px', fontWeight: '500' }}>2-Way Enabled</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Twilio TwiML parser captures incoming text replies back onto timeline view.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
