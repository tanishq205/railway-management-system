import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Train, Plus, Trash2, ListOrdered, AlertCircle, CheckCircle, RefreshCw, X, ArrowRight } from 'lucide-react';

export default function TrainManager() {
  const { authFetch } = useAuth();
  const [trains, setTrains] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Train creation form
  const [name, setName] = useState('');
  const [type, setType] = useState('EXPRESS');
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');

  // Route modal
  const [activeRouteTrain, setActiveRouteTrain] = useState(null);

  const fetchTrains = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trains');
      const data = await res.json();
      if (data.success) setTrains(data.trains);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStations = async () => {
    try {
      const res = await fetch('/api/stations');
      const data = await res.json();
      if (data.success) {
        setStations(data.stations);
        if (data.stations.length >= 2) {
          setSourceId(data.stations[0].Station_ID);
          setDestinationId(data.stations[1].Station_ID);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTrains();
    fetchStations();
  }, []);

  const handleCreateTrain = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (parseInt(sourceId, 10) === parseInt(destinationId, 10)) {
      setError('Source and Destination stations must be distinct.');
      return;
    }

    try {
      const res = await authFetch('/api/trains', {
        method: 'POST',
        body: JSON.stringify({ name, type, sourceId, destinationId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error creating train.');

      setSuccess(data.message);
      setName('');
      fetchTrains();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTrain = async (trainId, trainName) => {
    if (!window.confirm(`Are you sure you want to delete train "${trainName}"?`)) return;
    setError('');
    setSuccess('');

    try {
      const res = await authFetch(`/api/trains/${trainId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error deleting train.');

      setSuccess(data.message);
      fetchTrains();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--navy-900)' }}>Train Fleet & Route Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Configure trains, rolling stock composition, and ordered stop sequences.
          </p>
        </div>
        <button onClick={fetchTrains} className="btn btn-outline btn-sm">
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

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Register New Train Form */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">
            <Plus size={18} style={{ color: 'var(--rail-red)' }} />
            Register New Physical Train
          </h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleCreateTrain}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Train Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Deccan Queen Superfast"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Train Type / Category</label>
                <select
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="VANDE_BHARAT">Vande Bharat Express</option>
                  <option value="RAJDHANI">Rajdhani Express</option>
                  <option value="DURONTO">Duronto Express</option>
                  <option value="SHATABDI">Shatabdi Express</option>
                  <option value="SUPERFAST">Superfast Express</option>
                  <option value="EXPRESS">Mail / Express</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Source Station</label>
                <select
                  className="form-select"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  required
                >
                  {stations.map((s) => (
                    <option key={s.Station_ID} value={s.Station_ID}>
                      {s.Name} ({s.Station_Code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Destination Station</label>
                <select
                  className="form-select"
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  required
                >
                  {stations.map((s) => (
                    <option key={s.Station_ID} value={s.Station_ID}>
                      {s.Name} ({s.Station_Code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" className="btn btn-primary">
                Register Train & Initialize Route
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Train Fleet Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Train ID</th>
              <th>Train Name</th>
              <th>Category</th>
              <th>Source Station</th>
              <th>Destination Station</th>
              <th>Coaches</th>
              <th>Seats</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trains.map((t) => (
              <tr key={t.Train_ID}>
                <td><strong>#{t.Train_ID}</strong></td>
                <td><strong>{t.Name}</strong></td>
                <td><span className="badge badge-operational">{t.Type}</span></td>
                <td>{t.Source_Name} ({t.Source_Code})</td>
                <td>{t.Destination_Name} ({t.Destination_Code})</td>
                <td>{t.Total_Coaches} Coach(es)</td>
                <td>{t.Total_Seats} Total Seats</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setActiveRouteTrain(t)}
                      className="btn btn-outline btn-sm"
                      title="Manage intermediate route schedule stops"
                    >
                      <ListOrdered size={13} />
                      <span>Route Stops</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTrain(t.Train_ID, t.Name)}
                      className="btn btn-danger-outline btn-sm"
                      title="Delete train"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Route Schedule Management Modal */}
      {activeRouteTrain && (
        <RouteScheduleEditorModal
          train={activeRouteTrain}
          stations={stations}
          onClose={() => setActiveRouteTrain(null)}
        />
      )}
    </div>
  );
}

function RouteScheduleEditorModal({ train, stations, onClose }) {
  const { authFetch } = useAuth();
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add stop form
  const [stationId, setStationId] = useState(stations[0]?.Station_ID || '');
  const [stopSequence, setStopSequence] = useState(2);
  const [arrivalTime, setArrivalTime] = useState('12:00');
  const [departureTime, setDepartureTime] = useState('12:15');

  const fetchStops = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/routes/${train.Train_ID}`);
      const data = await res.json();
      if (data.success) {
        setStops(data.routeStops);
        setStopSequence(data.routeStops.length + 1);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStops();
  }, [train.Train_ID]);

  const handleAddStop = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await authFetch(`/api/routes/${train.Train_ID}`, {
        method: 'POST',
        body: JSON.stringify({
          stationId: parseInt(stationId, 10),
          stopSequence: parseInt(stopSequence, 10),
          arrivalTime: arrivalTime ? `${arrivalTime}:00` : null,
          departureTime: departureTime ? `${departureTime}:00` : null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to add stop.');

      setSuccess('Stop added successfully to Route_Schedule!');
      fetchStops();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteStop = async (scheduleId) => {
    if (!window.confirm('Remove this stop from the timetable?')) return;
    setError('');
    setSuccess('');

    try {
      const res = await authFetch(`/api/routes/stop/${scheduleId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete stop.');

      setSuccess('Stop removed successfully.');
      fetchStops();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '750px' }}>
        <div className="modal-header">
          <div>
            <h3 className="card-title">
              <ListOrdered size={20} style={{ color: 'var(--rail-red)' }} />
              Route Schedule: {train.Name}
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Ordered sequence of station stops (UNIQUE constraint on Train_ID, Stop_Sequence)
            </div>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-danger"><AlertCircle size={16} /><span>{error}</span></div>}
          {success && <div className="alert alert-success"><CheckCircle size={16} /><span>{success}</span></div>}

          {/* Existing Stops Table */}
          <div className="table-container" style={{ marginBottom: '20px' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Seq</th>
                  <th>Station</th>
                  <th>City</th>
                  <th>Arrival Time</th>
                  <th>Departure Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stops.map((s) => (
                  <tr key={s.Schedule_ID}>
                    <td><strong>#{s.Stop_Sequence}</strong></td>
                    <td><strong>{s.Station_Name}</strong> ({s.Station_Code})</td>
                    <td>{s.City}</td>
                    <td>{s.Arrival_Time ? s.Arrival_Time.slice(0, 5) : '— (Origin)'}</td>
                    <td>{s.Departure_Time ? s.Departure_Time.slice(0, 5) : '— (Terminus)'}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteStop(s.Schedule_ID)}
                        className="btn btn-danger-outline btn-sm"
                        title="Remove stop"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Stop Form */}
          <div style={{ background: 'var(--bg-card-subtle)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--heading-color)' }}>
              Add Route Stop
            </h4>
            <form onSubmit={handleAddStop}>
              <div className="form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Station</label>
                  <select
                    className="form-select"
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                    required
                  >
                    {stations.map((s) => (
                      <option key={s.Station_ID} value={s.Station_ID}>
                        {s.Name} ({s.Station_Code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Stop Sequence #</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    value={stopSequence}
                    onChange={(e) => setStopSequence(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Arrival Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Departure Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Plus size={14} /> Add Stop to Route
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-outline">Close</button>
        </div>
      </div>
    </div>
  );
}
