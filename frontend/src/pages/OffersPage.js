import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Tag, Plus, CheckCircle2, Clock, Calendar, Users, X } from 'lucide-react';
import { format } from 'date-fns';

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '20%',
    valid_until: '',
    terms: 'Valid for new enterprise deployments.',
    target_audience: 'Mid-Market & Enterprise Accounts',
  });

  const MOCK_OFFERS = [
    {
      id: 'o1',
      title: 'Enterprise Plan — 20% Discount',
      description: 'Annual commitment bundle with priority SLA, unlimited WebRTC SIP softphones and custom workflows.',
      discount_type: 'percentage',
      discount_value: '20%',
      valid_until: '2026-12-31',
      status: 'active',
      dispatched_count: 34,
      accepted_count: 12,
      target_audience: 'Enterprise Sales',
    },
    {
      id: 'o2',
      title: 'WhatsApp Business Onboarding Pack',
      description: 'Complimentary Meta Verified business setup with 5,000 free monthly tier conversations.',
      discount_type: 'custom',
      discount_value: 'Free Setup',
      valid_until: '2026-11-30',
      status: 'active',
      dispatched_count: 22,
      accepted_count: 8,
      target_audience: 'High-Volume Support Teams',
    },
    {
      id: 'o3',
      title: 'Startup Omnichannel Launch Voucher',
      description: 'Flat ₹15,000 credit on first-year self-hosted deployment infrastructure.',
      discount_type: 'fixed',
      discount_value: '₹15,000 Off',
      valid_until: '2026-10-31',
      status: 'active',
      dispatched_count: 15,
      accepted_count: 5,
      target_audience: 'Early Stage Startups',
    },
  ];

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/offers');
      const list = data.offers || [];
      setOffers(list.length > 0 ? list : MOCK_OFFERS);
    } catch {
      setOffers(MOCK_OFFERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/offers', form);
      toast.success('Commercial offer added to catalogue!');
      setShowCreateModal(false);
      setForm({
        title: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '20%',
        valid_until: '',
        terms: 'Valid for new enterprise deployments.',
        target_audience: 'Mid-Market & Enterprise Accounts',
      });
      fetchOffers();
    } catch {
      toast.error('Failed to create offer');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.01em' }}>Commercial Offers Catalogue</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Structured commercial packages and promo offers that can be dispatched directly from any Customer 360 Profile.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} />
          <span>New Commercial Offer</span>
        </button>
      </div>

      {/* Grid of Offers */}
      <div className="grid-3">
        {offers.map(o => (
          <div key={o.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span className="channel-chip offer" style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '700' }}>
                  {o.discount_value}
                </span>
                <span className="status-badge status-customer">{o.status}</span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '6px' }}>{o.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px' }}>
                {o.description}
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>Audience:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{o.target_audience || 'All'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Dispatched:</span>
                <span style={{ color: '#10B981', fontWeight: '600' }}>{o.dispatched_count || 0} times</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE OFFER MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={18} style={{ color: '#EC4899' }} />
                <span>Create Commercial Offer</span>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Offer Title *</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. Enterprise Annual Discount 25%"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Discount Type</label>
                  <select
                    className="form-select"
                    value={form.discount_type}
                    onChange={e => setForm({ ...form, discount_type: e.target.value })}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Cash Amount (₹)</option>
                    <option value="custom">Custom Value / Perk</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Discount Value *</label>
                  <input
                    className="form-input"
                    required
                    placeholder="e.g. 20% or ₹10,000"
                    value={form.discount_value}
                    onChange={e => setForm({ ...form, discount_value: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Offer details and what is included..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Terms & Conditions</label>
                <input
                  className="form-input"
                  placeholder="e.g. Valid only with 12-month advance contract"
                  value={form.terms}
                  onChange={e => setForm({ ...form, terms: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save to Catalogue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
