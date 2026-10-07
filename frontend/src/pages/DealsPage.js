import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, ExternalLink } from 'lucide-react';

export default function DealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

  const MOCK_DEALS = [
    { id: 'd1', title: 'Enterprise Cloud Deployment', value: 250000, stage: 'proposal', probability: 60, contact_id: '1', contact_name: 'Rahul Kumar', company: 'Acme Pvt Ltd' },
    { id: 'd2', title: '50-Seat Contact Center License', value: 120000, stage: 'negotiation', probability: 80, contact_id: '2', contact_name: 'Priya Sharma', company: 'InnoTech Labs' },
    { id: 'd3', title: 'WhatsApp Business API Integration', value: 80000, stage: 'qualified', probability: 40, contact_id: '3', contact_name: 'Amit Singh', company: 'Freight Express' },
    { id: 'd4', title: 'Multi-Tenant PBX SIP Trunking', value: 450000, stage: 'won', probability: 100, contact_id: '4', contact_name: 'Sonal Verma', company: 'PayFast Digital' },
  ];

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/deals');
      const list = data.deals || [];
      setDeals(list.length > 0 ? list : MOCK_DEALS);
    } catch {
      setDeals(MOCK_DEALS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const totalPipelineValue = deals.reduce((sum, d) => sum + parseFloat(d.value || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.01em' }}>Deals & Sales Pipeline</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Pipeline tracking directly mapped to individual customer profiles. Total Pipeline: <strong style={{ color: '#10B981' }}>₹{totalPipelineValue.toLocaleString()}</strong>
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/contacts')}>
          <Plus size={16} />
          <span>New Deal via Customer</span>
        </button>
      </div>

      {/* Kanban Pipeline Columns */}
      <div className="pipeline">
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage);
          const stageTotal = stageDeals.reduce((sum, d) => sum + parseFloat(d.value || 0), 0);

          return (
            <div key={stage} className="pipeline-column">
              <div className="pipeline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.06em' }}>{stage}</span>
                <span className="profile-tab-badge">₹{stageTotal.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stageDeals.map(deal => (
                  <div key={deal.id} className="deal-card" onClick={() => navigate('/contacts')}>
                    <div style={{ fontWeight: '700', fontSize: '13.5px', marginBottom: '4px' }}>{deal.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {deal.contact_name} ({deal.company})
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#10B981' }}>₹{deal.value?.toLocaleString()}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{deal.probability}% Prob</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
