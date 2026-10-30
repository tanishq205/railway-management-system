import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Armchair, Plus, Wrench, CheckCircle2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function CoachSeatManager() {
  const { authFetch } = useAuth();
  const [trains, setTrains] = useState([]);
  const [selectedTrainId, setSelectedTrainId] = useState('');
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add coach form
  const [coachType, setCoachType] = useState('AC3');
  const [seatCount, setSeatCount] = useState(6);

  useEffect(() => {
    fetch('/api/trains')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.trains.length > 0) {
          setTrains(data.trains);
          setSelectedTrainId(data.trains[0].Train_ID);
        }
      });
  }, []);

  const fetchCoaches = async (trainId) => {
    if (!trainId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/coaches/${trainId}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error fetching coaches.');
      setCoaches(data.coaches);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTrainId) {
      fetchCoaches(selectedTrainId);
    }
  }, [selectedTrainId]);

  const handleAddCoach = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await authFetch('/api/coaches', {
        method: 'POST',
        body: JSON.stringify({
          trainId: selectedTrainId,
          coachType,
          seatCount: parseInt(seatCount, 10)
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error creating coach.');

      setSuccess(data.message);
      fetchCoaches(selectedTrainId);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleSeatCondition = async (seatId, currentCondition) => {
    const newCondition = currentCondition === 'OPERATIONAL' ? 'UNDER_REPAIR' : 'OPERATIONAL';
    setError('');
    setSuccess('');

    try {
      const res = await authFetch(`/api/coaches/seats/${seatId}/condition`, {
        method: 'PUT',
        body: JSON.stringify({ physicalCondition: newCondition })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error updating seat.');

      setSuccess(data.message);
      fetchCoaches(selectedTrainId);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--navy-900)' }}>Rolling Stock & Seat Maintenance</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage coaches, derived capacity counts, and seat physical repair conditions.
          </p>
        </div>
        <button onClick={() => fetchCoaches(selectedTrainId)} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <div className="alert alert-danger"><AlertCircle size={18} /><span>{error}</span></div>}
      {success && <div className="alert alert-success"><CheckCircle size={18} /><span>{success}</span></div>}

      {/* Train Selector */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label className="form-label" style={{ margin: 0 }}>Select Train Fleet Entity:</label>
          <select
            className="form-select"
            value={selectedTrainId}
            onChange={(e) => setSelectedTrainId(e.target.value)}
            style={{ maxWidth: '400px' }}
          >
            {trains.map((t) => (
              <option key={t.Train_ID} value={t.Train_ID}>
                #{t.Train_ID} — {t.Name} ({t.Type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Coach Form */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">
            <Plus size={18} style={{ color: 'var(--rail-red)' }} />
            Add Coach to Train
          </h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleAddCoach}>
            <div className="form-row">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Coach Class / Type</label>
                <select
                  className="form-select"
                  value={coachType}
                  onChange={(e) => setCoachType(e.target.value)}
                >
                  <option value="AC1">AC 1 Tier (First AC - AC1)</option>
                  <option value="AC2">AC 2 Tier (AC2)</option>
                  <option value="AC3">AC 3 Tier (AC3)</option>
                  <option value="CC">AC Chair Car (CC)</option>
                  <option value="EC">Executive Chair Car (EC)</option>
                  <option value="SL">Sleeper Class (SL)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Initial Physical Seats</label>
                <input
                  type="number"
                  className="form-control"
                  min="2"
                  max="30"
                  value={seatCount}
                  onChange={(e) => setSeatCount(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px' }}>
                  <Plus size={16} /> Attach Coach
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Coaches & Seats Display */}
      {loading ? (
        <p>Loading rolling stock...</p>
      ) : coaches.length === 0 ? (
        <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
          <Armchair size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
          <p>No coaches registered for this train entity yet. Add a coach above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {coaches.map((coach) => (
            <div key={coach.Coach_ID} className="card">
              <div className="card-header" style={{ background: 'var(--bg-card-subtle)' }}>
                <div>
                  <h3 className="card-title" style={{ fontSize: '1.1rem' }}>
                    <Armchair size={18} style={{ color: 'var(--navy-600)' }} />
                    Coach #{coach.Coach_ID} — Type: <strong>{coach.Coach_Type}</strong>
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Total Seats: <strong>{coach.totalSeats}</strong> • Operational: <strong style={{ color: 'var(--confirmed-green)' }}>{coach.operationalSeats}</strong> • Under Repair: <strong style={{ color: 'var(--waitlist-amber)' }}>{coach.underRepairSeats}</strong>
                  </div>
                </div>
                <span className="badge badge-operational">
                  Capacity: {coach.totalSeats} Seats (Derived via SQL COUNT)
                </span>
              </div>

              <div className="card-body">
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Click on any seat to toggle its physical maintenance state between <strong>OPERATIONAL</strong> and <strong>UNDER_REPAIR</strong>.
                  Marking a seat under repair automatically locks it and sets status to <strong>BLOCKED</strong> in future train runs!
                </div>

                {/* Grid of physical seats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '12px'
                }}>
                  {coach.seats.map((seat) => {
                    const isRepair = seat.Physical_Condition === 'UNDER_REPAIR';
                    return (
                      <div
                        key={seat.Seat_ID}
                        onClick={() => toggleSeatCondition(seat.Seat_ID, seat.Physical_Condition)}
                        style={{
                          border: `2px solid ${isRepair ? 'var(--waitlist-border)' : 'var(--confirmed-border)'}`,
                          backgroundColor: isRepair ? 'var(--waitlist-bg)' : 'var(--confirmed-bg)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Click to mark ${isRepair ? 'OPERATIONAL' : 'UNDER REPAIR'}`}
                      >
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--heading-color)' }}>
                          {seat.Seat_Number}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          marginTop: '4px',
                          color: isRepair ? '#b45309' : '#047857'
                        }}>
                          {isRepair ? <Wrench size={12} /> : <CheckCircle2 size={12} />}
                          <span>{isRepair ? 'UNDER REPAIR' : 'OPERATIONAL'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
