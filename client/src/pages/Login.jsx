import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle, ShieldAlert, User, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillAdmin = () => {
    setEmail('admin@railway.gov.in');
    setPassword('admin123');
  };

  const fillPassenger = () => {
    setEmail('rahul.sharma@example.com');
    setPassword('password123');
  };

  return (
    <div className="page-wrapper auth-page-wrapper">
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column', gap: '6px' }}>
          <h2 className="card-title" style={{ fontSize: '1.4rem' }}>
            <LogIn size={22} style={{ color: 'var(--rail-red)' }} />
            Account Login
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Sign in to access ticket booking, PNR history, or administrative tools
          </p>
        </div>

        <div className="card-body">
          {error && (
            <div className="alert alert-danger">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
              <LogIn size={16} />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Quick Demo Credentials Fill Buttons */}
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>
              Quick Fill Demo Accounts (DBMS Viva):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={fillAdmin}
                className="btn btn-outline btn-sm"
                style={{ borderColor: 'var(--navy-700)', color: 'var(--navy-700)' }}
              >
                <ShieldCheck size={14} />
                <span>Admin Demo</span>
              </button>
              <button
                type="button"
                onClick={fillPassenger}
                className="btn btn-outline btn-sm"
              >
                <User size={14} />
                <span>Passenger Demo</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', background: 'var(--bg-card-subtle)', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.85rem' }}>
          Don't have an account yet? <Link to="/register" style={{ fontWeight: 600 }}>Create New Account</Link>
        </div>
      </div>
    </div>
  );
}
