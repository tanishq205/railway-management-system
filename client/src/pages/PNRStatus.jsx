import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Ticket, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  RefreshCw, 
  Printer, 
  UserX,
  CreditCard,
  Mail 
} from 'lucide-react';
import EmailModal from '../components/EmailModal';

export default function PNRStatus() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPnr = searchParams.get('pnr') || '';

  const { user, authFetch } = useAuth();
  const [pnrInput, setPnrInput] = useState(initialPnr);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancelMessage, setCancelMessage] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);

  const fetchPnr = async (pnrToQuery) => {
    const cleanPnr = (pnrToQuery || pnrInput).trim().toUpperCase();
    if (!cleanPnr) return;

    setError('');
    setCancelMessage('');
    setLoading(true);

    try {
      const res = await fetch(`/api/bookings/pnr/${cleanPnr}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'PNR not found.');
      }

      setBooking(data.booking);
      setSearchParams({ pnr: cleanPnr });
    } catch (err) {
      setError(err.message);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPnr) {
      fetchPnr(initialPnr);
    }
  }, [initialPnr]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPnr(pnrInput);
  };

  const handleCancelPassenger = async (detailId, passengerName) => {
    if (!window.confirm(`Are you sure you want to cancel the ticket for passenger "${passengerName}"?`)) {
      return;
    }

    try {
      const res = await authFetch('/api/bookings/cancel', {
        method: 'POST',
        body: JSON.stringify({
          pnr: booking.pnr,
          detailId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Cancellation failed.');
      }

      let msg = data.message;
      if (data.promotions && data.promotions.length > 0) {
        msg += ` 🎯 [DBMS Waitlist Promotion] Waitlisted passenger ${data.promotions[0].promotedPassenger} was automatically promoted to CONFIRMED!`;
      }
      setCancelMessage(msg);
      // Re-fetch updated PNR status
      fetchPnr(booking.pnr);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '900px' }}>
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h2 className="card-title">
            <Ticket size={22} style={{ color: 'var(--rail-red)' }} />
            Check PNR Reservation Status
          </h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSearchSubmit} className="pnr-search-form" style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Enter 10-Character PNR (e.g., PNR8492013)"
              value={pnrInput}
              onChange={(e) => setPnrInput(e.target.value)}
              required
              style={{ fontSize: '1.1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '150px' }}>
              <Search size={18} />
              <span>{loading ? 'Searching...' : 'Get Status'}</span>
            </button>
          </form>

          {/* Quick Demo PNR Suggestions */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>DEMO PNRs:</span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => { setPnrInput('PNR8492013'); fetchPnr('PNR8492013'); }}
            >
              PNR8492013 (Confirmed Multi-Pax)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => { setPnrInput('PNR7381920'); fetchPnr('PNR7381920'); }}
            >
              PNR7381920 (Waitlisted)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => { setPnrInput('PNR9920145'); fetchPnr('PNR9920145'); }}
            >
              PNR9920145 (Cancelled)
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {cancelMessage && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{cancelMessage}</span>
        </div>
      )}

      {/* Ticket Details Slip */}
      {booking && (
        <div className="ticket-slip">
          {/* Header Banner */}
          <div className="ticket-pnr-banner">
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8' }}>PNR NUMBER</div>
              <div className="ticket-pnr-code">{booking.pnr}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`badge ${
                booking.paymentStatus === 'SUCCESS' ? 'badge-confirmed' : 
                booking.paymentStatus === 'REFUNDED' ? 'badge-waitlisted' : 'badge-cancelled'
              }`}>
                Payment: {booking.paymentStatus || 'COMPLETED'}
              </span>
              <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#cbd5e1' }}>
                Booked On: {new Date(booking.bookingDate).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Journey Overview */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            background: 'var(--bg-card-subtle)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TRAIN</div>
              <div style={{ fontWeight: 700, color: 'var(--heading-color)' }}>{booking.train.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Type: {booking.train.type} (Train #{booking.train.id})</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>JOURNEY DATE & STATUS</div>
              <div style={{ fontWeight: 700, color: 'var(--heading-color)' }}>{booking.run.serviceDate}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--confirmed-green)' }}>Run Status: {booking.run.runStatus}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ROUTE</div>
              <div style={{ fontWeight: 700, color: 'var(--heading-color)' }}>
                {booking.route.fromCode} &rarr; {booking.route.toCode}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {booking.route.fromName} to {booking.route.toName}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TOTAL FARE PAID</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--heading-color)', fontFamily: 'Outfit' }}>
                ₹{parseFloat(booking.totalAmount).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Booker: {booking.bookerEmail}</div>
            </div>
          </div>

          {/* Passenger & Seating List */}
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--heading-color)' }}>
            Passenger List & Seat Allocations
          </h3>

          <div className="table-container" style={{ marginBottom: '20px' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Passenger Name</th>
                  <th>Age / Gender</th>
                  <th>Coach</th>
                  <th>Seat Number</th>
                  <th>Current Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {booking.passengers.map((p) => (
                  <tr key={p.detailId}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.age} Yrs • {p.gender}</td>
                    <td>{p.coachType || '—'}</td>
                    <td>
                      {p.seatNumber ? (
                        <strong style={{ color: 'var(--heading-color)' }}>{p.seatNumber}</strong>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Not Allocated</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${
                        p.status === 'CONFIRMED' ? 'badge-confirmed' :
                        p.status === 'WAITLISTED' ? 'badge-waitlisted' : 'badge-cancelled'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => handleCancelPassenger(p.detailId, p.name)}
                          className="btn btn-danger-outline btn-sm"
                          title="Cancel ticket for this passenger"
                        >
                          <UserX size={14} />
                          <span>Cancel Ticket</span>
                        </button>
                      )}
                      {p.status === 'CANCELLED' && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cancelled & Refunded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              * Cancellations trigger real-time waitlist seat promotion in an atomic Supabase PostgreSQL transaction.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={() => setShowEmailModal(true)} 
                className="btn btn-outline btn-sm" 
                style={{ borderColor: 'var(--rail-red)', color: 'var(--rail-red)', fontWeight: 600 }}
              >
                <Mail size={15} />
                <span>View Confirmation Email</span>
              </button>
              <button onClick={() => window.print()} className="btn btn-outline btn-sm">
                <Printer size={15} />
                <span>Print Ticket</span>
              </button>
              <button onClick={() => fetchPnr(booking.pnr)} className="btn btn-outline btn-sm">
                <RefreshCw size={15} />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>

          {showEmailModal && (
            <EmailModal
              pnr={booking.pnr}
              onClose={() => setShowEmailModal(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
