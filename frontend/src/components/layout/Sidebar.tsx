import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bus,
  Users,
  MapPin,
  CalendarClock,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', to: '/',          icon: LayoutDashboard },
  { label: 'Buses',     to: '/buses',     icon: Bus             },
  { label: 'Drivers',   to: '/drivers',   icon: Users           },
  { label: 'Routes',    to: '/routes',    icon: MapPin          },
  { label: 'Schedules', to: '/schedules', icon: CalendarClock   },
];

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-slate-900 flex flex-col fixed left-0 top-0 z-40">

      {/* ── Logo ── */}
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

      {/* ── Navigation ── */}
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

      {/* ── Footer ── */}
      <div className="px-5 py-4 border-t border-slate-700/50">
        <p className="text-slate-500 text-xs mb-2">
          📍 Hyderabad, India
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-slate-500 text-xs">API Connected</span>
        </div>
      </div>

    </aside>
  );
}