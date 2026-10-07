import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Layers, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      backgroundImage: 'radial-gradient(circle at 12% 18%, rgba(91,157,255,.2), transparent 26rem), radial-gradient(circle at 88% 82%, rgba(52,211,153,.11), transparent 24rem)',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px', height: '52px',
            background: 'var(--gradient-blue)',
            border: '1px solid rgba(145,195,255,.5)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            color: 'white',
            boxShadow: '0 12px 28px rgba(55,125,231,.32)',
          }}>
            <Layers size={22} strokeWidth={2.2} />
          </div>
          <h1 style={{ fontSize: '25px', fontWeight: '800', letterSpacing: '-0.04em', marginBottom: '6px' }}>
            HackQubit CRM
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            One workspace for every customer conversation
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '30px',
          boxShadow: '0 24px 70px rgba(0,0,0,.38), 0 0 0 1px rgba(117,157,220,.04)',
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
                placeholder="you@example.com"
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

        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Self-Hosted Unified Communications Platform
        </div>
      </div>
    </div>
  );
}
