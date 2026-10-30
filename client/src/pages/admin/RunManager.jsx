import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CalendarClock, Plus, Clock, AlertCircle, CheckCircle, RefreshCw, X, ShieldAlert } from 'lucide-react';

export default function RunManager() {
  const { authFetch } = useAuth();
  const [runs, setRuns] = useState([]);
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Schedule run form
  const [trainId, setTrainId] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));

  // Delay / Status update modal
  const [activeRun, setActiveRun] = useState(null);
  const [newStatus, setNewStatus] = useState('SCHEDULED');
  const [delayNotes, setDelayNotes] = useState('');

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/runs');
      const data = await res.json();
      if (data.success) setRuns(data.runs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrains = async () => {
    try {
      const res = await fetch('/api/trains');
      const data = await res.json();
      if (data.success && data.trains.length > 0) {
        setTrains(data.trains);
        setTrainId(data.trains[0].Train_ID);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRuns();
    fetchTrains();
  }, []);

  const handleCreateRun = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await authFetch('/api/runs', {
        method: 'POST',
        body: JSON.stringify({ trainId: parseInt(trainId, 10), serviceDate })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error creating train run.');

      setSuccess(data.message);
      fetchRuns();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!activeRun) return;
    setError('');
    setSuccess('');

    try {
      const res = await authFetch(`/api/runs/${activeRun.Run_ID}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, delayNotes })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Status update failed.');

      setSuccess(data.message);
      setActiveRun(null);
      fetchRuns();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--navy-900)' }}>Train Run Scheduling & Delay Operations</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Instantiate train operational runs by date with automatic Seat_Allocation inventory generation.
          </p>
        </div>
        <button onClick={fetchRuns} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <div className="alert alert-danger"><AlertCircle size={18} /><span>{error}</span></div>}
      {success && <div className="alert alert-success"><CheckCircle size={18} /><span>{success}</span></div>}

      {/* Schedule Run Form */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">
            <Plus size={18} style={{ color: 'var(--rail-red)' }} />
            Schedule New Train Run
          </h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleCreateRun}>
            <div className="form-row">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Physical Train Fleet Entity</label>
                <select
                  className="form-select"
                  value={trainId}
                  onChange={(e) => setTrainId(e.target.value)}
                  required
                >
                  {trains.map((t) => (
                    <option key={t.Train_ID} value={t.Train_ID}>
                      #{t.Train_ID} — {t.Name} ({t.Source_Code} ➔ {t.Destination_Code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Service Date (UNIQUE per Train)</label>
                <input
                  type="date"
                  className="form-control"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px' }}>
                  <CalendarClock size={16} />
                  <span>Create Run & Generate Seat Allocations</span>
                </button>
              </div>
            </div>
          </form>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
            * Note: Creating a run queries all physical seats in this train and automatically creates isolated <code>Seat_Allocation</code> rows.
          </div>
        </div>
      </div>

      {/* Train Runs Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Service Date</th>
              <th>Train Name</th>
              <th>Route</th>
              <th>Operational Status</th>
              <th>Available Seats</th>
              <th>Booked Seats</th>
              <th>Blocked (Repair)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.Run_ID}>
                <td><strong>#{run.Run_ID}</strong></td>
                <td><strong>{run.Service_Date}</strong></td>
                <td>
                  <strong>{run.Train_Name}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{run.Train_Type}</div>
                </td>
                <td>{run.Source_Code} &rarr; {run.Dest_Code}</td>
                <td>
                  <span className={`badge ${
                    run.Run_Status === 'SCHEDULED' ? 'badge-operational' :
                    run.Run_Status === 'RUNNING' ? 'badge-confirmed' :
                    run.Run_Status === 'DELAYED' ? 'badge-waitlisted' : 'badge-cancelled'
                  }`}>
                    {run.Run_Status}
                  </span>
                </td>
                <td><strong style={{ color: 'var(--confirmed-green)' }}>{run.Available_Seats}</strong> / {run.Total_Seats}</td>
                <td>{run.Booked_Seats}</td>
                <td>
                  {run.Blocked_Seats > 0 ? (
                    <span style={{ color: '#d97706', fontWeight: 600 }}>{run.Blocked_Seats} Blocked</span>
                  ) : (
                    <span>0</span>
                  )}
                </td>
                <td>
                  <button
                    onClick={() => {
                      setActiveRun(run);
                      setNewStatus(run.Run_Status);
                      setDelayNotes('');
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    <Clock size={13} />
                    <span>Update Status / Delay</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delay / Status Modal */}
      {activeRun && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="card-title">
                <Clock size={18} style={{ color: 'var(--rail-red)' }} />
                Update Run Operational Status
              </h3>
              <button onClick={() => setActiveRun(null)} className="btn btn-outline btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateStatus}>
              <div className="modal-body">
                <div style={{ marginBottom: '14px', fontSize: '0.9rem' }}>
                  <strong>{activeRun.Train_Name}</strong> (Run #{activeRun.Run_ID}) on <strong>{activeRun.Service_Date}</strong>
                </div>

                <div className="form-group">
                  <label className="form-label">Running Status</label>
                  <select
                    className="form-select"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="SCHEDULED">SCHEDULED (On Time)</option>
                    <option value="RUNNING">RUNNING (In Transit)</option>
                    <option value="DELAYED">DELAYED (Behind Schedule)</option>
                    <option value="COMPLETED">COMPLETED (Terminated)</option>
                    <option value="CANCELLED">CANCELLED (Suspended)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Delay Duration or Notes</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Delayed by 45 mins due to signal clearance"
                    value={delayNotes}
                    onChange={(e) => setDelayNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setActiveRun(null)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Status Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
