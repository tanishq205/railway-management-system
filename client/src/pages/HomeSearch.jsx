import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BookingModal from '../components/BookingModal';
import { 
  Search, 
  ArrowRightLeft, 
  Calendar, 
  Train, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ListOrdered, 
  X,
  CreditCard 
} from 'lucide-react';

export default function HomeSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stations, setStations] = useState([]);
  const [fromStationId, setFromStationId] = useState('');
  const [toStationId, setToStationId] = useState('');
  const [journeyDate, setJourneyDate] = useState('2026-10-30');
  
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [allTrains, setAllTrains] = useState([]);

  // Modals state
  const [bookingTrain, setBookingTrain] = useState(null);
  const [viewRouteTrain, setViewRouteTrain] = useState(null);

  // Load all stations and all trains on mount
  useEffect(() => {
    // 1. Fetch Stations
    fetch('/api/stations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.stations.length > 0) {
          setStations(data.stations);
          // Default to New Delhi (NDLS) to Mumbai Central (MMCT)
          const ndls = data.stations.find((s) => s.Station_Code === 'NDLS') || data.stations[0];
          const mmct = data.stations.find((s) => s.Station_Code === 'MMCT') || data.stations[1];
          setFromStationId(ndls.Station_ID);
          setToStationId(mmct.Station_ID);

          // Auto-trigger search so trains appear immediately on page load!
          executeSearch(ndls.Station_ID, mmct.Station_ID, '2026-10-30');
        }
      })
      .catch((err) => console.error('Failed to load stations:', err));

    // 2. Fetch All Premier Trains for the Showcase
    fetch('/api/trains')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.trains) {
          setAllTrains(data.trains);
        }
      })
      .catch((err) => console.error('Failed to load all trains:', err));
  }, []);

  const executeSearch = async (fromId, toId, date) => {
    setSearchError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/trains/search?from=${fromId}&to=${toId}&date=${date}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error searching trains.');
      }
      setSearchResults(data.trains);
    } catch (err) {
      setSearchError(err.message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoute = (fromId, toId) => {
    setFromStationId(fromId);
    setToStationId(toId);
    executeSearch(fromId, toId, journeyDate);
  };

  // Execute train search
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setSearchError('');

    if (!fromStationId || !toStationId) {
      setSearchError('Please select both Origin and Destination stations.');
      return;
    }

    if (parseInt(fromStationId, 10) === parseInt(toStationId, 10)) {
      setSearchError('Origin and Destination stations cannot be identical.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/trains/search?from=${fromStationId}&to=${toStationId}&date=${journeyDate}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error searching trains.');
      }

      setSearchResults(data.trains);
    } catch (err) {
      setSearchError(err.message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const swapStations = () => {
    const temp = fromStationId;
    setFromStationId(toStationId);
    setToStationId(temp);
  };

  const handleBookClick = (train) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setBookingTrain(train);
  };

  const fromStation = stations.find((s) => s.Station_ID === parseInt(fromStationId, 10)) || { Name: 'Origin', Station_Code: 'SRC' };
  const toStation = stations.find((s) => s.Station_ID === parseInt(toStationId, 10)) || { Name: 'Destination', Station_Code: 'DEST' };

  return (
    <div className="page-wrapper">
      {/* Search Hero Section */}
      <section className="search-hero">
        <h1 className="search-hero-title">Indian Railway Ticket Booking & Seat Reservation</h1>
        <p className="search-hero-subtitle">
          Real-time train schedules, multi-passenger booking, ACID transactional seat allocation, and automated waitlist promotion.
        </p>

        <div className="search-box-card">
          <form onSubmit={handleSearch}>
            <div className="search-form-grid">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">From Station</label>
                <select
                  className="form-select"
                  value={fromStationId}
                  onChange={(e) => setFromStationId(e.target.value)}
                  required
                >
                  <option value="">Select Origin Station</option>
                  {stations.map((s) => (
                    <option key={s.Station_ID} value={s.Station_ID}>
                      {s.Name} ({s.Station_Code}) — {s.City}
                    </option>
                  ))}
                </select>
              </div>

              <div className="swap-btn-container">
                <button
                  type="button"
                  onClick={swapStations}
                  className="btn btn-outline"
                  title="Swap Origin and Destination"
                  style={{ padding: '10px 14px' }}
                >
                  <ArrowRightLeft size={16} />
                </button>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">To Station</label>
                <select
                  className="form-select"
                  value={toStationId}
                  onChange={(e) => setToStationId(e.target.value)}
                  required
                >
                  <option value="">Select Destination Station</option>
                  {stations.map((s) => (
                    <option key={s.Station_ID} value={s.Station_ID}>
                      {s.Name} ({s.Station_Code}) — {s.City}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Journey Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={journeyDate}
                  onChange={(e) => setJourneyDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <button type="submit" className="btn btn-accent" style={{ width: '100%', height: '42px' }} disabled={loading}>
                  <Search size={18} />
                  <span>{loading ? 'Searching...' : 'Find Trains'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Quick Route Shortcuts */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>POPULAR DEMO ROUTES:</span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleSelectRoute(1, 2)}
            >
              NDLS ➔ MMCT (Tejas Rajdhani)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleSelectRoute(1, 12)}
            >
              NDLS ➔ BSB (Vande Bharat)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleSelectRoute(4, 5)}
            >
              MAS ➔ SBC (Chennai VB)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleSelectRoute(1, 11)}
            >
              NDLS ➔ BPL (Shatabdi)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleSelectRoute(1, 3)}
            >
              NDLS ➔ HWH (Howrah Rajdhani)
            </button>
          </div>
        </div>
      </section>

      {/* Error Message */}
      {searchError && (
        <div className="alert alert-danger">
          <AlertTriangle size={18} />
          <span>{searchError}</span>
        </div>
      )}

      {/* Search Results Display */}
      {searchResults !== null && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.35rem' }}>
              Available Trains ({searchResults.length})
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing scheduled runs for <strong>{journeyDate}</strong>
            </div>
          </div>

          {searchResults.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <Train size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <h3 style={{ color: 'var(--navy-900)' }}>No Trains Found for Selected Date</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '500px', margin: '8px auto 16px' }}>
                There are no scheduled train runs between {fromStation.Name} and {toStation.Name} on {journeyDate}.
                Try selecting <strong>2026-10-30</strong> or <strong>2026-10-31</strong>.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {searchResults.map((train) => (
                <div key={train.Train_ID} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    {/* Train Info */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          backgroundColor: 'var(--navy-800)',
                          color: '#fff',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          border: '1px solid var(--border-color)'
                        }}>
                          #{train.Train_ID}
                        </span>
                        <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{train.Train_Name}</h3>
                        <span className="badge badge-operational">{train.Train_Type}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Run ID #{train.Run_ID} • Service Date: {train.Service_Date} • Status: <strong>{train.Run_Status}</strong>
                      </div>
                    </div>

                    {/* Fare and Booking CTA */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy-900)', fontFamily: 'Outfit' }}>
                        ₹{train.demoFarePerPassenger}
                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}> / passenger</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>* Demo fare based on route distance</div>
                    </div>
                  </div>

                  {/* Route & Timing Timeline */}
                  <div className="train-timeline-container">
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--heading-color)' }}>
                        {train.Departure_Time ? train.Departure_Time.slice(0, 5) : '08:00'}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{train.Origin_Name} ({train.Origin_Code})</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stop Seq #{train.Origin_Sequence}</div>
                    </div>

                    <div style={{ textAlign: 'center', flex: 1, padding: '0 16px', minWidth: '120px' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {train.stopsDifference} route stop(s)
                      </div>
                      <div style={{ height: '3px', background: 'var(--navy-700)', position: 'relative', borderRadius: '2px' }}>
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: 'var(--rail-red)',
                          position: 'absolute',
                          top: '-3.5px',
                          left: '50%',
                          transform: 'translateX(-50%)'
                        }}></div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewRouteTrain(train)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--navy-600)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          marginTop: '6px'
                        }}
                      >
                        View Full Route Stops
                      </button>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--heading-color)' }}>
                        {train.Arrival_Time ? train.Arrival_Time.slice(0, 5) : '20:00'}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{train.Dest_Name} ({train.Dest_Code})</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stop Seq #{train.Dest_Sequence}</div>
                    </div>
                  </div>

                  {/* Seat Availability & Action Bar */}
                  <div className="train-action-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {train.Available_Seats > 0 ? (
                        <span className="badge badge-confirmed" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                          <CheckCircle size={15} />
                          {train.Available_Seats} Available Seats
                        </span>
                      ) : (
                        <span className="badge badge-waitlisted" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                          <AlertTriangle size={15} />
                          Waitlist Only (WL #{train.Booked_Seats + 1})
                        </span>
                      )}

                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Total Operational Seats: {train.Total_Seats}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBookClick(train)}
                      className="btn btn-accent btn-book-action"
                    >
                      <CreditCard size={16} />
                      <span>{train.Available_Seats > 0 ? 'Book Tickets' : 'Book on Waitlist'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Premier IRCTC Fleet Network Showcase */}
      <section style={{ marginTop: '48px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', color: 'var(--heading-color)' }}>Premier IRCTC Express Trains Fleet</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Direct access to all 8 scheduled premier trains across major Indian railway corridors
            </p>
          </div>
          <span className="badge badge-confirmed">8 Active Trains</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {allTrains.map((t) => (
            <div key={t.Train_ID} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{
                    backgroundColor: 'var(--navy-800)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    border: '1px solid var(--border-color)'
                  }}>
                    {t.Type}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {t.Total_Coaches || 3} Coaches • {t.Total_Seats || 18} Seats
                  </span>
                </div>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--navy-900)', marginBottom: '6px' }}>{t.Name}</h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  <strong>{t.Source_Code}</strong> ({t.Source_Name}) &rarr; <strong>{t.Destination_Code}</strong> ({t.Destination_Name})
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => handleSelectRoute(t.Source_ID, t.Destination_ID)}
                  className="btn btn-accent btn-sm"
                  style={{ flex: 1 }}
                >
                  <Train size={14} /> Book This Train
                </button>
                <button
                  type="button"
                  onClick={() => setViewRouteTrain({ Train_ID: t.Train_ID, Train_Name: t.Name })}
                  className="btn btn-outline btn-sm"
                  title="View Route Timetable"
                >
                  <ListOrdered size={14} /> Stops
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Booking Modal */}
      {bookingTrain && (
        <BookingModal
          train={bookingTrain}
          fromStation={fromStation}
          toStation={toStation}
          journeyDate={journeyDate}
          onClose={() => {
            setBookingTrain(null);
            handleSearch(); // Refresh available seats after booking
          }}
        />
      )}

      {/* Full Route Stops Viewer Modal */}
      {viewRouteTrain && (
        <RouteViewerModal
          trainId={viewRouteTrain.Train_ID}
          trainName={viewRouteTrain.Train_Name}
          onClose={() => setViewRouteTrain(null)}
        />
      )}
    </div>
  );
}

function RouteViewerModal({ trainId, trainName, onClose }) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/routes/${trainId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStops(data.routeStops);
      })
      .finally(() => setLoading(false));
  }, [trainId]);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3 className="card-title">
            <ListOrdered size={18} style={{ color: 'var(--rail-red)' }} />
            Route Stops: {trainName}
          </h3>
          <button onClick={onClose} className="btn btn-outline btn-sm" style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <p>Loading timetable...</p>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Seq</th>
                    <th>Station</th>
                    <th>City</th>
                    <th>Arrival</th>
                    <th>Departure</th>
                  </tr>
                </thead>
                <tbody>
                  {stops.map((stop) => (
                    <tr key={stop.Schedule_ID}>
                      <td><strong>#{stop.Stop_Sequence}</strong></td>
                      <td>
                        <strong>{stop.Station_Name}</strong> ({stop.Station_Code})
                      </td>
                      <td>{stop.City}</td>
                      <td>{stop.Arrival_Time ? stop.Arrival_Time.slice(0, 5) : '— (Origin)'}</td>
                      <td>{stop.Departure_Time ? stop.Departure_Time.slice(0, 5) : '— (Terminus)'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary">Close</button>
        </div>
      </div>
    </div>
  );
}
