import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Send, MessageSquare, AlertCircle } from 'lucide-react';

export default function WhatsAppPage() {
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    api.get('/contacts')
      .then(({ data }) => {
        const list = data.contacts || [];
        setContacts(list);
        if (list.length > 0) setActiveContact(list[0]);
      })
      .catch((err) => {
        setLoadError('Could not load contacts. Check that the backend and database are running.');
        console.error('WhatsApp contacts load error:', err.message);
      });
  }, []);

  useEffect(() => {
    if (!activeContact) return;
    api.get(`/whatsapp/messages?contact_id=${activeContact.id}`)
      .then(({ data }) => setMessages(data.messages || []))
      .catch((err) => {
        console.error('WhatsApp messages load error:', err.message);
        setMessages([]);
      });
  }, [activeContact]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContact) return;

    const newMsg = {
      id: Date.now().toString(),
      direction: 'outbound',
      message_type: 'text',
      content: inputText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMsg]);
    const textToSend = inputText;
    setInputText('');
    setSending(true);

    try {
      await api.post('/whatsapp/send', {
        contact_id: activeContact.id,
        phone_number: activeContact.whatsapp_number || activeContact.phone,
        message: textToSend
      });
      toast.success('WhatsApp message delivered');
    } catch (err) {
      toast.error('Failed to send message. Check WhatsApp API token configuration.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', height: 'calc(100vh - 120px)' }}>
      {/* Contact Conversations List */}
      <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>💬</span>
            <div className="card-title">WhatsApp Cloud Inbox</div>
          </div>
          <p className="card-subtitle">Official Meta Cloud API Webhook Integration</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadError && (
            <div style={{ padding: '16px', color: '#F87171', fontSize: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{loadError}</span>
            </div>
          )}
          {contacts.map(c => {
            const isSelected = activeContact?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setActiveContact(c)}
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(37,211,102,0.1)' : 'transparent',
                  borderLeft: isSelected ? '3px solid #25D366' : '3px solid transparent',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10B981, #06B6D4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '700', fontSize: '15px', color: 'white'
                }}>
                  {c.full_name?.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.full_name}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>11:30 AM</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.whatsapp_number || c.phone}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Thread */}
      <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeContact ? (
          <>
            {/* Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: '#25D366', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'white', fontWeight: 'bold'
                }}>
                  WA
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>{activeContact.full_name}</div>
                  <div style={{ fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                    WhatsApp Cloud Active • {activeContact.whatsapp_number || activeContact.phone}
                  </div>
                </div>
              </div>
              <span className="channel-chip whatsapp">Meta Verified Webhook</span>
            </div>

            {/* Messages body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(15,22,41,0.6)' }}>
              {messages.map(m => {
                const isOutbound = m.direction === 'outbound';
                return (
                  <div
                    key={m.id}
                    className={`message-bubble ${isOutbound ? 'outbound' : 'inbound'}`}
                    style={{
                      background: isOutbound ? 'linear-gradient(135deg, #059669, #10B981)' : 'var(--bg-card)',
                      color: '#F1F5F9',
                      maxWidth: '75%',
                      border: isOutbound ? 'none' : '1px solid var(--border)'
                    }}
                  >
                    <div style={{ fontSize: '14px', lineHeight: '1.5' }}>{m.content}</div>
                    <div style={{ fontSize: '10px', opacity: 0.75, textAlign: 'right', marginTop: '4px' }}>
                      {m.created_at ? format(new Date(m.created_at), 'hh:mm a') : 'Now'} {isOutbound && '✓✓'}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <form onSubmit={handleSend} style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', gap: '10px' }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Type a WhatsApp message..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
              />
              <button type="submit" className="btn btn-success" disabled={sending || !inputText.trim()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Send size={14} />
                <span>{sending ? 'Sending...' : 'Send'}</span>
              </button>
            </form>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><MessageSquare size={32} style={{ color: 'var(--text-muted)' }} /></div>
            <h3>Select a contact to view conversation</h3>
          </div>
        )}
      </div>
    </div>
  );
}
