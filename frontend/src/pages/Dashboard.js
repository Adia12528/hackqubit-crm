import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  FileCode2,
  FolderArchive,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  Server,
  ShieldCheck,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const CHANNELS = {
  call: { label: 'Calls', color: '#3B82F6' },
  whatsapp: { label: 'WhatsApp', color: '#22C55E' },
  email: { label: 'Email', color: '#A78BFA' },
  sms: { label: 'SMS', color: '#F59E0B' },
};

const ARCHITECTURE = [
  {
    icon: Server,
    title: 'API runtime',
    value: 'Node.js + Express',
    detail: 'REST API on port 5000 with JWT middleware and role-aware route guards.',
    specs: ['HTTP/JSON', 'JWT auth', 'Socket.IO events'],
  },
  {
    icon: Database,
    title: 'Primary data',
    value: 'PostgreSQL',
    detail: 'Relational customer, timeline, deal, message, and audit records with migrations.',
    specs: ['SQL queries', 'Persistent volume', 'Indexed contacts'],
  },
  {
    icon: FolderArchive,
    title: 'Object storage',
    value: 'MinIO S3',
    detail: 'S3-compatible buckets for recordings and attachments without external SaaS lock-in.',
    specs: ['call-recordings', 'attachments', 'Presigned URLs'],
  },
  {
    icon: ShieldCheck,
    title: 'Access control',
    value: '5-tier RBAC',
    detail: 'Access is enforced at the API boundary for admins, managers, agents, and auditors.',
    specs: ['Route policies', 'Audit trail', 'Scoped records'],
  },
];

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  const target = Number(value) || 0;

  useEffect(() => {
    let frame;
    const start = display;
    const startedAt = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - startedAt) / 650, 1);
      setDisplay(Math.round(start + (target - start) * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return display.toLocaleString('en-IN');
}

function MetricCard({ icon: Icon, label, value, detail, color }) {
  return (
    <div className="kpi-card dashboard-metric" style={{ '--kpi-color': color }}>
      <div className="metric-card-top">
        <div className="kpi-icon"><Icon size={18} /></div>
        <span className="metric-live-dot"><span /> live</span>
      </div>
      <div className="kpi-value"><AnimatedNumber value={value} /></div>
      <div className="kpi-label">{label}</div>
      <div className="metric-detail">{detail}</div>
    </div>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title, action }) {
  return (
    <div className="dashboard-section-heading">
      <div className="section-heading-copy">
        <div className="section-eyebrow"><Icon size={14} /> {eyebrow}</div>
        <h3>{title}</h3>
      </div>
      {action}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showSystemDetails, setShowSystemDetails] = useState(false);
  const [range, setRange] = useState(30);
  const [activeChannels, setActiveChannels] = useState(Object.keys(CHANNELS));
  const [expandedArchitecture, setExpandedArchitecture] = useState(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/analytics/dashboard');
      setStats(data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard analytics error:', err.message);
      setError('Live analytics are unavailable. Check the API and database connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = window.setInterval(loadStats, 30000);
    return () => window.clearInterval(interval);
  }, [loadStats]);

  const kpis = stats?.kpis || {};
  const contacts = kpis.contacts || {};
  const calls = kpis.calls || {};
  const whatsapp = kpis.whatsapp || {};
  const deals = kpis.deals || {};

  const chartData = useMemo(() => {
    const grouped = {};
    (stats?.channelActivity || []).forEach((item) => {
      const date = new Date(item.date).toISOString().slice(0, 10);
      if (!grouped[date]) grouped[date] = { date };
      grouped[date][item.channel] = Number(item.count) || 0;
    });
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)).slice(-range);
  }, [range, stats]);

  const activityTotal = chartData.reduce(
    (total, day) => total + activeChannels.reduce((sum, channel) => sum + (day[channel] || 0), 0),
    0,
  );
  const conversion = deals.total ? Math.round(((deals.won || 0) / deals.total) * 100) : 0;
  const toggleChannel = (channel) => {
    setActiveChannels((current) => (
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel]
    ));
  };

  return (
    <div className="dashboard-shell">
      {error && (
        <div className="dashboard-alert">
          <Server size={16} />
          <span>{error}</span>
          <button className="icon-button" onClick={loadStats} aria-label="Retry analytics"><RefreshCw size={15} /></button>
        </div>
      )}

      <header className="dashboard-hero">
        <div>
          <div className="hero-kicker"><span className="pulse-dot" /> OPERATIONS CONSOLE / v1.0</div>
          <h2>Good to see you, {user?.full_name?.split(' ')[0] || 'operator'}.</h2>
          <p>Monitor customer activity, pipeline throughput, and infrastructure health from one control plane.</p>
        </div>
        <div className="hero-network" aria-hidden="true">
          <div className="network-orbit orbit-one"><span /></div>
          <div className="network-orbit orbit-two"><span /></div>
          <div className="network-core"><Activity size={20} /></div>
        </div>
        <div className="hero-actions">
          <div className="system-status"><Wifi size={14} /> API <strong>connected</strong></div>
          <button className="button-secondary" onClick={loadStats} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Syncing' : 'Sync now'}
          </button>
          <button className="button-primary dashboard-details-button" onClick={() => setShowSystemDetails((value) => !value)}>
            <FileCode2 size={14} /> {showSystemDetails ? 'Hide system details' : 'View system details'}
          </button>
        </div>
      </header>

      <div className="dashboard-toolbar">
        <div className="dashboard-context"><Activity size={14} /> Operational overview <span>· all channels live</span></div>
        <div className="sync-meta">
          <Activity size={13} /> Auto-refresh 30s
          {lastUpdated && <span>· updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      </div>

      <>
          <section className="kpi-grid dashboard-kpi-grid">
            <MetricCard icon={Users} label="Total contacts" value={contacts.total} detail={`+${contacts.new_this_week || 0} this week`} color="#5B9DFF" />
            <MetricCard icon={PhoneCall} label="Voice interactions" value={calls.total} detail={`${Math.round(Number(calls.avg_duration || 0))}s avg duration`} color="#14B8A6" />
            <MetricCard icon={MessageSquare} label="WhatsApp messages" value={whatsapp.total} detail={`${whatsapp.received || 0} inbound received`} color="#22C55E" />
            <MetricCard icon={Briefcase} label="Pipeline value" value={`₹${((Number(deals.total_value) || 0) / 100000).toFixed(1)}L`} detail={`${deals.won || 0} won · ${conversion}% win rate`} color="#A78BFA" />
          </section>

          <section className="dashboard-grid-main">
            <div className="card chart-card">
              <SectionHeading
                icon={Activity}
                eyebrow="Live telemetry"
                title="Channel activity"
                action={
                  <div className="range-switcher">
                    {[7, 30].map((days) => <button key={days} className={range === days ? 'active' : ''} onClick={() => setRange(days)}>{days}D</button>)}
                  </div>
                }
              />
              <div className="channel-filters">
                {Object.entries(CHANNELS).map(([key, channel]) => (
                  <button key={key} className={activeChannels.includes(key) ? 'selected' : ''} onClick={() => toggleChannel(key)}>
                    <span style={{ background: channel.color }} /> {channel.label}
                    {activeChannels.includes(key) ? <X size={11} /> : null}
                  </button>
                ))}
              </div>
              <div className="chart-summary"><strong>{activityTotal.toLocaleString('en-IN')}</strong> interactions in selected window</div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <defs>{Object.entries(CHANNELS).map(([key, channel]) => (
                    <linearGradient key={key} id={`dashboard-gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={channel.color} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={channel.color} stopOpacity={0} />
                    </linearGradient>
                  ))}</defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tickFormatter={(date) => date.slice(5)} tick={{ fontSize: 10, fill: '#6F809B' }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#6F809B' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#111722', border: '1px solid #243044', borderRadius: 8 }} />
                  {activeChannels.map((key) => <Area key={key} type="monotone" dataKey={key} name={CHANNELS[key].label} stroke={CHANNELS[key].color} fill={`url(#dashboard-gradient-${key})`} strokeWidth={2} animationDuration={700} />)}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card pipeline-card">
              <SectionHeading icon={Briefcase} eyebrow="Revenue engine" title="Pipeline signal" action={<span className="live-badge"><span /> live</span>} />
              <div className="pipeline-total"><span>₹{((Number(deals.total_value) || 0) / 100000).toFixed(1)}L</span><small>total tracked value</small></div>
              {[
                ['New leads', Number(deals.total || 0) - Number(deals.won || 0) - Number(deals.lost || 0), '#5B9DFF'],
                ['Won', Number(deals.won || 0), '#34D399'],
                ['Lost', Number(deals.lost || 0), '#EF4444'],
              ].map(([label, count, color]) => {
                const percent = deals.total ? Math.round((count / Number(deals.total)) * 100) : 0;
                return <div className="pipeline-row" key={label}>
                  <div><span>{label}</span><strong>{count}</strong></div>
                  <div className="pipeline-track"><span style={{ width: `${percent}%`, background: color }} /></div>
                  <small>{percent}% of deals</small>
                </div>;
              })}
              <div className="pipeline-footer"><Clock3 size={14} /> Conversion is calculated from live deal records.</div>
            </div>
          </section>
      </>

      {showSystemDetails && (
        <section className="system-details-panel">
          <div className="system-details-header">
            <SectionHeading icon={FileCode2} eyebrow="System map" title="Technical system details" action={<button className="icon-button" onClick={() => setShowSystemDetails(false)} aria-label="Close system details"><X size={15} /></button>} />
            <p>Runtime specifications and integration throughput for the current deployment.</p>
          </div>
          <div className="card technical-metrics">
          <SectionHeading icon={Activity} eyebrow="Runtime metrics" title="Integration throughput" />
          <div className="spec-grid">
            <div><span>Inbound calls</span><strong>{calls.inbound || 0}</strong><small>direction = inbound</small></div>
            <div><span>Outbound calls</span><strong>{calls.outbound || 0}</strong><small>direction = outbound</small></div>
            <div><span>Email events</span><strong>{kpis.emails?.total || 0}</strong><small>SMTP / IMAP records</small></div>
            <div><span>SMS events</span><strong>{kpis.sms?.total || 0}</strong><small>provider messages</small></div>
          </div>
          </div>
        <section className="architecture-section">
          <SectionHeading icon={FileCode2} eyebrow="System map" title="Technical architecture" action={<span className="section-hint">click a module for specs</span>} />
          <div className="architecture-grid">
            {ARCHITECTURE.map(({ icon: Icon, title, value, detail, specs }, index) => {
              const expanded = expandedArchitecture === index;
              return <button className={`architecture-card ${expanded ? 'expanded' : ''}`} key={title} onClick={() => setExpandedArchitecture(expanded ? null : index)}>
                <div className="architecture-icon"><Icon size={18} /></div>
                <div className="architecture-copy"><span>{title}</span><strong>{value}</strong><p>{detail}</p></div>
                <ChevronDown size={15} className="architecture-chevron" />
                {expanded && <div className="architecture-specs">{specs.map((spec) => <span key={spec}><CheckCircle2 size={12} /> {spec}</span>)}</div>}
              </button>;
            })}
          </div>
        </section>
        </section>
      )}
    </div>
  );
}
