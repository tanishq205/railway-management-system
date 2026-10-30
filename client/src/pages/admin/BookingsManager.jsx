import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpenCheck, Search, Filter, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

export default function BookingsManager() {
  const { authFetch } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [pnrFilter, setPnrFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/api/bookings/all';
      const params = [];
      if (pnrFilter) params.push(`pnr=${encodeURIComponent(pnrFilter)}`);
      if (dateFilter) params.push(`date=${encodeURIComponent(dateFilter)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await authFetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error fetching bookings.');

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

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchBookings();
  };

  const clearFilters = () => {
    setPnrFilter('');
    setDateFilter('');
    setTimeout(fetchBookings, 50);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--navy-900)' }}>Reservations & Waitlist Ledger</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            System-wide ticket headers, passenger states (Confirmed, Waitlisted, Cancelled), and payment settlements.
          </p>
        </div>
        <button onClick={fetchBookings} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <div className="alert alert-danger"><AlertCircle size={18} /><span>{error}</span></div>}

      {/* Filter Box */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label className="form-label">Filter by PNR</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. PNR8492013"
              value={pnrFilter}
              onChange={(e) => setPnrFilter(e.target.value.toUpperCase())}
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <label className="form-label">Filter by Service Date</label>
            <input
              type="date"
              className="form-control"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary">
              <Filter size={15} />
              <span>Filter</span>
            </button>
            <button type="button" onClick={clearFilters} className="btn btn-outline">
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Bookings Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>PNR</th>
              <th>Booked At</th>
              <th>Booker Account</th>
              <th>Train</th>
              <th>Service Date</th>
              <th>Route</th>
              <th>Passenger Breakdown</th>
              <th>Fare (INR)</th>
              <th>Payment</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '24px' }}>Loading reservations...</td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '24px' }}>No bookings matching criteria.</td></tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.PNR}>
                  <td>
                    <Link to={`/pnr-status?pnr=${b.PNR}`} style={{ fontWeight: 800, fontFamily: 'monospace' }}>
                      {b.PNR}
                    </Link>
                  </td>
                  <td>{new Date(b.Booking_Date).toLocaleString()}</td>
                  <td>{b.Booker_Email}</td>
                  <td><strong>{b.Train_Name}</strong></td>
                  <td>{b.Service_Date}</td>
                  <td>{b.From_Code} &rarr; {b.To_Code}</td>
                  <td>
                    <div style={{ fontSize: '0.82rem' }}>
                      {b.Confirmed_Passengers > 0 && (
                        <span className="badge badge-confirmed" style={{ marginRight: '4px' }}>
                          {b.Confirmed_Passengers} CNF
                        </span>
                      )}
                      {b.Waitlisted_Passengers > 0 && (
                        <span className="badge badge-waitlisted" style={{ marginRight: '4px' }}>
                          {b.Waitlisted_Passengers} WL
                        </span>
                      )}
                      {b.Cancelled_Passengers > 0 && (
                        <span className="badge badge-cancelled">
                          {b.Cancelled_Passengers} CAN
                        </span>
                      )}
                    </div>
                  </td>
                  <td><strong>₹{parseFloat(b.Total_Amount).toFixed(2)}</strong></td>
                  <td>
                    <span className={`badge ${b.Latest_Payment_Status === 'SUCCESS' ? 'badge-confirmed' : 'badge-waitlisted'}`}>
                      {b.Latest_Payment_Status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/pnr-status?pnr=${b.PNR}`} className="btn btn-outline btn-sm">
                      <span>Inspect</span>
                      <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
