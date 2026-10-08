import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  ChevronRight,
  Clock3,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';

const STAGES = [
  { key: 'new', label: 'New', color: '#60A5FA', hint: 'Fresh opportunities' },
  { key: 'qualified', label: 'Qualified', color: '#A78BFA', hint: 'Validated prospects' },
  { key: 'proposal', label: 'Proposal', color: '#F59E0B', hint: 'Offer in progress' },
  { key: 'negotiation', label: 'Negotiation', color: '#FB7185', hint: 'Closing conversations' },
  { key: 'won', label: 'Won', color: '#34D399', hint: 'Revenue secured' },
  { key: 'lost', label: 'Lost', color: '#94A3B8', hint: 'Needs reactivation' },
];

const MOCK_DEALS = [
  { id: 'd1', title: 'Enterprise Cloud Deployment', value: 250000, stage: 'proposal', probability: 60, contact_id: '1', contact_name: 'Rahul Kumar', company: 'Acme Pvt Ltd' },
  { id: 'd2', title: '50-Seat Contact Center License', value: 120000, stage: 'negotiation', probability: 80, contact_id: '2', contact_name: 'Priya Sharma', company: 'InnoTech Labs' },
  { id: 'd3', title: 'WhatsApp Business API Integration', value: 80000, stage: 'qualified', probability: 40, contact_id: '3', contact_name: 'Amit Singh', company: 'Freight Express' },
  { id: 'd4', title: 'Multi-Tenant PBX SIP Trunking', value: 450000, stage: 'won', probability: 100, contact_id: '4', contact_name: 'Sonal Verma', company: 'PayFast Digital' },
];

const amount = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function DealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [view, setView] = useState('board');
  const navigate = useNavigate();

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/deals');
      const list = data.deals || [];
      setDeals(list.length ? list : MOCK_DEALS);
    } catch {
      setDeals(MOCK_DEALS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeals(); }, []);

  const filteredDeals = useMemo(() => deals.filter(deal => {
    const haystack = `${deal.title} ${deal.contact_name || ''} ${deal.company || ''}`.toLowerCase();
    return (stageFilter === 'all' || deal.stage === stageFilter) && haystack.includes(query.toLowerCase());
  }), [deals, query, stageFilter]);

  const metrics = useMemo(() => {
    const active = deals.filter(deal => !['won', 'lost'].includes(deal.stage));
    const total = deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
    const weighted = active.reduce((sum, deal) => sum + (Number(deal.value || 0) * Number(deal.probability || 0)) / 100, 0);
    const won = deals.filter(deal => deal.stage === 'won');
    return {
      total,
      weighted,
      activeValue: active.reduce((sum, deal) => sum + Number(deal.value || 0), 0),
      activeCount: active.length,
      wonValue: won.reduce((sum, deal) => sum + Number(deal.value || 0), 0),
      winRate: deals.length ? Math.round((won.length / deals.length) * 100) : 0,
    };
  }, [deals]);

  const renderDealCard = deal => {
    const stage = STAGES.find(item => item.key === deal.stage) || STAGES[0];
    return (
      <button
        key={deal.id}
        className="deal-card deal-card-enhanced"
        onClick={() => navigate('/contacts')}
        type="button"
      >
        <div className="deal-card-topline">
          <span className="deal-stage-dot" style={{ background: stage.color }} />
          <span className="deal-card-stage">{stage.label}</span>
          <ArrowUpRight size={14} />
        </div>
        <strong className="deal-card-title">{deal.title}</strong>
        <span className="deal-card-contact">
          {deal.contact_name || 'Unassigned'}{deal.company ? ` · ${deal.company}` : ''}
        </span>
        <div className="deal-card-value-row">
          <strong>{amount(deal.value)}</strong>
          <span>{Number(deal.probability || 0)}% likely</span>
        </div>
        <div className="deal-probability-track">
          <span style={{ width: `${Math.min(100, Number(deal.probability || 0))}%`, background: stage.color }} />
        </div>
      </button>
    );
  };

  return (
    <div className="deals-workspace">
      <section className="deals-hero">
        <div>
          <div className="eyebrow"><Activity size={13} /> Revenue operating view</div>
          <h2>Deals &amp; Sales Pipeline</h2>
          <p>See where every opportunity stands, what it is worth, and what deserves attention next.</p>
        </div>
        <div className="deals-hero-actions">
          <button className="btn btn-ghost btn-sm" onClick={fetchDeals} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/contacts')}>
            <Plus size={16} /> New deal
          </button>
        </div>
      </section>

      <section className="deal-metric-grid">
        <div className="deal-metric-card accent-blue"><span><Briefcase size={16} /> Total pipeline</span><strong>{amount(metrics.total)}</strong><small>{deals.length} tracked opportunities</small></div>
        <div className="deal-metric-card accent-purple"><span><Target size={16} /> Weighted forecast</span><strong>{amount(metrics.weighted)}</strong><small>Probability-adjusted revenue</small></div>
        <div className="deal-metric-card accent-green"><span><TrendingUp size={16} /> Open value</span><strong>{amount(metrics.activeValue)}</strong><small>{metrics.activeCount} active opportunities</small></div>
        <div className="deal-metric-card accent-orange"><span><Trophy size={16} /> Won revenue</span><strong>{amount(metrics.wonValue)}</strong><small>{metrics.winRate}% current win rate</small></div>
      </section>

      <section className="deals-toolbar">
        <div className="deal-search"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search deals, companies, contacts..." /></div>
        <div className="deal-filter"><Filter size={14} /><select value={stageFilter} onChange={event => setStageFilter(event.target.value)}><option value="all">All stages</option>{STAGES.map(stage => <option key={stage.key} value={stage.key}>{stage.label}</option>)}</select></div>
        <div className="deal-view-toggle"><button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>Board</button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List</button></div>
      </section>

      {view === 'board' ? (
        <section className="pipeline pipeline-enhanced">
          {STAGES.map(stage => {
            const stageDeals = filteredDeals.filter(deal => deal.stage === stage.key);
            const stageTotal = stageDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
            return (
              <div className="pipeline-column pipeline-column-enhanced" key={stage.key}>
                <div className="pipeline-header-enhanced">
                  <div><span className="stage-marker" style={{ background: stage.color }} /><strong>{stage.label}</strong><small>{stage.hint}</small></div>
                  <span className="stage-count">{stageDeals.length}</span>
                </div>
                <div className="stage-value">{amount(stageTotal)}</div>
                <div className="pipeline-column-cards">
                  {stageDeals.length ? stageDeals.map(renderDealCard) : <div className="pipeline-empty"><Clock3 size={18} /><span>No deals here</span></div>}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="deals-list-view">
          {filteredDeals.map(deal => {
            const stage = STAGES.find(item => item.key === deal.stage) || STAGES[0];
            return <button type="button" className="deal-list-row" key={deal.id} onClick={() => navigate('/contacts')}>
              <span className="stage-marker" style={{ background: stage.color }} />
              <span className="deal-list-main"><strong>{deal.title}</strong><small>{deal.contact_name || 'Unassigned'}{deal.company ? ` · ${deal.company}` : ''}</small></span>
              <span className="deal-list-stage">{stage.label}</span><strong>{amount(deal.value)}</strong><span>{deal.probability || 0}%</span><ChevronRight size={15} />
            </button>;
          })}
          {!filteredDeals.length && <div className="pipeline-empty"><Users size={20} /> No deals match your filters.</div>}
        </section>
      )}
    </div>
  );
}
