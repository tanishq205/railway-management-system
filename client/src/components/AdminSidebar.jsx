import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPin, 
  Train, 
  Armchair, 
  CalendarClock, 
  BookOpenCheck, 
  ScrollText, 
  Terminal 
} from 'lucide-react';

export default function AdminSidebar() {
  const menuItems = [
    { to: '/admin', label: 'Dashboard Overview', icon: <LayoutDashboard size={18} />, end: true },
    { to: '/admin/stations', label: 'Station Management', icon: <MapPin size={18} /> },
    { to: '/admin/trains', label: 'Trains & Routes', icon: <Train size={18} /> },
    { to: '/admin/coaches', label: 'Coaches & Seat Repair', icon: <Armchair size={18} /> },
    { to: '/admin/runs', label: 'Train Runs & Delays', icon: <CalendarClock size={18} /> },
    { to: '/admin/bookings', label: 'Bookings & Waitlist', icon: <BookOpenCheck size={18} /> },
    { to: '/admin/audit-logs', label: 'System Audit Logs', icon: <ScrollText size={18} /> },
    { to: '/admin/queries', label: 'DBMS Viva SQL Guide', icon: <Terminal size={18} /> }
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Train size={18} style={{ color: '#ef4444' }} />
          <span>Control Panel</span>
        </div>
      </div>
      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
