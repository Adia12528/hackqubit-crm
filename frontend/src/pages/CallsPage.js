import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Play, 
  Plus, 
  Clock 
} from 'lucide-react';

// ========== WebRTC Call Widget ==========
function CallWidget({ contact, onEnd }) {
  const [status, setStatus] = useState('connecting'); // connecting | active | ended
  const [muted, setMuted] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Simulate connection (in production: use WebRTC PeerConnection)
    const t = setTimeout(() => {
      setStatus('active');
      timerRef.current = setInterval(() => setTimer(s => s + 1), 1000);
    }, 1500);
    return () => { clearTimeout(t); clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleEnd = async () => {
    clearInterval(timerRef.current);
    setStatus('ended');
    
    // Log call to backend
    try {
      await api.post('/calls/log', {
        contact_id: contact.id,
        direction: 'outbound',
        phone_number: contact.phone,
        duration_seconds: timer,
        notes,
        call_status: 'completed',
      });
      toast.success('Call session saved');
    } catch { toast.error('Failed to save call'); }
    
    setTimeout(() => onEnd(), 1000);
  };

  return (
    <div className={`call-widget ${status}`}>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {status === 'connecting' ? 'Establishing Line...' : status === 'active' ? 'Voice Channel Connected' : 'Call Terminated'}
        </div>
        <div style={{ fontSize: '15px', fontWeight: '700', marginTop: '4px' }}>{contact.full_name}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{contact.phone}</div>
      </div>

      {status === 'active' && (
        <div className="call-timer">{formatTime(timer)}</div>
      )}

      {status === 'active' && (
        <textarea
          className="form-textarea"
          placeholder="Session notes..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ marginBottom: '12px', fontSize: '12px', minHeight: '60px' }}
        />
      )}

      <div className="call-actions">
        <button className={`call-btn mute`} onClick={() => setMuted(!muted)} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        {status === 'active' && (
          <button className="call-btn end" onClick={handleEnd} title="End call">
            <PhoneOff size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ========== Call History Table ==========
export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);
  const [callContact, setCallContact] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [showNewCall, setShowNewCall] = useState(false);
  const [selectedContact, setSelectedContact] = useState('');

  const MOCK_CALLS = [
    { id: '1', contact_name: 'Arjun Sharma', direction: 'outbound', call_status: 'completed', duration_seconds: 342, phone_number: '+919876543210', started_at: new Date(Date.now() - 3600000).toISOString(), notes: 'Discussed Q4 contract renewal', recording_url: 'recording1.webm' },
    { id: '2', contact_name: 'Priya Patel', direction: 'inbound', call_status: 'completed', duration_seconds: 187, phone_number: '+919123456789', started_at: new Date(Date.now() - 7200000).toISOString(), notes: 'Support query about billing' },
    { id: '3', contact_name: 'Unknown', direction: 'inbound', call_status: 'missed', duration_seconds: 0, phone_number: '+918887776665', started_at: new Date(Date.now() - 10800000).toISOString() },
    { id: '4', contact_name: 'Sneha Iyer', direction: 'outbound', call_status: 'completed', duration_seconds: 623, phone_number: '+917654321098', started_at: new Date(Date.now() - 86400000).toISOString(), notes: 'Onboarding call - went well' },
  ];

  useEffect(() => {
    api.get('/calls').then(({ data }) => setCalls(data.calls)).catch(() => setCalls(MOCK_CALLS)).finally(() => setLoading(false));
    api.get('/contacts').then(({ data }) => setContacts(data.contacts)).catch(() => {});
  }, []);

  const handleInitCall = () => {
    const contact = contacts.find(c => c.id === selectedContact) || { id: selectedContact, full_name: 'Contact', phone: 'Unknown' };
    setCallContact(contact);
    setActiveCall(true);
    setShowNewCall(false);
  };

  const getRecordingUrl = async (callId) => {
    try {
      const { data } = await api.get(`/calls/${callId}/recording`);
      window.open(data.url, '_blank');
    } catch { toast.error('Recording not available'); }
  };

  const formatDuration = (s) => {
    if (!s) return '—';
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div>
      {/* Stats Bar */}
      <div className="kpi-grid" style={{ marginBottom: '20px' }}>
        {[
          { icon: Phone, label: 'Total Calls', value: calls.length, color: '#10B981' },
          { icon: PhoneOutgoing, label: 'Outbound', value: calls.filter(c => c.direction === 'outbound').length, color: '#3B82F6' },
          { icon: PhoneIncoming, label: 'Inbound', value: calls.filter(c => c.direction === 'inbound').length, color: '#8B5CF6' },
          { icon: PhoneMissed, label: 'Missed', value: calls.filter(c => c.call_status === 'missed').length, color: '#EF4444' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="kpi-card" style={{ '--kpi-color': color }}>
            <div className="kpi-icon">
              <Icon size={18} strokeWidth={2} />
            </div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <button className="btn btn-success" onClick={() => setShowNewCall(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={15} />
          <span>Initiate Call</span>
        </button>
        <div style={{ flex: 1 }} />
      </div>

      {/* Call History */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="card-title">Call Logs & Audio Archive</div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Contact</th>
                <th>Direction</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Phone</th>
                <th>Date & Time</th>
                <th>Notes</th>
                <th>Recording</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></td></tr>
              ) : calls.map(call => (
                <tr key={call.id}>
                  <td style={{ fontWeight: '600' }}>{call.contact_name || '—'}</td>
                  <td>
                    <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {call.direction === 'outbound' ? (
                        <>
                          <PhoneOutgoing size={13} style={{ color: '#3B82F6' }} />
                          <span>Outbound</span>
                        </>
                      ) : (
                        <>
                          <PhoneIncoming size={13} style={{ color: '#8B5CF6' }} />
                          <span>Inbound</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td><span className={`status-badge status-${call.call_status}`}>{call.call_status}</span></td>
                  <td style={{ fontSize: '13px', fontFamily: 'monospace' }}>{formatDuration(call.duration_seconds)}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{call.phone_number}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {call.started_at ? new Date(call.started_at).toLocaleString('en-IN') : '—'}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {call.notes || '—'}
                  </td>
                  <td>
                    {call.recording_url ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => getRecordingUrl(call.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Play size={12} />
                        <span>Play</span>
                      </button>
                    ) : <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Call Modal */}
      {showNewCall && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNewCall(false)}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div className="modal-title">📞 Start New Call</div>
              <button className="modal-close" onClick={() => setShowNewCall(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Select Contact</label>
              <select className="form-select" value={selectedContact} onChange={e => setSelectedContact(e.target.value)}>
                <option value="">Choose contact...</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowNewCall(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleInitCall} disabled={!selectedContact}>
                📞 Start Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Widget */}
      {activeCall && callContact && (
        <CallWidget contact={callContact} onEnd={() => { setActiveCall(false); setCallContact(null); }} />
      )}
    </div>
  );
}
