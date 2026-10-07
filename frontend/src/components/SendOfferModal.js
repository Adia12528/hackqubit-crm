import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { X, Tag, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SendOfferModal({ contact, onClose, onSent }) {
  const [offers, setOffers] = useState([]);
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [channels, setChannels] = useState({
    whatsapp: !!(contact?.whatsapp_number || contact?.phone),
    sms: !!contact?.phone,
    email: !!contact?.email,
  });
  const [customNotes, setCustomNotes] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get('/offers')
      .then(({ data }) => {
        const list = data.offers || [];
        setOffers(list);
        if (list.length > 0) setSelectedOfferId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!selectedOfferId) {
      toast.error('Please select an offer');
      return;
    }

    const selectedList = Object.keys(channels).filter(k => channels[k]);
    if (selectedList.length === 0) {
      toast.error('Select at least one channel to send this offer');
      return;
    }

    setSending(true);
    try {
      await api.post(`/contacts/${contact.id}/send-offer`, {
        offer_id: selectedOfferId,
        channels: selectedList,
        custom_notes: customNotes,
      });

      toast.success('Commercial offer dispatched to customer!');
      if (onSent) onSent();
      onClose();
    } catch (err) {
      toast.error('Failed to send offer. Check channel credentials.');
    } finally {
      setSending(false);
    }
  };

  const selectedOffer = offers.find(o => o.id === selectedOfferId);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={18} style={{ color: '#EC4899' }} />
            <span>Send Commercial Offer</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Dispatch an official commercial offer to <strong>{contact.full_name}</strong>.
        </p>

        {/* Offer Dropdown */}
        <div className="form-group">
          <label className="form-label">Select Offer from Catalogue</label>
          <select
            className="form-select"
            value={selectedOfferId}
            onChange={e => setSelectedOfferId(e.target.value)}
          >
            {offers.map(o => (
              <option key={o.id} value={o.id}>
                {o.title} — {o.discount_value}
              </option>
            ))}
          </select>
        </div>

        {/* Offer Details Card */}
        {selectedOffer && (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '16px',
          }}>
            <div style={{ fontWeight: '700', fontSize: '13px', color: '#EC4899', marginBottom: '4px' }}>
              {selectedOffer.title} ({selectedOffer.discount_value})
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              {selectedOffer.description}
            </div>
            {selectedOffer.terms && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                <strong>Terms:</strong> {selectedOffer.terms}
              </div>
            )}
          </div>
        )}

        {/* Channels */}
        <div className="form-group">
          <label className="form-label">Deliver Via Channels</label>
          <div style={{ display: 'flex', gap: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={channels.whatsapp}
                onChange={() => setChannels(p => ({ ...p, whatsapp: !p.whatsapp }))}
              />
              <span>WhatsApp</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={channels.sms}
                onChange={() => setChannels(p => ({ ...p, sms: !p.sms }))}
              />
              <span>SMS</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={channels.email}
                onChange={() => setChannels(p => ({ ...p, email: !p.email }))}
              />
              <span>Email</span>
            </label>
          </div>
        </div>

        {/* Custom Notes */}
        <div className="form-group">
          <label className="form-label">Custom Note / Greeting (Optional)</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Add personal note to include with this offer..."
            value={customNotes}
            onChange={e => setCustomNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending || !selectedOfferId}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Send size={14} />
            <span>{sending ? 'Sending...' : 'Dispatch Offer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
