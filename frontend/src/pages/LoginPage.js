import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@hackqubit.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Background Glow */}
      <div style={{
        position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px', height: '60px',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '28px', fontWeight: '800', color: 'white',
            boxShadow: '0 0 30px rgba(59,130,246,0.3)',
          }}>Q</div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px' }}>HackQubit CRM</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Omnichannel Customer Intelligence</p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@hackqubit.com"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
              disabled={loading}
            >
              {loading ? '🔄 Signing in...' : '🚀 Sign In'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div style={{
            marginTop: '20px', padding: '12px',
            background: 'rgba(59,130,246,0.08)',
            borderRadius: '10px', border: '1px solid rgba(59,130,246,0.15)',
          }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo Credentials</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📧 admin@hackqubit.com</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>🔑 Admin@123</p>
          </div>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {['📞 Voice WebRTC', '💬 WhatsApp', '📧 Email', '💬 SMS', '🔐 5-Tier RBAC'].map(f => (
            <span key={f} style={{
              fontSize: '11px', color: 'var(--text-muted)',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              padding: '4px 10px', borderRadius: '999px',
            }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
