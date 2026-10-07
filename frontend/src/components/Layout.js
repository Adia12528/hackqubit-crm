import React from 'react';
import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, Bell, HardDrive, Command, ChevronDown } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const pageNames = {
    dashboard: ['Overview', 'Your operating picture at a glance'],
    contacts: ['Customers', 'Every relationship, in one place'],
    deals: ['Deals & Pipeline', 'Move opportunities forward'],
    tasks: ['Tasks', 'Keep the team moving'],
    inbox: ['Unified Inbox', 'Every conversation, one calm workspace'],
    whatsapp: ['WhatsApp Cloud', 'Business messaging, connected'],
    calls: ['Voice & Calls', 'Make every conversation count'],
    omnichannel: ['Email & SMS Gateway', 'Reach customers on their preferred channel'],
    campaigns: ['Campaigns', 'Turn audiences into action'],
    offers: ['Commercial Offers', 'Create offers that convert'],
    templates: ['Message Templates', 'Consistent communication at scale'],
    users: ['Roles & RBAC', 'Manage your team and permissions'],
  };
  const currentPage = pageNames[location.pathname.split('/')[1]] || pageNames.dashboard;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-context">
            <div className="topbar-title">{currentPage[0]}</div>
            <div className="topbar-subtitle">{currentPage[1]}</div>
          </div>

          <div className="search-bar">
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input placeholder="Search timeline, contacts, communications..." />
            <span className="search-shortcut"><Command size={11} /> K</span>
          </div>

          <div className="topbar-actions">
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)', 
              padding: '6px 10px', borderRadius: '999px', fontSize: '11px', color: '#6ee7b7', fontWeight: '600' 
            }}>
              <HardDrive size={13} />
              <span className="storage-label">Storage online</span>
            </div>
            <button style={{
              width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', 
              color: 'var(--text-secondary)', cursor: 'pointer'
            }} title="Notifications">
              <Bell size={15} />
            </button>
            <button className="topbar-account" title="Account menu">
              <span className="topbar-avatar">A</span>
              <ChevronDown size={13} />
            </button>
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
