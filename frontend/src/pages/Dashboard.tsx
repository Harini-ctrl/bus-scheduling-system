import { useEffect, useState } from 'react';
import { Bus, Users, MapPin, CalendarClock } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { busService } from '../services/busService';
import { driverService } from '../services/driverService';
import { routeService } from '../services/routeService';
import { scheduleService } from '../services/scheduleService';
import type { Bus as BusType, Driver, Route, Schedule } from '../types';

export default function Dashboard() {
  const [buses, setBuses]         = useState<BusType[]>([]);
  const [drivers, setDrivers]     = useState<Driver[]>([]);
  const [routes, setRoutes]       = useState<Route[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      busService.getAll(),
      driverService.getAll(),
      routeService.getAll(),
      scheduleService.getAll(),
    ])
      .then(([b, d, r, s]) => {
        setBuses(b);
        setDrivers(d);
        setRoutes(r);
        setSchedules(s);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load data. Is backend running?'))
      .finally(() => setLoading(false));
  }, []);

  // Computed stats
  const activeBuses      = buses.filter(b => b.status === 'active').length;
  const availableDrivers = drivers.filter(d => d.status === 'available').length;
  const linkedSchedules  = schedules.filter(s => s.dutyType === 'linked').length;

  return (
    <>
      <Topbar title="Dashboard" subtitle="Delhi Transport Corporation" />

      <div className="p-6 max-w-7xl mx-auto">

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Buses"
            value={buses.length}
            subtitle={`${activeBuses} active`}
            icon={Bus}
            color="blue"
            loading={loading}
          />
          <StatCard
            title="Total Drivers"
            value={drivers.length}
            subtitle={`${availableDrivers} available`}
            icon={Users}
            color="green"
            loading={loading}
          />
          <StatCard
            title="Total Routes"
            value={routes.length}
            subtitle="configured"
            icon={MapPin}
            color="amber"
            loading={loading}
          />
          <StatCard
            title="Total Schedules"
            value={schedules.length}
            subtitle={`${linkedSchedules} linked`}
            icon={CalendarClock}
            color="purple"
            loading={loading}
          />
        </div>

        {/* ── Two column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Schedules — takes 2/3 width */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Recent Schedules</h2>
                <p className="text-xs text-gray-400 mt-0.5">{schedules.length} total schedules</p>
              </div>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : schedules.length === 0 ? (
              <div className="py-16 text-center">
                <CalendarClock size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No schedules yet</p>
                <p className="text-xs text-gray-300 mt-1">Create a schedule to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Bus', 'Driver', 'Route', 'Departure', 'Duty', 'Status'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {schedules.slice(0, 6).map(s => (
                      <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-semibold text-gray-900">
                          {s.busId?.busNumber ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {s.driverId?.name ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {s.routeId?.routeName ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {s.departureTime}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={s.dutyType} />
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right column — Fleet summary */}
          <div className="space-y-4">

            {/* Bus status breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Fleet Status</h3>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: 'Active',      value: buses.filter(b => b.status === 'active').length,      color: 'bg-green-500' },
                    { label: 'Maintenance', value: buses.filter(b => b.status === 'maintenance').length,  color: 'bg-amber-500' },
                    { label: 'Inactive',    value: buses.filter(b => b.status === 'inactive').length,     color: 'bg-red-400'   },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                        <span className="text-xs text-gray-600">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-full`}
                            style={{ width: buses.length ? `${(value / buses.length) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-4 text-right">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Driver status breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Driver Status</h3>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: 'Available', value: drivers.filter(d => d.status === 'available').length, color: 'bg-green-500'  },
                    { label: 'On Duty',   value: drivers.filter(d => d.status === 'on-duty').length,   color: 'bg-blue-500'   },
                    { label: 'On Rest',   value: drivers.filter(d => d.status === 'on-rest').length,   color: 'bg-purple-500' },
                    { label: 'Off Duty',  value: drivers.filter(d => d.status === 'off-duty').length,  color: 'bg-gray-400'   },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                        <span className="text-xs text-gray-600">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-full`}
                            style={{ width: drivers.length ? `${(value / drivers.length) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-4 text-right">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick stats */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-2">
                {[
                  { label: 'Linked Duties',   value: linkedSchedules },
                  { label: 'Unlinked Duties', value: schedules.filter(s => s.dutyType === 'unlinked').length },
                  { label: 'Completed',        value: schedules.filter(s => s.status === 'completed').length },
                  { label: 'Cancelled',        value: schedules.filter(s => s.status === 'cancelled').length },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-bold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}