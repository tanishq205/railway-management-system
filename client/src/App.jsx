import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomeSearch from './pages/HomeSearch';
import PNRStatus from './pages/PNRStatus';
import MyBookings from './pages/MyBookings';
import MyPayments from './pages/MyPayments';
import Login from './pages/Login';
import Register from './pages/Register';

// Admin Pages
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import StationManager from './pages/admin/StationManager';
import TrainManager from './pages/admin/TrainManager';
import CoachSeatManager from './pages/admin/CoachSeatManager';
import RunManager from './pages/admin/RunManager';
import BookingsManager from './pages/admin/BookingsManager';
import ViewsTriggersManager from './pages/admin/ViewsTriggersManager';
import AuditLogs from './pages/admin/AuditLogs';
import VivaQueries from './pages/admin/VivaQueries';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1 }}>
        <Routes>
          {/* Passenger & Public Routes */}
          <Route path="/" element={<HomeSearch />} />
          <Route path="/pnr-status" element={<PNRStatus />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/my-payments" element={<MyPayments />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Management Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="stations" element={<StationManager />} />
            <Route path="trains" element={<TrainManager />} />
            <Route path="coaches" element={<CoachSeatManager />} />
            <Route path="runs" element={<RunManager />} />
            <Route path="bookings" element={<BookingsManager />} />
            <Route path="views-triggers" element={<ViewsTriggersManager />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="queries" element={<VivaQueries />} />
          </Route>
        </Routes>
      </div>

      <footer className="app-footer">
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <strong style={{ color: '#fff' }}>IR-RailOps</strong> — Railway Management System (DBMS College Project)
            <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
              Built with Node.js, Express, React, Vite, and Supabase PostgreSQL with ACID transactions, Views &amp; PL/pgSQL Triggers.
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            College Demo • Not an official Indian Railways portal.
          </div>
        </div>
      </footer>
    </div>
  );
}
