import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MapPin, Plus, Trash2, Edit2, AlertCircle, CheckCircle, RefreshCw, X } from 'lucide-react';

export default function StationManager() {
  const { authFetch } = useAuth();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [stationCode, setStationCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [editingStation, setEditingStation] = useState(null);

  const fetchStations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stations');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error fetching stations.');
      setStations(data.stations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      let res;
      if (editingStation) {
        res = await authFetch(`/api/stations/${editingStation.Station_ID}`, {
          method: 'PUT',
          body: JSON.stringify({ stationCode, name, city, state })
        });
      } else {
        res = await authFetch('/api/stations', {
          method: 'POST',
          body: JSON.stringify({ stationCode, name, city, state })
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Action failed.');

      setSuccess(data.message);
      // Reset form
      setStationCode('');
      setName('');
      setCity('');
      setState('');
      setEditingStation(null);
      fetchStations();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditClick = (stn) => {
    setEditingStation(stn);
    setStationCode(stn.Station_Code);
    setName(stn.Name);
    setCity(stn.City);
    setState(stn.State);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingStation(null);
    setStationCode('');
    setName('');
    setCity('');
    setState('');
  };

  const handleDelete = async (stationId, code) => {
    if (!window.confirm(`Are you sure you want to delete station ${code}?`)) return;
    setError('');
    setSuccess('');

    try {
      const res = await authFetch(`/api/stations/${stationId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Delete failed.');

      setSuccess(data.message);
      fetchStations();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--navy-900)' }}>Railway Station Infrastructure</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            CRUD operations for stations with UNIQUE Station_Code constraint enforcement.
          </p>
        </div>
        <button onClick={fetchStations} className="btn btn-outline btn-sm">
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

      {/* Station Form Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">
            <Plus size={18} style={{ color: 'var(--rail-red)' }} />
            {editingStation ? `Edit Station: ${editingStation.Station_Code}` : 'Register New Station'}
          </h3>
          {editingStation && (
            <button onClick={cancelEdit} className="btn btn-outline btn-sm">
              <X size={14} />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>
        <div className="card-body">
          <form onSubmit={handleCreateOrUpdate}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Station Code (Unique)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. NDLS, MMCT"
                  value={stationCode}
                  onChange={(e) => setStationCode(e.target.value.toUpperCase())}
                  required
                  maxLength={10}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Station Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. New Delhi Railway Station"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. New Delhi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Delhi"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" className="btn btn-primary">
                {editingStation ? 'Update Station' : 'Create Station'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Station List Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Code</th>
              <th>Station Name</th>
              <th>City</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((stn) => (
              <tr key={stn.Station_ID}>
                <td><strong>#{stn.Station_ID}</strong></td>
                <td>
                  <span style={{
                    backgroundColor: 'var(--navy-900)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontFamily: 'monospace'
                  }}>
                    {stn.Station_Code}
                  </span>
                </td>
                <td><strong>{stn.Name}</strong></td>
                <td>{stn.City}</td>
                <td>{stn.State}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEditClick(stn)}
                      className="btn btn-outline btn-sm"
                      title="Edit Station"
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(stn.Station_ID, stn.Station_Code)}
                      className="btn btn-danger-outline btn-sm"
                      title="Delete Station (safe referential integrity check)"
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
    </div>
  );
}
