import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Train, 
  MapPin, 
  Users, 
  Calendar, 
  CheckCircle, 
  TrendingUp, 
  Percent, 
  RefreshCw, 
  AlertCircle,
  Armchair,
  BookOpenCheck,
  ScrollText,
  Terminal
} from 'lucide-react';

export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/admin/dashboard');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error fetching dashboard data.');
      }
      setStats(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--navy-900)' }}>Operations & Fleet Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Live railway operations, SQL aggregate performance metrics, and inventory monitoring.
          </p>
        </div>
        <button onClick={fetchDashboardData} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading || !stats ? (
        <p>Loading database metrics...</p>
      ) : (
        <>
          {/* Top Metric Cards Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon-wrapper stat-icon-blue">
                <Train size={24} />
              </div>
              <div>
                <div className="stat-val">{stats.totalTrains}</div>
                <div className="stat-label">Active Trains</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper stat-icon-amber">
                <MapPin size={24} />
              </div>
              <div>
                <div className="stat-val">{stats.totalStations}</div>
                <div className="stat-label">Railway Stations</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper stat-icon-gray">
                <Users size={24} />
              </div>
              <div>
                <div className="stat-val">{stats.totalUsers}</div>
                <div className="stat-label">Registered Passengers</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper stat-icon-green">
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="stat-val">₹{stats.totalRevenue.toLocaleString()}</div>
                <div className="stat-label">Total Revenue (INR)</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper stat-icon-purple">
                <CheckCircle size={24} />
              </div>
              <div>
                <div className="stat-val">{stats.confirmedPassengers}</div>
                <div className="stat-label">Confirmed Passengers</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper stat-icon-orange">
                <Percent size={24} />
              </div>
              <div>
                <div className="stat-val">{stats.occupancyPercentage}%</div>
                <div className="stat-label">Fleet Occupancy</div>
              </div>
            </div>
          </div>

          {/* Seat Capacity & Maintenance Breakdown */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">
                <Armchair size={20} style={{ color: 'var(--rail-red)' }} />
                Seat Inventory & Physical Maintenance Status
              </h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Total Run Allocations: <strong>{stats.seatBreakdown.total}</strong>
              </div>
            </div>
            <div className="card-body">
              {/* Visual Progress Bar */}
              {(() => {
                const total = stats.seatBreakdown.total || 1;
                const booked = stats.seatBreakdown.booked || 0;
                const available = stats.seatBreakdown.available || 0;
                const blocked = stats.seatBreakdown.blocked || 0;
                const bookedPct = (booked / total) * 100;
                const availPct = (available / total) * 100;
                const blockedPct = (blocked / total) * 100;

                return (
                  <>
                    <div style={{
                      height: '28px',
                      width: '100%',
                      display: 'flex',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '16px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card-subtle)'
                    }}>
                      {booked > 0 && (
                        <div 
                          style={{ 
                            width: `${bookedPct}%`, 
                            backgroundColor: 'var(--confirmed-green)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            padding: '0 4px',
                            minWidth: '6px'
                          }}
                          title={`Booked: ${booked} seats (${bookedPct.toFixed(1)}%)`}
                        >
                          {bookedPct >= 12 ? `${booked} Booked` : bookedPct >= 6 ? `${booked}` : ''}
                        </div>
                      )}
                      {available > 0 && (
                        <div 
                          style={{ 
                            width: `${availPct}%`, 
                            backgroundColor: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            padding: '0 4px',
                            minWidth: '6px'
                          }}
                          title={`Available: ${available} seats (${availPct.toFixed(1)}%)`}
                        >
                          {availPct >= 12 ? `${available} Available` : availPct >= 6 ? `${available}` : ''}
                        </div>
                      )}
                      {blocked > 0 && (
                        <div 
                          style={{ 
                            width: `${blockedPct}%`, 
                            backgroundColor: '#d97706',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            padding: '0 4px',
                            minWidth: '6px'
                          }}
                          title={`Blocked / Repair: ${blocked} seats (${blockedPct.toFixed(1)}%)`}
                        >
                          {blockedPct >= 12 ? `${blocked} Blocked` : blockedPct >= 6 ? `${blocked}` : ''}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--confirmed-green)', flexShrink: 0 }}></div>
                        <span><strong>{booked}</strong> Booked Seats <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>({bookedPct.toFixed(1)}%)</span></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#0284c7', flexShrink: 0 }}></div>
                        <span><strong>{available}</strong> Available for Reservation <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>({availPct.toFixed(1)}%)</span></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#d97706', flexShrink: 0 }}></div>
                        <span><strong>{blocked}</strong> Blocked / Under Repair <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>({blockedPct.toFixed(1)}%)</span></span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Recent Reservations Table */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">
                <BookOpenCheck size={20} style={{ color: 'var(--navy-700)' }} />
                Recent System Bookings
              </h3>
              <Link to="/admin/bookings" className="btn btn-outline btn-sm">
                View All Bookings
              </Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>PNR</th>
                      <th>Booking Date</th>
                      <th>Passenger / Email</th>
                      <th>Train</th>
                      <th>Service Date</th>
                      <th>Pax Count</th>
                      <th>Total Fare</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentBookings.map((b) => (
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
                        <td>{b.Passenger_Count} Passenger(s)</td>
                        <td><strong>₹{parseFloat(b.Total_Amount).toFixed(2)}</strong></td>
                        <td>
                          <span className={`badge ${b.Payment_Status === 'SUCCESS' ? 'badge-confirmed' : 'badge-waitlisted'}`}>
                            {b.Payment_Status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Admin Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <Link to="/admin/runs" className="btn btn-primary" style={{ padding: '14px' }}>
              <Calendar size={18} />
              <span>Schedule Daily Train Run</span>
            </Link>
            <Link to="/admin/coaches" className="btn btn-outline" style={{ padding: '14px' }}>
              <Armchair size={18} />
              <span>Seat Maintenance Repair</span>
            </Link>
            <Link to="/admin/audit-logs" className="btn btn-outline" style={{ padding: '14px' }}>
              <ScrollText size={18} />
              <span>View Audit Trail</span>
            </Link>
            <Link to="/admin/queries" className="btn btn-outline" style={{ padding: '14px', borderColor: 'var(--rail-red)', color: 'var(--rail-red)' }}>
              <Terminal size={18} />
              <span>DBMS Viva SQL Guide</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
