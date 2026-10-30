import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, AlertCircle } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState('MALE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await register({ email, password, name, age: parseInt(age, 10), gender });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper auth-page-wrapper">
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column', gap: '6px' }}>
          <h2 className="card-title" style={{ fontSize: '1.4rem' }}>
            <UserPlus size={22} style={{ color: 'var(--rail-red)' }} />
            Passenger Registration
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Register your passenger profile to book and manage railway reservations
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
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Ramesh Chandra Verma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Age</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="form-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password (Min 6 Characters)</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
              <UserPlus size={16} />
              <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
            </button>
          </form>
        </div>

        <div style={{ padding: '16px 24px', background: 'var(--bg-card-subtle)', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.85rem' }}>
          Already registered? <Link to="/login" style={{ fontWeight: 600 }}>Log In Here</Link>
        </div>
      </div>
    </div>
  );
}
