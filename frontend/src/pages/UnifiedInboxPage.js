import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { 
  Inbox, 
  Search, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  PhoneCall, 
  Send, 
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UnifiedInboxPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [activeChannel, setActiveChannel] = useState('all');
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Mock conversations fallback
  const MOCK_CONVERSATIONS = [
    {
      conversation_id: 'conv_1',
      contact_id: '1',
      contact_name: 'Rahul Kumar',
      company: 'Acme Pvt Ltd',
      channel: 'whatsapp',
      last_message_preview: 'Can you share the updated quotation with 20% discount?',
      last_message_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      unread_count: 2,
    },
    {
      conversation_id: 'conv_2',
      contact_id: '2',
      contact_name: 'Priya Sharma',
      company: 'InnoTech Labs',
      channel: 'email',
      last_message_preview: 'Re: Enterprise Cloud CRM Proposal - Contract Review',
      last_message_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      unread_count: 1,
    },
    {
      conversation_id: 'conv_3',
      contact_id: '3',
      contact_name: 'Amit Singh',
      company: 'Freight Express',
      channel: 'sms',
      last_message_preview: 'Received the demo link. Preparing team for Monday call.',
      last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      unread_count: 0,
    },
    {
      conversation_id: 'conv_4',
      contact_id: '4',
      contact_name: 'Sonal Verma',
      company: 'PayFast Digital',
      channel: 'call',
      last_message_preview: 'Voice softphone completed session (12m 45s)',
      last_message_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      unread_count: 0,
    },
  ];

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/inbox', {
        params: { channel: activeChannel, search },
      });
      const list = data.conversations || [];
      setConversations(list.length > 0 ? list : MOCK_CONVERSATIONS);
      if (!selectedConv && (list.length > 0 || MOCK_CONVERSATIONS.length > 0)) {
        setSelectedConv(list[0] || MOCK_CONVERSATIONS[0]);
      }
    } catch {
      setConversations(MOCK_CONVERSATIONS);
      if (!selectedConv && MOCK_CONVERSATIONS.length > 0) {
        setSelectedConv(MOCK_CONVERSATIONS[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [activeChannel, search]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConv) return;
    setReplying(true);

    try {
      const ch = selectedConv.channel;
      if (ch === 'whatsapp') {
        await api.post('/whatsapp/send', {
          contact_id: selectedConv.contact_id,
          phone_number: selectedConv.contact_phone || selectedConv.whatsapp_number,
          message: replyText,
        });
      } else if (ch === 'sms') {
        await api.post('/sms/send', {
          contact_id: selectedConv.contact_id,
          phone_number: selectedConv.contact_phone,
          content: replyText,
        });
      } else if (ch === 'email') {
        await api.post('/emails/send', {
          contact_id: selectedConv.contact_id,
          to_address: selectedConv.contact_email,
          subject: 'Re: ' + (selectedConv.last_message_preview || 'CRM Message'),
          body: replyText,
        });
      }
      toast.success(`Dispatched via ${ch}`);
      setReplyText('');
      fetchInbox();
    } catch {
      toast.error('Dispatch failed');
    } finally {
      setReplying(false);
    }
  };

  const renderChannelBadge = (ch) => {
    switch (ch) {
      case 'whatsapp':
        return <span className="channel-chip whatsapp"><MessageSquare size={12} /> WhatsApp</span>;
      case 'email':
        return <span className="channel-chip email"><Mail size={12} /> Email</span>;
      case 'sms':
        return <span className="channel-chip sms"><Smartphone size={12} /> SMS</span>;
      case 'call':
        return <span className="channel-chip call"><PhoneCall size={12} /> Call</span>;
      default:
        return <span className="channel-chip">{ch}</span>;
    }
  };

  return (
    <div className="inbox-container">
      {/* LEFT PANE: CONVERSATION LIST */}
      <div className="inbox-list">
        {/* Header & Channels Filter Bar */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>
            <Inbox size={18} style={{ color: 'var(--blue)' }} />
            <span>Unified Omnichannel Inbox</span>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '30px', fontSize: '12px' }}
              placeholder="Search conversations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Channel Filters */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'whatsapp', label: 'WhatsApp' },
              { id: 'email', label: 'Email' },
              { id: 'sms', label: 'SMS' },
              { id: 'call', label: 'Calls' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`btn btn-sm ${activeChannel === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={() => setActiveChannel(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List Items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.map(conv => {
            const isSelected = selectedConv?.conversation_id === conv.conversation_id;
            return (
              <div
                key={conv.conversation_id}
                className={`inbox-item ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedConv(conv)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontWeight: '700', fontSize: '13.5px' }}>{conv.contact_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true }) : ''}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {conv.company}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.4' }}>
                  {conv.last_message_preview?.substring(0, 75)}
                  {(conv.last_message_preview?.length || 0) > 75 ? '...' : ''}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {renderChannelBadge(conv.channel)}
                  {conv.unread_count > 0 && (
                    <span style={{
                      background: 'var(--blue)', color: 'white',
                      fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '10px'
                    }}>
                      {conv.unread_count} new
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANE: ACTIVE THREAD & DIRECT 360° PROFILE LINK */}
      <div className="inbox-chat-pane">
        {selectedConv ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Conversation Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800' }}>{selectedConv.contact_name}</h3>
                  {renderChannelBadge(selectedConv.channel)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {selectedConv.company || 'Customer'}
                </div>
              </div>

              {/* Seamless Jump to 360° Profile */}
              <button
                className="btn btn-sm btn-primary"
                onClick={() => navigate('/contacts')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Open 360° Profile</span>
                <ExternalLink size={13} />
              </button>
            </div>

            {/* Conversation Thread History */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '14px 18px',
                maxWidth: '85%',
                fontSize: '13px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <strong>{selectedConv.contact_name}</strong>
                  <span>•</span>
                  <span>{selectedConv.last_message_at ? formatDistanceToNow(new Date(selectedConv.last_message_at), { addSuffix: true }) : ''}</span>
                </div>
                <div>{selectedConv.last_message_preview}</div>
              </div>
            </div>

            {/* In-line Reply Dispatcher */}
            <form onSubmit={handleReply} style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', gap: '10px' }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                placeholder={`Dispatch reply to ${selectedConv.contact_name} via ${selectedConv.channel.toUpperCase()}...`}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={replying || !replyText.trim()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Send size={14} />
                <span>{replying ? 'Sending...' : 'Reply'}</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="empty-state" style={{ margin: 'auto' }}>
            <div className="empty-icon">💬</div>
            <h3>No conversation selected</h3>
            <p>Select a thread from the list on the left.</p>
          </div>
        )}
      </div>
    </div>
  );
}
