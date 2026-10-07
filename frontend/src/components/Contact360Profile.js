import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  Phone, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  MapPin, 
  Play, 
  Clock, 
  Plus, 
  Send, 
  Tag, 
  Megaphone, 
  FileText, 
  CheckSquare, 
  Briefcase, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowDownLeft, 
  ArrowUpRight,
  UserCheck,
  Building,
  Zap,
  Globe,
  MoreVertical,
  X
} from 'lucide-react';

import SendEverywhereModal from './SendEverywhereModal';
import SendOfferModal from './SendOfferModal';
import AddChannelModal from './AddChannelModal';

export default function Contact360Profile({ contactId, onBack, onUpdateContact }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals state
  const [showSendEverywhere, setShowSendEverywhere] = useState(false);
  const [showSendOffer, setShowSendOffer] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [directChannelModal, setDirectChannelModal] = useState(null); // 'whatsapp' | 'email' | 'sms' | 'call'
  const [directMessageText, setDirectMessageText] = useState('');
  const [directSubject, setDirectSubject] = useState('');
  const [sendingDirect, setSendingDirect] = useState(false);

  // New Note / Task / Deal inline state
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const [dealForm, setDealForm] = useState({ title: '', value: '', stage: 'new', probability: 20 });
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);

  // Fast conversation reply state
  const [convChannel, setConvChannel] = useState('whatsapp');
  const [convReplyText, setConvReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const fetchProfile = async () => {
    if (!contactId) return;
    try {
      const res = await api.get(`/contacts/${contactId}`);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchProfile();
  }, [contactId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!data?.contact) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <h3>Customer profile not found</h3>
        <p>The requested customer profile could not be retrieved.</p>
        {onBack && <button className="btn btn-ghost" onClick={onBack} style={{ marginTop: '12px' }}>Back</button>}
      </div>
    );
  }

  const { contact, channels = [], timeline = [], deals = [], notes = [], tasks = [], offers = [], campaigns = [], metrics = {} } = data;

  // Handler for direct channel send
  const handleSendDirect = async () => {
    if (!directMessageText.trim()) return;
    setSendingDirect(true);
    try {
      if (directChannelModal === 'whatsapp') {
        await api.post('/whatsapp/send', {
          contact_id: contact.id,
          phone_number: contact.whatsapp_number || contact.phone,
          message: directMessageText,
        });
        toast.success('WhatsApp message delivered');
      } else if (directChannelModal === 'sms') {
        await api.post('/sms/send', {
          contact_id: contact.id,
          phone_number: contact.phone,
          content: directMessageText,
        });
        toast.success('SMS message sent');
      } else if (directChannelModal === 'email') {
        await api.post('/emails/send', {
          contact_id: contact.id,
          to_address: contact.email,
          subject: directSubject || 'Message from HackQubit CRM',
          body: directMessageText,
        });
        toast.success('Email dispatched');
      } else if (directChannelModal === 'call') {
        await api.post('/calls/log', {
          contact_id: contact.id,
          phone_number: contact.phone,
          direction: 'outbound',
          duration_seconds: 60,
          notes: directMessageText,
          call_status: 'completed',
        });
        toast.success('Call session recorded');
      }

      setDirectChannelModal(null);
      setDirectMessageText('');
      setDirectSubject('');
      fetchProfile();
    } catch (err) {
      toast.error('Dispatch failed. Check channel credentials.');
    } finally {
      setSendingDirect(false);
    }
  };

  // Quick conversation reply inside tab
  const handleConvReply = async (e) => {
    e.preventDefault();
    if (!convReplyText.trim()) return;
    setReplying(true);
    try {
      if (convChannel === 'whatsapp') {
        await api.post('/whatsapp/send', {
          contact_id: contact.id,
          phone_number: contact.whatsapp_number || contact.phone,
          message: convReplyText,
        });
      } else if (convChannel === 'sms') {
        await api.post('/sms/send', {
          contact_id: contact.id,
          phone_number: contact.phone,
          content: convReplyText,
        });
      } else if (convChannel === 'email') {
        await api.post('/emails/send', {
          contact_id: contact.id,
          to_address: contact.email,
          subject: `Re: Update for ${contact.full_name}`,
          body: convReplyText,
        });
      }
      toast.success(`Sent via ${convChannel}`);
      setConvReplyText('');
      fetchProfile();
    } catch (err) {
      toast.error('Reply dispatch failed.');
    } finally {
      setReplying(false);
    }
  };

  // Add Note handler
  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteForm.content.trim()) return;
    try {
      await api.post(`/contacts/${contact.id}/notes`, noteForm);
      toast.success('Note added');
      setNoteForm({ title: '', content: '' });
      setShowNoteForm(false);
      fetchProfile();
    } catch (err) {
      toast.error('Failed to add note');
    }
  };

  // Add Task handler
  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    try {
      await api.post(`/contacts/${contact.id}/tasks`, taskForm);
      toast.success('Task scheduled');
      setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' });
      setShowTaskForm(false);
      fetchProfile();
    } catch (err) {
      toast.error('Failed to schedule task');
    }
  };

  // Toggle Task Status
  const handleToggleTask = async (task) => {
    try {
      const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
      await api.put(`/contacts/${contact.id}/tasks/${task.id}`, { status: nextStatus });
      fetchProfile();
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  // Add Deal handler
  const handleSaveDeal = async (e) => {
    e.preventDefault();
    if (!dealForm.title.trim()) return;
    try {
      await api.post(`/contacts/${contact.id}/deals`, dealForm);
      toast.success('Pipeline deal created');
      setDealForm({ title: '', value: '', stage: 'new', probability: 20 });
      setShowDealForm(false);
      fetchProfile();
    } catch (err) {
      toast.error('Failed to create deal');
    }
  };

  // Channel helper formatting
  const renderChannelIcon = (ch) => {
    switch (ch) {
      case 'whatsapp': return <MessageSquare size={14} style={{ color: '#25D366' }} />;
      case 'sms': return <Smartphone size={14} style={{ color: '#F59E0B' }} />;
      case 'email': return <Mail size={14} style={{ color: '#3B82F6' }} />;
      case 'phone': case 'call': return <Phone size={14} style={{ color: '#10B981' }} />;
      default: return <Globe size={14} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 360 HEADER */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          {/* Avatar & Core Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: '800', color: 'white',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
              position: 'relative',
            }}>
              {contact.full_name?.charAt(0) || 'C'}
              <span style={{
                position: 'absolute', bottom: '2px', right: '2px',
                width: '14px', height: '14px', borderRadius: '50%',
                background: contact.status === 'customer' ? '#10B981' : contact.status === 'lead' ? '#3B82F6' : '#F59E0B',
                border: '2px solid var(--bg-card)',
              }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.01em' }}>
                  {contact.full_name}
                </h1>
                <span className={`status-badge status-${contact.status}`}>
                  {contact.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                {contact.company && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building size={14} /> {contact.company}
                  </span>
                )}
                {contact.job_title && (
                  <span>• {contact.job_title}</span>
                )}
                {contact.assigned_to_name && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                    <UserCheck size={14} /> Agent: {contact.assigned_to_name}
                  </span>
                )}
              </div>

              {/* Quick Identifiers Strip */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', flexWrap: 'wrap' }}>
                {contact.whatsapp_number && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#25D366' }}>
                    <MessageSquare size={13} /> {contact.whatsapp_number}
                  </span>
                )}
                {contact.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
                    <Phone size={13} /> {contact.phone}
                  </span>
                )}
                {contact.email && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#3B82F6' }}>
                    <Mail size={13} /> {contact.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 360 Metric Highlights */}
          <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-secondary)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deal Value</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#10B981' }}>₹{metrics.totalDealValue || 0}</div>
            </div>
            <div style={{ width: '1px', background: 'var(--border)' }} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Interactions</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{metrics.totalInteractions || 0}</div>
            </div>
            <div style={{ width: '1px', background: 'var(--border)' }} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Preferred</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#3B82F6', textTransform: 'capitalize' }}>{metrics.preferredChannel || 'WhatsApp'}</div>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS BAR */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Individual Communication Triggers */}
          <button className="btn btn-sm" style={{ background: '#10B981', color: 'white' }} onClick={() => setDirectChannelModal('call')}>
            <Phone size={13} /> Call Softphone
          </button>
          <button className="btn btn-sm" style={{ background: '#25D366', color: 'white' }} onClick={() => setDirectChannelModal('whatsapp')}>
            <MessageSquare size={13} /> WhatsApp
          </button>
          <button className="btn btn-sm" style={{ background: '#3B82F6', color: 'white' }} onClick={() => setDirectChannelModal('email')}>
            <Mail size={13} /> Email
          </button>
          <button className="btn btn-sm" style={{ background: '#F59E0B', color: 'white' }} onClick={() => setDirectChannelModal('sms')}>
            <Smartphone size={13} /> SMS
          </button>

          <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 4px' }} />

          {/* Major Omnichannel Quick Actions */}
          <button
            className="btn btn-sm"
            style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', color: 'white', fontWeight: '600' }}
            onClick={() => setShowSendEverywhere(true)}
          >
            <Zap size={13} /> ⚡ Send Everywhere
          </button>

          <button
            className="btn btn-sm"
            style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#F472B6', border: '1px solid rgba(236, 72, 153, 0.3)' }}
            onClick={() => setShowSendOffer(true)}
          >
            <Tag size={13} /> Send Offer
          </button>

          <button className="btn btn-sm btn-ghost" onClick={() => setShowNoteForm(!showNoteForm)}>
            <FileText size={13} /> Add Note
          </button>

          <button className="btn btn-sm btn-ghost" onClick={() => setShowTaskForm(!showTaskForm)}>
            <CheckSquare size={13} /> Add Task
          </button>

          <button className="btn btn-sm btn-ghost" onClick={() => setShowDealForm(!showDealForm)}>
            <Briefcase size={13} /> Add Deal
          </button>
        </div>

        {/* Inline Quick Form Expanders */}
        {showNoteForm && (
          <form onSubmit={handleSaveNote} style={{ marginTop: '12px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px' }}>
            <input className="form-input" placeholder="Note Title (Optional)..." value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} style={{ marginBottom: '8px' }} />
            <textarea className="form-textarea" required rows={2} placeholder="Write internal note..." value={noteForm.content} onChange={e => setNoteForm({ ...noteForm, content: e.target.value })} style={{ marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNoteForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm">Save Note</button>
            </div>
          </form>
        )}

        {showTaskForm && (
          <form onSubmit={handleSaveTask} style={{ marginTop: '12px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px' }}>
            <div className="grid-2">
              <input className="form-input" required placeholder="Task Title..." value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
              <input className="form-input" type="datetime-local" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
            </div>
            <textarea className="form-textarea" rows={2} placeholder="Task description..." value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} style={{ marginTop: '8px', marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowTaskForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm">Schedule Task</button>
            </div>
          </form>
        )}

        {showDealForm && (
          <form onSubmit={handleSaveDeal} style={{ marginTop: '12px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px' }}>
            <div className="grid-2">
              <input className="form-input" required placeholder="Deal Title (e.g. Enterprise License)..." value={dealForm.title} onChange={e => setDealForm({ ...dealForm, title: e.target.value })} />
              <input className="form-input" type="number" placeholder="Value (INR)..." value={dealForm.value} onChange={e => setDealForm({ ...dealForm, value: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDealForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm">Create Deal</button>
            </div>
          </form>
        )}
      </div>

      {/* 360 TABS NAVIGATION */}
      <div className="profile-tabs">
        {[
          { key: 'overview', label: 'Overview', icon: Building },
          { key: 'conversations', label: 'Conversations', count: timeline.filter(t => ['whatsapp', 'sms', 'email', 'call'].includes(t.channel)).length, icon: MessageSquare },
          { key: 'timeline', label: 'Unified Timeline', count: timeline.length, icon: Clock },
          { key: 'deals', label: 'Deals & Pipeline', count: deals.length, icon: Briefcase },
          { key: 'campaigns', label: 'Campaigns', count: campaigns.length, icon: Megaphone },
          { key: 'offers', label: 'Commercial Offers', count: offers.length, icon: Tag },
          { key: 'notes', label: 'Notes', count: notes.length, icon: FileText },
          { key: 'tasks', label: 'Tasks', count: tasks.filter(t => t.status !== 'completed').length, icon: CheckSquare },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`profile-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.count !== undefined && <span className="profile-tab-badge">{tab.count}</span>}
            </button>
          );
        })}
      </div>

      {/* 360 TAB CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid-2">
            {/* Identity & Contact Channels Card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Customer Multi-Channel Identity</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddChannel(true)}>
                  <Plus size={13} /> Add Channel
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {channels.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No additional channels registered.</div>
                ) : (
                  channels.map(ch => (
                    <div key={ch.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {renderChannelIcon(ch.channel)}
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '13px' }}>{ch.identifier}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {ch.channel} {ch.is_primary && '• Primary'} {ch.is_verified && '• Verified ✓'}
                          </div>
                        </div>
                      </div>
                      <span className="status-badge status-customer" style={{ fontSize: '10px' }}>Active</span>
                    </div>
                  ))
                )}
              </div>

              {/* Core Details */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Demographics & Meta
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Address:</span> {contact.address || '—'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>City:</span> {contact.city || '—'}, {contact.country || '—'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Source:</span> <span style={{ textTransform: 'capitalize' }}>{contact.source}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Customer Since:</span> {contact.created_at ? format(new Date(contact.created_at), 'MMM dd, yyyy') : '—'}</div>
                </div>
              </div>
            </div>

            {/* Quick KPI & Pipeline Snapshot */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Commercial Summary</div>
                  <span className="status-badge status-lead">{deals.length} Active Deals</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#10B981', marginBottom: '8px' }}>
                  ₹{metrics.totalDealValue || 0}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total pipeline value mapped to this customer profile.
                </p>
              </div>

              {/* Recent Active Tasks */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Pending Action Items ({tasks.filter(t => t.status !== 'completed').length})</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tasks.filter(t => t.status !== 'completed').slice(0, 3).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                      <input type="checkbox" checked={false} onChange={() => handleToggleTask(t)} />
                      <div style={{ flex: 1, fontWeight: '500' }}>{t.title}</div>
                      <span className={`status-badge status-${t.priority}`}>{t.priority}</span>
                    </div>
                  ))}
                  {tasks.filter(t => t.status !== 'completed').length === 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No pending tasks for this contact.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONVERSATIONS */}
        {activeTab === 'conversations' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
            {/* Conversation Feed */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>Customer Unified Thread</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className={`btn btn-sm ${convChannel === 'whatsapp' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setConvChannel('whatsapp')}>WhatsApp</button>
                  <button className={`btn btn-sm ${convChannel === 'sms' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setConvChannel('sms')}>SMS</button>
                  <button className={`btn btn-sm ${convChannel === 'email' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setConvChannel('email')}>Email</button>
                </div>
              </div>

              {/* Message List */}
              <div style={{ padding: '16px', maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {timeline.filter(t => ['whatsapp', 'sms', 'email', 'call'].includes(t.channel)).length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px' }}>
                    <div className="empty-icon">💬</div>
                    <h3>No messages yet</h3>
                    <p>Start a conversation via WhatsApp, SMS, or Email below.</p>
                  </div>
                ) : (
                  timeline.filter(t => ['whatsapp', 'sms', 'email', 'call'].includes(t.channel)).map(item => {
                    const data = item.data || {};
                    const isOutbound = data.direction === 'outbound';
                    return (
                      <div key={item.id} style={{
                        alignSelf: isOutbound ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        background: isOutbound ? 'var(--blue)' : 'var(--bg-secondary)',
                        color: isOutbound ? 'white' : 'var(--text-primary)',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        border: isOutbound ? 'none' : '1px solid var(--border)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', opacity: 0.85, fontSize: '11px' }}>
                          <span style={{ textTransform: 'capitalize' }}>{item.channel}</span>
                          <span>•</span>
                          <span>{item.occurred_at ? formatDistanceToNow(new Date(item.occurred_at), { addSuffix: true }) : ''}</span>
                        </div>
                        <div>{data.content || data.notes || data.subject || 'Voice call session'}</div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Inline Reply Composer */}
              <form onSubmit={handleConvReply} style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder={`Reply via ${convChannel.toUpperCase()}...`}
                  value={convReplyText}
                  onChange={e => setConvReplyText(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={replying || !convReplyText.trim()}>
                  <Send size={14} />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: UNIFIED TIMELINE (9 Sources) */}
        {activeTab === 'timeline' && (
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              Complete 360° Chronological Activity Log ({timeline.length} events)
            </div>

            {timeline.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No activity recorded</h3>
                <p>Call, send a message, dispatch an offer, or create a deal.</p>
              </div>
            ) : (
              <div className="timeline">
                {timeline.map(item => {
                  const data = item.data || {};
                  return (
                    <div className="timeline-item" key={item.id}>
                      <div className={`timeline-dot ${item.channel}`}>
                        {renderChannelIcon(item.channel)}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className={`channel-chip ${item.channel}`}>
                            {data.title || item.channel}
                          </span>
                          <span className="timeline-time">
                            {item.occurred_at ? formatDistanceToNow(new Date(item.occurred_at), { addSuffix: true }) : ''}
                          </span>
                        </div>
                        <div className="timeline-body">
                          {data.content && <div>{data.content}</div>}
                          {data.notes && <div>{data.notes}</div>}
                          {data.subject && <div><strong>Subject:</strong> {data.subject}</div>}
                          {data.discount && <div><strong>Offer Discount:</strong> {data.discount}</div>}
                          {data.stage && <div>Stage: <span className="status-badge status-lead">{data.stage}</span> | Value: ₹{data.value}</div>}
                          {data.duration > 0 && <div>Call Duration: {Math.floor(data.duration / 60)}m {data.duration % 60}s</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DEALS */}
        {activeTab === 'deals' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>Customer Deals & Opportunities</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowDealForm(true)}>+ New Deal</button>
            </div>
            {deals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💼</div>
                <h3>No deals yet</h3>
                <p>Create a commercial deal for this customer.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {deals.map(d => (
                  <div key={d.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{d.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Created {format(new Date(d.created_at), 'MMM dd, yyyy')}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span className={`status-badge status-${d.stage}`}>{d.stage}</span>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#10B981' }}>₹{d.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CAMPAIGNS */}
        {activeTab === 'campaigns' && (
          <div>
            <h3 style={{ marginBottom: '16px' }}>Marketing Campaigns Sent to this Customer</h3>
            {campaigns.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📢</div>
                <h3>No campaigns received</h3>
                <p>This contact has not been targeted in any marketing campaigns yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {campaigns.map(c => (
                  <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{c.campaign_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Channel: {c.channel} • {c.recipient}</div>
                    </div>
                    <span className="status-badge status-customer">{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: OFFERS */}
        {activeTab === 'offers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>Commercial Offers Sent</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowSendOffer(true)}>+ Send Offer</button>
            </div>
            {offers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏷️</div>
                <h3>No offers sent yet</h3>
                <p>Send a discounted package or promo to this customer.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {offers.map(o => (
                  <div key={o.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#EC4899' }}>{o.title} ({o.discount_value})</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sent by {o.sent_by_name || 'Agent'} on {format(new Date(o.sent_at), 'MMM dd, yyyy')}</div>
                    </div>
                    <span className="status-badge status-customer">{o.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: NOTES */}
        {activeTab === 'notes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>Internal Agent Notes</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNoteForm(true)}>+ Add Note</button>
            </div>
            {notes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No notes yet</h3>
                <p>Add meeting notes or customer insights.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notes.map(n => (
                  <div key={n.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontWeight: '700', fontSize: '13px' }}>{n.title || 'Internal Note'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{format(new Date(n.created_at), 'MMM dd, yyyy • p')}</div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{n.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: TASKS */}
        {activeTab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>Follow-up Tasks</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowTaskForm(true)}>+ Add Task</button>
            </div>
            {tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">☑️</div>
                <h3>No tasks scheduled</h3>
                <p>Create a follow-up or demo preparation task.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tasks.map(t => (
                  <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="checkbox" checked={t.status === 'completed'} onChange={() => handleToggleTask(t)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '13px', textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>
                        {t.title}
                      </div>
                      {t.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.description}</div>}
                    </div>
                    <span className={`status-badge status-${t.priority}`}>{t.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      {showSendEverywhere && (
        <SendEverywhereModal
          contact={contact}
          onClose={() => setShowSendEverywhere(false)}
          onDispatched={fetchProfile}
        />
      )}

      {showSendOffer && (
        <SendOfferModal
          contact={contact}
          onClose={() => setShowSendOffer(false)}
          onSent={fetchProfile}
        />
      )}

      {showAddChannel && (
        <AddChannelModal
          contactId={contact.id}
          onClose={() => setShowAddChannel(false)}
          onAdded={fetchProfile}
        />
      )}

      {/* Direct Single Channel Dispatch Modal */}
      {directChannelModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDirectChannelModal(null)}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {renderChannelIcon(directChannelModal)}
                <span style={{ textTransform: 'capitalize' }}>Dispatch via {directChannelModal}</span>
              </div>
              <button className="modal-close" onClick={() => setDirectChannelModal(null)}><X size={16} /></button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Sending to: <strong>{contact.full_name}</strong> ({directChannelModal === 'email' ? contact.email : contact.whatsapp_number || contact.phone})
            </p>

            {directChannelModal === 'email' && (
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-input" placeholder="Email subject..." value={directSubject} onChange={e => setDirectSubject(e.target.value)} />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                {directChannelModal === 'call' ? 'Call Session Notes' : 'Message'}
              </label>
              <textarea
                className="form-textarea"
                rows={4}
                required
                placeholder={directChannelModal === 'call' ? 'Log notes from softphone session...' : `Type ${directChannelModal} message...`}
                value={directMessageText}
                onChange={e => setDirectMessageText(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDirectChannelModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSendDirect} disabled={sendingDirect || !directMessageText.trim()}>
                <Send size={14} />
                <span>{sendingDirect ? 'Sending...' : 'Send'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
