import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import { ShieldAlert } from 'lucide-react';

export default function AdminLayout() {
  const { user, isAdmin } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="page-wrapper" style={{ maxWidth: '600px', marginTop: '60px', textAlign: 'center' }}>
        <div className="card" style={{ padding: '40px' }}>
          <ShieldAlert size={56} style={{ color: 'var(--rail-red)', margin: '0 auto 16px' }} />
          <h2 style={{ color: 'var(--navy-900)' }}>Administrative Privileges Required</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '12px 0 24px' }}>
            Your account ({user.email}) is registered as a <strong>PASSENGER</strong>. Only system administrators can access the operations control panel.
          </p>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              💡 Demo Tip: Log in with <code>admin@railway.gov.in</code> (Password: <code>admin123</code>) to access the admin portal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <AdminSidebar />
      <main className="main-content">
        <div className="page-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
