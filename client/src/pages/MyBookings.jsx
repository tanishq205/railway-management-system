import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { History, Ticket, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

export default function MyBookings() {
  const { authFetch } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/bookings/my');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error fetching bookings.');
      }
      setBookings(data.bookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={24} style={{ color: 'var(--rail-red)' }} />
            My Ticket Bookings
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            View your reservation history, track seat allocations, and manage cancellations.
          </p>
        </div>
        <button onClick={fetchBookings} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <p>Loading your reservations...</p>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <Ticket size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <h3>No Bookings Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '8px 0 16px' }}>
            You haven't reserved any railway tickets yet.
          </p>
          <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex' }}>
            Search & Book Trains
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>PNR</th>
                <th>Booking Date</th>
                <th>Train Details</th>
                <th>Service Date</th>
                <th>Route</th>
                <th>Passengers</th>
                <th>Total Fare</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.PNR}>
                  <td>
                    <Link to={`/pnr-status?pnr=${b.PNR}`} style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--navy-700)' }}>
                      {b.PNR}
                    </Link>
                  </td>
                  <td>{new Date(b.Booking_Date).toLocaleDateString()}</td>
                  <td>
                    <strong>{b.Train_Name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.Train_Type}</div>
                  </td>
                  <td>{b.Service_Date}</td>
                  <td>
                    <strong>{b.From_Code} &rarr; {b.To_Code}</strong>
                  </td>
                  <td>
                    <div>Total: {b.Passenger_Count}</div>
                    <div style={{ fontSize: '0.75rem' }}>
                      {b.Confirmed_Count > 0 && <span style={{ color: 'var(--confirmed-green)', fontWeight: 600 }}>{b.Confirmed_Count} Confirmed </span>}
                      {b.Waitlisted_Count > 0 && <span style={{ color: 'var(--waitlist-amber)', fontWeight: 600 }}>{b.Waitlisted_Count} WL </span>}
                      {b.Cancelled_Count > 0 && <span style={{ color: 'var(--cancelled-red)', fontWeight: 600 }}>{b.Cancelled_Count} Cancelled</span>}
                    </div>
                  </td>
                  <td>
                    <strong>₹{parseFloat(b.Total_Amount).toFixed(2)}</strong>
                  </td>
                  <td>
                    <span className={`badge ${b.Payment_Status === 'SUCCESS' ? 'badge-confirmed' : 'badge-waitlisted'}`}>
                      {b.Payment_Status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/pnr-status?pnr=${b.PNR}`} className="btn btn-outline btn-sm">
                      <span>View</span>
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
