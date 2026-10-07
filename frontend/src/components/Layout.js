import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, Bell, HardDrive } from 'lucide-react';

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-title">
            HackQubit Omnichannel Console
          </div>

          <div className="search-bar">
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input placeholder="Search timeline, contacts, communications..." />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', 
              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', color: '#10B981', fontWeight: '500' 
            }}>
              <HardDrive size={13} />
              <span>S3 Storage Active</span>
            </div>
            <button style={{
              width: '34px', height: '34px', borderRadius: '8px', background: 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', 
              color: 'var(--text-secondary)', cursor: 'pointer'
            }} title="Notifications">
              <Bell size={15} />
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
