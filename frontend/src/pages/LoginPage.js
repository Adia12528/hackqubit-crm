import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Layers, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@hackqubit.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Signed in successfully');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
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
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '44px', height: '44px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            color: 'var(--blue)',
          }}>
            <Layers size={22} strokeWidth={2.2} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            HackQubit CRM
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Enterprise Customer Relationship Portal
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '28px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@hackqubit.com"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '22px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={13} style={{ color: 'var(--text-muted)' }} />
                <span>Password</span>
              </label>
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
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '14px', fontWeight: '600' }}
              disabled={loading}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              {!loading && <ArrowRight size={15} style={{ marginLeft: '6px' }} />}
            </button>
          </form>

          {/* Quick Access Info */}
          <div style={{
            marginTop: '20px', padding: '12px 14px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: '4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <ShieldCheck size={12} color="#10B981" />
              <span>Default Administrator Access</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              admin@hackqubit.com • Admin@123
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Self-Hosted Unified Communications Platform
        </div>
      </div>
    </div>
  );
}
