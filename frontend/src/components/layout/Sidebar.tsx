import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Bus, Users,
  MapPin, CalendarClock, LogOut, Shield,
} from 'lucide-react';
import { authService } from '../../services/authService';

const navItems = [
  { label: 'Dashboard', to: '/',          icon: LayoutDashboard },
  { label: 'Buses',     to: '/buses',     icon: Bus             },
  { label: 'Drivers',   to: '/drivers',   icon: Users           },
  { label: 'Routes',    to: '/routes',    icon: MapPin          },
  { label: 'Schedules', to: '/schedules', icon: CalendarClock   },
];

const roleColors = {
  admin:     'bg-red-500/20 text-red-400',
  scheduler: 'bg-blue-500/20 text-blue-400',
  viewer:    'bg-gray-500/20 text-gray-400',
};

export default function Sidebar() {
  const user = authService.getUser();

const handleLogout = () => {
  if (window.confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.replace('/login');
  }
};
  return (
    <aside className="w-56 min-h-screen bg-slate-900 flex flex-col fixed left-0 top-0 z-40">

      {/* Logo */}
      <div className="px-5 py-6 border-b border-slate-700/50">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
            DTC
          </div>
          <span className="text-slate-400 text-xs">v1.0</span>
        </div>
        <h1 className="text-white text-sm font-semibold leading-snug">
          Bus Scheduling System
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Delhi Transport Corporation
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mb-3">
          Main Menu
        </p>
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-slate-700/50 space-y-3">

        {/* Logged in user */}
        {user && (
          <div className="bg-slate-800 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate">{user.name}</p>
                <p className="text-slate-500 text-xs truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield size={10} className="text-slate-500" />
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded capitalize ${roleColors[user.role]}`}>
                {user.role}
              </span>
            </div>
          </div>
        )}

        {/* API status */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-slate-500 text-xs">API Connected</span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 px-3 py-2 rounded-lg transition-colors text-xs font-medium"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>

    </aside>
  );
}