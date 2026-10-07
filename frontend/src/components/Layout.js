import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user } = useAuth();

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
            <span>🔍</span>
            <input placeholder="Search across timeline, calls, customers..." />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', color: '#10B981', fontWeight: 'bold' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
              MinIO Storage: Connected
            </div>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', fontSize: '13px'
            }}>
              🔔
            </div>
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
