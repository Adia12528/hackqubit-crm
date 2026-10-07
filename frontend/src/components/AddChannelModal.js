import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { X, Plus, Hash } from 'lucide-react';

export default function AddChannelModal({ contactId, onClose, onAdded }) {
  const [channel, setChannel] = useState('whatsapp');
  const [identifier, setIdentifier] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setSaving(true);
    try {
      await api.post(`/contacts/${contactId}/channels`, {
        channel,
        identifier: identifier.trim(),
        is_primary: isPrimary,
        is_verified: true,
      });

      toast.success(`Added ${channel} channel identifier`);
      if (onAdded) onAdded();
      onClose();
    } catch (err) {
      toast.error('Failed to add channel identifier');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            <span>Add Communication Channel</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Channel Type</label>
            <select className="form-select" value={channel} onChange={e => setChannel(e.target.value)}>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone / Voice</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="telegram">Telegram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              {channel === 'email' ? 'Email Address' : channel === 'telegram' || channel === 'linkedin' ? 'Username / Handle' : 'Phone Number (E.164)'}
            </label>
            <input
              className="form-input"
              required
              placeholder={channel === 'email' ? 'name@domain.com' : '+91 98765 43210'}
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={e => setIsPrimary(e.target.checked)}
              />
              <span>Set as primary identifier for this channel</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !identifier.trim()}>
              {saving ? 'Adding...' : 'Add Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
