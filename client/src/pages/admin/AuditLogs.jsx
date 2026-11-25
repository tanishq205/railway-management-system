import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ScrollText, Filter, AlertCircle, RefreshCw } from 'lucide-react';

export default function AuditLogs() {
  const { authFetch } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/api/audit-logs';
      const params = [];
      if (actionFilter) params.push(`action=${encodeURIComponent(actionFilter)}`);
      if (tableFilter) params.push(`table=${encodeURIComponent(tableFilter)}`);
      if (sourceFilter) params.push(`source=${encodeURIComponent(sourceFilter)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await authFetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error fetching audit logs.');

      setLogs(data.logs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--navy-900)' }}>System Audit Trail & Security Logs</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Immutable event audit records generated automatically via transactions and PostgreSQL PL/pgSQL database triggers.
          </p>
        </div>
        <button onClick={fetchLogs} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <div className="alert alert-danger"><AlertCircle size={18} /><span>{error}</span></div>}

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <form onSubmit={handleFilter} style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label className="form-label">Search Action Type</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. SEAT, BOOKING, CANCEL, RUN"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <label className="form-label">Table Affected</label>
            <select
              className="form-select"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
            >
              <option value="">All Tables</option>
              <option value="Seat_Allocation">Seat_Allocation</option>
              <option value="Seat">Seat</option>
              <option value="Ticket_Header">Ticket_Header</option>
              <option value="Ticket_Detail">Ticket_Detail</option>
              <option value="Payment">Payment</option>
              <option value="Train_Run">Train_Run</option>
              <option value="Train">Train</option>
              <option value="Route_Schedule">Route_Schedule</option>
              <option value="Station">Station</option>
              <option value="User_Account">User_Account</option>
            </select>
          </div>

          <div style={{ minWidth: '170px' }}>
            <label className="form-label">Event Source</label>
            <select
              className="form-select"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="">All Sources</option>
              <option value="triggers">PL/pgSQL Triggers Only</option>
              <option value="users">API / User Actions Only</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary">
              <Filter size={14} /> Filter Logs
            </button>
            <button
              type="button"
              onClick={() => { setActionFilter(''); setTableFilter(''); setSourceFilter(''); setTimeout(fetchLogs, 50); }}
              className="btn btn-outline"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Action Type</th>
              <th>Target Table</th>
              <th>User Account</th>
              <th>Role</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Loading audit logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>No audit records found.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.Log_ID}>
                  <td><strong>#{log.Log_ID}</strong></td>
                  <td>
                    <span style={{
                      backgroundColor: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-color)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      color: 'var(--heading-color)'
                    }}>
                      {log.Action_Type}
                    </span>
                  </td>
                  <td><strong>{log.Table_Affected}</strong></td>
                  <td>{log.User_Email || <span style={{ color: 'var(--text-muted)' }}>System Trigger / Guest</span>}</td>
                  <td>
                    {log.User_Role ? (
                      <span className={`badge ${log.User_Role === 'ADMIN' ? 'badge-cancelled' : 'badge-operational'}`}>
                        {log.User_Role}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>SYSTEM</span>
                    )}
                  </td>
                  <td>{new Date(log.Created_At).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
