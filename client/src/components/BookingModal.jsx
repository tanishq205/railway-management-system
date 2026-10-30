import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Trash2, ShieldCheck, AlertCircle, CheckCircle, CreditCard, Ticket, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmailModal from './EmailModal';

export default function BookingModal({ train, fromStation, toStation, journeyDate, onClose, onBookingSuccess }) {
  const { user, authFetch } = useAuth();
  
  const [passengers, setPassengers] = useState([
    { name: user?.passenger?.name || '', age: user?.passenger?.age || 28, gender: user?.passenger?.gender || 'MALE' }
  ]);
  const [simulatePaymentFail, setSimulatePaymentFail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingResult, setBookingResult] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const addPassenger = () => {
    if (passengers.length >= 6) {
      setError('A maximum of 6 passengers can be booked in a single PNR transaction.');
      return;
    }
    setPassengers([...passengers, { name: '', age: 25, gender: 'FEMALE' }]);
    setError('');
  };

  const removePassenger = (index) => {
    if (passengers.length === 1) return;
    setPassengers(passengers.filter((_, i) => i !== index));
    setError('');
  };

  const updatePassenger = (index, field, value) => {
    const updated = [...passengers];
    updated[index][field] = value;
    setPassengers(updated);
  };

  const farePerPassenger = train.demoFarePerPassenger || 450;
  const totalAmount = farePerPassenger * passengers.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    for (let i = 0; i < passengers.length; i++) {
      if (!passengers[i].name.trim()) {
        setError(`Please enter the name for Passenger #${i + 1}.`);
        return;
      }
      if (!passengers[i].age || parseInt(passengers[i].age, 10) <= 0) {
        setError(`Please enter a valid age for Passenger #${i + 1}.`);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await authFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          runId: train.Run_ID,
          fromStationId: fromStation.Station_ID,
          toStationId: toStation.Station_ID,
          passengers,
          simulatePaymentFail
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Booking transaction failed.');
      }

      setBookingResult(data.booking);
      if (onBookingSuccess) onBookingSuccess(data.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div>
            <h3 className="card-title" style={{ fontSize: '1.2rem' }}>
              <Ticket size={20} style={{ color: 'var(--rail-red)' }} />
              {bookingResult ? 'Booking Confirmation' : 'Passenger Ticket Reservation'}
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {train.Train_Name} ({train.Train_Type}) • Service Date: {journeyDate}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-danger">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {bookingResult ? (
            <div>
              <div style={{ textAlign: 'center', margin: '16px 0 20px' }}>
                <CheckCircle size={52} style={{ color: 'var(--confirmed-green)', marginBottom: '8px' }} />
                <h4 style={{ fontSize: '1.3rem', color: 'var(--heading-color)' }}>Ticket Reserved Successfully!</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Your ACID-compliant Supabase PostgreSQL transaction committed and seat locks were assigned.
                </p>
              </div>

              {/* Email Confirmation Alert Banner */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Mail size={22} style={{ color: '#16a34a' }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>
                      IRCTC E-Ticket Confirmation Email Dispatched!
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#15803d' }}>
                      Sent to <strong>{bookingResult.userEmail || user?.email}</strong>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(true)}
                  className="btn btn-outline btn-sm"
                  style={{ background: 'var(--bg-card)', borderColor: '#86efac', color: '#16a34a', fontWeight: 700 }}
                >
                  <Mail size={14} /> View E-Ticket Slip
                </button>
              </div>

              <div className="ticket-slip" style={{ marginBottom: '24px' }}>
                <div className="ticket-pnr-banner">
                  <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8' }}>Generated PNR</div>
                    <div className="ticket-pnr-code">{bookingResult.pnr}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-confirmed">Confirmed</span>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Total: ₹{bookingResult.totalAmount.toFixed(2)}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem', marginBottom: '16px' }}>
                  <div>
                    <strong>Origin:</strong> {fromStation.Name} ({fromStation.Station_Code})
                  </div>
                  <div>
                    <strong>Destination:</strong> {toStation.Name} ({toStation.Station_Code})
                  </div>
                </div>

                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Passenger</th>
                        <th>Age / Gender</th>
                        <th>Status</th>
                        <th>Coach / Seat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingResult.passengers.map((p, idx) => (
                        <tr key={idx}>
                          <td><strong>{p.name}</strong></td>
                          <td>{p.age} • {p.gender}</td>
                          <td>
                            <span className={`badge ${p.status === 'CONFIRMED' ? 'badge-confirmed' : 'badge-waitlisted'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            {p.seatNumber ? (
                              <strong>{p.coachType || 'AC'} - {p.seatNumber}</strong>
                            ) : (
                              <span style={{ color: 'var(--waitlist-amber)' }}>WL #{idx + 1}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(true)}
                  className="btn btn-outline"
                >
                  <Mail size={16} /> View Confirmation Email
                </button>
                <Link to={`/pnr-status?pnr=${bookingResult.pnr}`} className="btn btn-primary">
                  View Full PNR Details
                </Link>
                <button onClick={onClose} className="btn btn-outline">
                  Close
                </button>
              </div>

              {showEmailModal && (
                <EmailModal
                  pnr={bookingResult.pnr}
                  onClose={() => setShowEmailModal(false)}
                />
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Route Summary Card */}
              <div style={{
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                    {fromStation.Station_Code} &rarr; {toStation.Station_Code}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {fromStation.City} to {toStation.City}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Operational Seats</div>
                  <div style={{ fontWeight: 700, color: train.Available_Seats > 0 ? 'var(--confirmed-green)' : 'var(--waitlist-amber)' }}>
                    {train.Available_Seats > 0 ? `${train.Available_Seats} Seats Available` : 'Waitlist Eligible'}
                  </div>
                </div>
              </div>

              {/* Passengers Dynamic Form */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Passenger Details ({passengers.length}/6)</label>
                  <button type="button" onClick={addPassenger} className="btn btn-outline btn-sm">
                    <Plus size={14} /> Add Passenger
                  </button>
                </div>

                {passengers.map((p, idx) => (
                  <div key={idx} className="passenger-input-row" style={{
                    background: 'var(--bg-card)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '10px'
                  }}>
                    <div className="passenger-row-top" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 2 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '22px' }}>
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Full Name"
                        value={p.name}
                        onChange={(e) => updatePassenger(idx, 'name', e.target.value)}
                        required
                        style={{ flex: 1 }}
                      />
                    </div>

                    <div className="passenger-row-bottom">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Age"
                        value={p.age}
                        min="1"
                        max="120"
                        onChange={(e) => updatePassenger(idx, 'age', e.target.value)}
                        required
                        style={{ width: '70px' }}
                      />
                      <select
                        className="form-select"
                        value={p.gender}
                        onChange={(e) => updatePassenger(idx, 'gender', e.target.value)}
                        style={{ width: '110px' }}
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>

                      {passengers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePassenger(idx)}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--rail-red)', borderColor: 'var(--rail-red-light)', padding: '8px 10px' }}
                          title="Remove passenger"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Fare Calculation & ACID Simulation */}
              <div style={{
                background: 'var(--bg-card-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                marginBottom: '20px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                  <span>Fare ({passengers.length} × ₹{farePerPassenger}):</span>
                  <strong>₹{totalAmount.toFixed(2)}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  * Demo fare calculated dynamically based on route segments and train category.
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer', color: '#b91c1c' }}>
                    <input
                      type="checkbox"
                      checked={simulatePaymentFail}
                      onChange={(e) => setSimulatePaymentFail(e.target.checked)}
                    />
                    <strong>[DBMS Viva Demo] Simulate Payment Failure (Triggers ACID ROLLBACK)</strong>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={onClose} className="btn btn-outline" disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={loading}>
                  <CreditCard size={16} />
                  <span>{loading ? 'Processing Transaction...' : `Confirm & Pay ₹${totalAmount}`}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
