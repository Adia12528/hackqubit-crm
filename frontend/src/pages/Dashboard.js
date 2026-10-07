import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { format, subDays } from 'date-fns';

// Mock data for demo (fallback when API not connected)
const MOCK_STATS = {
  kpis: {
    contacts: { total: 1248, leads: 342, customers: 586, new_this_week: 43 },
    calls: { total: 2847, avg_duration: 287, inbound: 1231, outbound: 1616, this_week: 215 },
    whatsapp: { total: 4523, received: 2100 },
    emails: { total: 892 },
    sms: { total: 1203 },
    deals: { total: 37, total_value: 4850000, won: 18, lost: 5 },
  },
  channelActivity: Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'MMM dd'),
    call: Math.floor(Math.random() * 40 + 10),
    whatsapp: Math.floor(Math.random() * 80 + 20),
    email: Math.floor(Math.random() * 30 + 5),
    sms: Math.floor(Math.random() * 20 + 3),
  })),
  topAgents: [
    { full_name: 'Arjun Mehta', calls: 142, whatsapp_msgs: 89 },
    { full_name: 'Priya Singh', calls: 118, whatsapp_msgs: 203 },
    { full_name: 'Rahul Sharma', calls: 97, whatsapp_msgs: 67 },
  ],
};

function KPICard({ icon, label, value, change, color }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color }}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-value">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</div>
      <div className="kpi-label">{label}</div>
      {change && (
        <div className={`kpi-change ${change > 0 ? 'up' : 'down'}`}>
          {change > 0 ? '↑' : '↓'} {Math.abs(change)}% vs last week
        </div>
      )}
    </div>
  );
}

const CHANNEL_COLORS = {
  call: '#10B981', whatsapp: '#25D366', email: '#3B82F6', sms: '#F59E0B'
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(MOCK_STATS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(({ data }) => setStats(data))
      .catch(() => {}); // fallback to mock
  }, []);

  const kpis = stats?.kpis || {};

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08))',
        border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>
            Welcome back, {user?.full_name?.split(' ')[0]}! 👋
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className={`role-badge ${user?.role}`}>{user?.role?.replace('_', ' ')}</span>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            {kpis.calls?.this_week} calls this week
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KPICard icon="👥" label="Total Contacts" value={kpis.contacts?.total} change={5} color="#3B82F6" />
        <KPICard icon="📞" label="Calls Made" value={kpis.calls?.total} change={12} color="#10B981" />
        <KPICard icon="💬" label="WhatsApp Messages" value={kpis.whatsapp?.total} change={8} color="#25D366" />
        <KPICard icon="💰" label="Active Deals" value={kpis.deals?.total} change={3} color="#8B5CF6" />
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        {/* Channel Activity Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Channel Activity (30 Days)</div>
              <div className="card-subtitle">Interactions across all channels</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats?.channelActivity || []}>
              <defs>
                {Object.entries(CHANNEL_COLORS).map(([key, color]) => (
                  <linearGradient key={key} id={`grad_${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#1C2545', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#F1F5F9' }}
              />
              {Object.entries(CHANNEL_COLORS).map(([key, color]) => (
                <Area key={key} type="monotone" dataKey={key} stroke={color} fill={`url(#grad_${key})`} strokeWidth={2} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
            {Object.entries(CHANNEL_COLORS).map(([key, color]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </div>
            ))}
          </div>
        </div>

        {/* Deals Pipeline Summary */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Deal Pipeline</div>
              <div className="card-subtitle">₹{((kpis.deals?.total_value || 0) / 100000).toFixed(1)}L total value</div>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            {[
              { stage: 'New Leads', count: 12, color: '#3B82F6', pct: 32 },
              { stage: 'Qualified', count: 8, color: '#8B5CF6', pct: 22 },
              { stage: 'Proposal', count: 9, color: '#F59E0B', pct: 24 },
              { stage: 'Negotiation', count: 5, color: '#F97316', pct: 14 },
              { stage: 'Won', count: kpis.deals?.won || 18, color: '#10B981', pct: 8 },
            ].map(item => (
              <div key={item.stage} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{item.stage}</span>
                  <span style={{ color: item.color, fontWeight: '700' }}>{item.count}</span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: '999px', transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#10B981' }}>{kpis.deals?.won || 18}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Won</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#EF4444' }}>{kpis.deals?.lost || 5}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lost</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-2">
        {/* Quick Stats */}
        <div className="card">
          <div className="card-header"><div className="card-title">Communication Overview</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { icon: '📞', label: 'Avg Call Duration', value: `${Math.floor((kpis.calls?.avg_duration || 287) / 60)}m ${(kpis.calls?.avg_duration || 287) % 60}s`, color: '#10B981' },
              { icon: '📨', label: 'Emails Sent', value: kpis.emails?.total || 892, color: '#3B82F6' },
              { icon: '📱', label: 'SMS Sent', value: kpis.sms?.total || 1203, color: '#F59E0B' },
              { icon: '⬆️', label: 'Outbound Calls', value: kpis.calls?.outbound || 1616, color: '#8B5CF6' },
            ].map(item => (
              <div key={item.label} style={{
                background: 'var(--bg-secondary)', borderRadius: '10px', padding: '14px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: item.color }}>{item.value?.toLocaleString?.() || item.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Agents */}
        <div className="card">
          <div className="card-header"><div className="card-title">Top Performers</div></div>
          {(stats?.topAgents || []).map((agent, i) => (
            <div key={agent.full_name} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 0',
              borderBottom: i < stats.topAgents.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: ['#3B82F6', '#8B5CF6', '#10B981'][i],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '14px', color: 'white',
              }}>
                {agent.full_name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>{agent.full_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {agent.calls} calls • {agent.whatsapp_msgs} WhatsApp
                </div>
              </div>
              <div style={{
                background: 'rgba(59,130,246,0.1)',
                color: '#3B82F6', fontWeight: '700', fontSize: '12px',
                padding: '3px 8px', borderRadius: '999px',
              }}>#{i + 1}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
