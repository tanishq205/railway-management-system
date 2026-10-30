import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { 
  Train, 
  Search, 
  Ticket, 
  History, 
  CreditCard, 
  ShieldCheck, 
  LogIn, 
  LogOut, 
  UserPlus, 
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';

export default function Navbar() {
  const { user, isAdmin, logout, dbStatus } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer whenever location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  return (
    <>
      {/* Database Offline Warning Notification Banner */}
      {dbStatus.checked && !dbStatus.connected && (
        <div style={{
          backgroundColor: 'var(--alert-danger-bg)',
          borderBottom: '1px solid var(--alert-danger-border)',
          padding: '8px 16px',
          color: 'var(--alert-danger-text)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          textAlign: 'center'
        }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            <strong>Database Connection Notice:</strong> {dbStatus.message} Run <code>npm run db:init</code> in the server folder.
          </span>
        </div>
      )}

      <header className="top-nav">
        <div className="brand-section">
          <Link 
            to="/" 
            onClick={() => setMobileMenuOpen(false)} 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
          >
            <div className="brand-logo-icon">
              <Train size={20} />
            </div>
            <div>
              <div className="brand-title">
                IR-RailOps
                <span className="brand-badge">2026</span>
              </div>
              <div className="brand-subtitle" style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '-2px' }}>
                Railway Management & Ticketing
              </div>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="nav-links desktop-only">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <Search size={16} />
            <span>Search Trains</span>
          </NavLink>

          <NavLink to="/pnr-status" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Ticket size={16} />
            <span>PNR Status</span>
          </NavLink>

          {user && (
            <>
              <NavLink to="/my-bookings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <History size={16} />
                <span>My Bookings</span>
              </NavLink>

              <NavLink to="/my-payments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <CreditCard size={16} />
                <span>Payments</span>
              </NavLink>
            </>
          )}

          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <ShieldCheck size={16} />
              <span>Admin Portal</span>
            </NavLink>
          )}
        </nav>

        {/* Right Section: Theme Toggle, Profile Menu & Mobile Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ThemeToggle />

          {/* Desktop User Profile Menu */}
          <div className="user-profile-menu desktop-only">
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: user.role === 'ADMIN' ? '#f87171' : '#38bdf8', fontWeight: 600 }}>
                    {user.role === 'ADMIN' ? 'ADMIN' : 'PASSENGER'}
                  </div>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
                  title="Log Out"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link to="/login" className="btn btn-outline btn-sm" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>
                  <LogIn size={14} />
                  <span>Login</span>
                </Link>
                <Link to="/register" className="btn btn-accent btn-sm">
                  <UserPlus size={14} />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            className="mobile-menu-btn mobile-only"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer mobile-only">
          <nav className="mobile-nav-links">
            <NavLink 
              to="/" 
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`} 
              end
              onClick={() => setMobileMenuOpen(false)}
            >
              <Search size={18} />
              <span>Search Trains</span>
            </NavLink>

            <NavLink 
              to="/pnr-status" 
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Ticket size={18} />
              <span>PNR Status</span>
            </NavLink>

            {user && (
              <>
                <NavLink 
                  to="/my-bookings" 
                  className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <History size={18} />
                  <span>My Bookings</span>
                </NavLink>

                <NavLink 
                  to="/my-payments" 
                  className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <CreditCard size={18} />
                  <span>Payments</span>
                </NavLink>
              </>
            )}

            {isAdmin && (
              <NavLink 
                to="/admin" 
                className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShieldCheck size={18} />
                <span>Admin Portal</span>
              </NavLink>
            )}
          </nav>

          <div className="mobile-user-section">
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                    {user.email}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: user.role === 'ADMIN' ? '#f87171' : '#38bdf8', fontWeight: 600 }}>
                    {user.role === 'ADMIN' ? 'SUPER ADMINISTRATOR' : 'PASSENGER'}
                  </div>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="btn btn-outline"
                  style={{ width: '100%', borderColor: 'rgba(255,255,255,0.25)', color: '#ffffff', justifyContent: 'center' }}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Link 
                  to="/login" 
                  className="btn btn-outline" 
                  style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#ffffff', justifyContent: 'center' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LogIn size={16} />
                  <span>Login</span>
                </Link>
                <Link 
                  to="/register" 
                  className="btn btn-accent" 
                  style={{ justifyContent: 'center' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserPlus size={16} />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
