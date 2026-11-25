import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Database,
  Eye,
  Zap,
  RefreshCw,
  AlertCircle,
  Search,
  ScrollText,
  Code2,
  CheckCircle2
} from 'lucide-react';

export default function ViewsTriggersManager() {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('occupancy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Catalog metadata from pg_views & pg_trigger
  const [dbObjects, setDbObjects] = useState({ views: [], triggers: [], recentTriggerLogs: [] });

  // View datasets
  const [occupancyReports, setOccupancyReports] = useState([]);
  const [revenueReports, setRevenueReports] = useState([]);
  const [timetableStops, setTimetableStops] = useState([]);

  // vw_booking_details lookup
  const [pnrQuery, setPnrQuery] = useState('PNR8492013');
  const [bookingDetail, setBookingDetail] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [expandedDef, setExpandedDef] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [objRes, occRes, revRes, ttRes] = await Promise.all([
        authFetch('/api/admin/db-objects'),
        authFetch('/api/admin/reports/occupancy'),
        authFetch('/api/admin/reports/revenue'),
        authFetch('/api/admin/reports/timetable')
      ]);

      const [objData, occData, revData, ttData] = await Promise.all([
        objRes.json(),
        occRes.json(),
        revRes.json(),
        ttRes.json()
      ]);

      if (!objRes.ok || !objData.success) {
        throw new Error(objData.message || 'Unable to inspect database views and triggers.');
      }

      setDbObjects({
        views: objData.views || [],
        triggers: objData.triggers || [],
        recentTriggerLogs: objData.recentTriggerLogs || []
      });

      if (occRes.ok && occData.success) setOccupancyReports(occData.reports || []);
      if (revRes.ok && revData.success) setRevenueReports(revData.reports || []);
      if (ttRes.ok && ttData.success) setTimetableStops(ttData.stops || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const lookupBookingView = async (pnrToSearch = pnrQuery) => {
    const clean = (pnrToSearch || '').trim().toUpperCase();
    if (!clean) return;
    setBookingError('');
    try {
      const res = await fetch(`/api/bookings/pnr/${clean}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `No booking found for ${clean}`);
      }
      setBookingDetail(data.booking);
    } catch (err) {
      setBookingDetail(null);
      setBookingError(err.message);
    }
  };

  useEffect(() => {
    loadAll();
    lookupBookingView('PNR8492013');
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={24} style={{ color: 'var(--rail-red)' }} />
            PostgreSQL Views &amp; PL/pgSQL Triggers
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Live catalog inspection of deployed relational views, automated triggers, and real-time view outputs.
          </p>
        </div>
        <button onClick={loadAll} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          <span>Refresh Live Metadata</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <AlertCircle size={18} />
          <span>
            {error} — Ensure <code>database/views_and_triggers.sql</code> (or <code>npm run db:views-triggers</code>) has been applied to PostgreSQL.
          </span>
        </div>
      )}

      {/* Summary Cards: Active Views & Active Triggers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Deployed Views Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Eye size={18} style={{ color: 'var(--navy-700)' }} />
              Deployed SQL Views ({dbObjects.views.length})
            </h3>
          </div>
          <div className="card-body">
            {loading ? (
              <p style={{ color: 'var(--text-secondary)' }}>Inspecting pg_views...</p>
            ) : dbObjects.views.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No public views detected in database.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dbObjects.views.map((v) => (
                  <div
                    key={v.name}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-card-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={15} style={{ color: 'var(--confirmed-green)' }} />
                        <code style={{ fontWeight: 700, fontSize: '0.88rem' }}>{v.name}</code>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        onClick={() => setExpandedDef(expandedDef === `v:${v.name}` ? null : `v:${v.name}`)}
                      >
                        <Code2 size={12} /> {expandedDef === `v:${v.name}` ? 'Hide SQL' : 'View SQL'}
                      </button>
                    </div>
                    {expandedDef === `v:${v.name}` && (
                      <pre style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: '#0a1f38',
                        color: '#e2e8f0',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {v.definition}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Deployed Triggers Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Zap size={18} style={{ color: 'var(--rail-red)' }} />
              Active PL/pgSQL Triggers ({dbObjects.triggers.length})
            </h3>
          </div>
          <div className="card-body">
            {loading ? (
              <p style={{ color: 'var(--text-secondary)' }}>Inspecting pg_trigger...</p>
            ) : dbObjects.triggers.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No custom triggers detected in database.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dbObjects.triggers.map((t) => (
                  <div
                    key={t.trigger_name}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-card-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={15} style={{ color: 'var(--confirmed-green)' }} />
                          <code style={{ fontWeight: 700, fontSize: '0.86rem' }}>{t.trigger_name}</code>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', marginLeft: '23px' }}>
                          ON <strong>{t.table_name}</strong> &rarr; <code>{t.function_name}()</code>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        onClick={() => setExpandedDef(expandedDef === `t:${t.trigger_name}` ? null : `t:${t.trigger_name}`)}
                      >
                        <Code2 size={12} /> {expandedDef === `t:${t.trigger_name}` ? 'Hide' : 'Def'}
                      </button>
                    </div>
                    {expandedDef === `t:${t.trigger_name}` && (
                      <pre style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: '#0a1f38',
                        color: '#e2e8f0',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {t.definition}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive View Data Explorer */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <h3 className="card-title">
            <Eye size={18} style={{ color: 'var(--navy-700)' }} />
            Live View Output Explorer
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('occupancy')}
              className={`btn btn-sm ${activeTab === 'occupancy' ? 'btn-primary' : 'btn-outline'}`}
            >
              vw_train_occupancy
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('revenue')}
              className={`btn btn-sm ${activeTab === 'revenue' ? 'btn-primary' : 'btn-outline'}`}
            >
              vw_revenue_summary
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timetable')}
              className={`btn btn-sm ${activeTab === 'timetable' ? 'btn-primary' : 'btn-outline'}`}
            >
              vw_route_timetable
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('booking')}
              className={`btn btn-sm ${activeTab === 'booking' ? 'btn-primary' : 'btn-outline'}`}
            >
              vw_booking_details
            </button>
          </div>
        </div>

        <div className="card-body" style={{ padding: activeTab === 'booking' ? '20px' : 0 }}>
          {activeTab === 'occupancy' && (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Train</th>
                    <th>Service Date</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Booked</th>
                    <th>Available</th>
                    <th>Blocked</th>
                    <th>Occupancy %</th>
                  </tr>
                </thead>
                <tbody>
                  {occupancyReports.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '20px' }}>No train run occupancy records found.</td></tr>
                  ) : (
                    occupancyReports.map((r) => (
                      <tr key={r.run_id}>
                        <td><strong>#{r.run_id}</strong></td>
                        <td>
                          <strong>{r.train_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.train_type}</div>
                        </td>
                        <td>{r.service_date}</td>
                        <td><span className="badge badge-operational">{r.run_status}</span></td>
                        <td>{r.total_seats}</td>
                        <td style={{ color: 'var(--confirmed-green)', fontWeight: 700 }}>{r.booked_seats}</td>
                        <td style={{ color: 'var(--navy-600)', fontWeight: 700 }}>{r.available_seats}</td>
                        <td style={{ color: 'var(--waitlist-amber)', fontWeight: 700 }}>{r.blocked_seats ?? 0}</td>
                        <td><strong>{parseFloat(r.occupancy_percentage || 0).toFixed(2)}%</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Train ID</th>
                    <th>Train Name</th>
                    <th>Type</th>
                    <th>Service Date</th>
                    <th>Bookings</th>
                    <th>Gross Revenue</th>
                    <th>Refunded</th>
                    <th>Net Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueReports.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>No revenue records found.</td></tr>
                  ) : (
                    revenueReports.map((r, idx) => (
                      <tr key={`${r.train_id}-${r.service_date}-${idx}`}>
                        <td><strong>#{r.train_id}</strong></td>
                        <td><strong>{r.train_name}</strong></td>
                        <td><span className="badge badge-operational">{r.train_type}</span></td>
                        <td>{r.service_date}</td>
                        <td>{r.confirmed_bookings_count}</td>
                        <td style={{ color: 'var(--confirmed-green)', fontWeight: 700 }}>
                          ₹{parseFloat(r.total_revenue || 0).toFixed(2)}
                        </td>
                        <td style={{ color: 'var(--cancelled-red)' }}>
                          ₹{parseFloat(r.refunded_amount || 0).toFixed(2)}
                        </td>
                        <td><strong>₹{parseFloat(r.net_revenue || 0).toFixed(2)}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'timetable' && (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Train</th>
                    <th>Stop #</th>
                    <th>Station Code</th>
                    <th>Station Name</th>
                    <th>City, State</th>
                    <th>Arrival</th>
                    <th>Departure</th>
                  </tr>
                </thead>
                <tbody>
                  {timetableStops.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No route timetable entries found.</td></tr>
                  ) : (
                    timetableStops.map((s) => (
                      <tr key={s.schedule_id}>
                        <td><strong>{s.train_name}</strong></td>
                        <td><span className="badge badge-operational">#{s.stop_sequence}</span></td>
                        <td><code>{s.station_code}</code></td>
                        <td>{s.station_name}</td>
                        <td>{s.city}, {s.state}</td>
                        <td>{s.arrival_time || 'Origin'}</td>
                        <td>{s.departure_time || 'Terminus'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'booking' && (
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  lookupBookingView();
                }}
                style={{ display: 'flex', gap: '10px', marginBottom: '16px', maxWidth: '460px' }}
              >
                <input
                  type="text"
                  className="form-control"
                  value={pnrQuery}
                  onChange={(e) => setPnrQuery(e.target.value.toUpperCase())}
                  placeholder="Enter PNR (e.g. PNR8492013)"
                />
                <button type="submit" className="btn btn-primary">
                  <Search size={15} /> Query View
                </button>
              </form>

              {bookingError && (
                <div className="alert alert-warning">
                  <AlertCircle size={16} />
                  <span>{bookingError}</span>
                </div>
              )}

              {bookingDetail && (
                <div>
                  <div style={{ marginBottom: '12px', fontSize: '0.9rem' }}>
                    <strong>PNR:</strong> <code>{bookingDetail.pnr}</code> &bull;{' '}
                    <strong>Train:</strong> {bookingDetail.train?.name} &bull;{' '}
                    <strong>Route:</strong> {bookingDetail.route?.fromCode} &rarr; {bookingDetail.route?.toCode} &bull;{' '}
                    <strong>Payment:</strong> <span className="badge badge-confirmed">{bookingDetail.paymentStatus}</span>
                  </div>
                  <div className="table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Detail ID</th>
                          <th>Passenger</th>
                          <th>Age / Gender</th>
                          <th>Status</th>
                          <th>Coach</th>
                          <th>Seat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookingDetail.passengers.map((p) => (
                          <tr key={p.detailId}>
                            <td>#{p.detailId}</td>
                            <td><strong>{p.name}</strong></td>
                            <td>{p.age} / {p.gender}</td>
                            <td>
                              <span className={`badge ${p.status === 'CONFIRMED' ? 'badge-confirmed' : p.status === 'WAITLIST' ? 'badge-waitlisted' : 'badge-cancelled'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td>{p.coachType || '—'}</td>
                            <td>{p.seatNumber || 'Waitlisted'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Trigger-Fired Audit Logs */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <ScrollText size={18} style={{ color: 'var(--rail-red)' }} />
            Recent Trigger-Generated Audit Events
          </h3>
          <Link to="/admin/audit-logs" className="btn btn-outline btn-sm">
            Open Full Audit Trail
          </Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Trigger Action Type</th>
                  <th>Table Affected</th>
                  <th>Fired At</th>
                </tr>
              </thead>
              <tbody>
                {dbObjects.recentTriggerLogs.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No trigger audit entries recorded yet. Book, cancel, or toggle a seat repair status to fire triggers live.</td></tr>
                ) : (
                  dbObjects.recentTriggerLogs.map((log) => (
                    <tr key={log.Log_ID}>
                      <td><strong>#{log.Log_ID}</strong></td>
                      <td><code>{log.Action_Type}</code></td>
                      <td><strong>{log.Table_Affected}</strong></td>
                      <td>{new Date(log.Created_At).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

