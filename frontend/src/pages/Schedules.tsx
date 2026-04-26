import { useState } from 'react';
import {
  Plus, Trash2, CalendarClock,
  AlertTriangle, CheckCircle, Clock, XCircle
} from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { scheduleService } from '../services/scheduleService';
import { busService } from '../services/busService';
import { driverService } from '../services/driverService';
import { routeService } from '../services/routeService';
import { useFetch } from '../hooks/useFetch';
import type { Schedule } from '../types';
import type { CreateScheduleInput } from '../services/scheduleService';
import { exportToCSV } from '../utils/exportCSV';
import { useRole } from '../hooks/useRole';

const emptyForm: CreateScheduleInput = {
  busId: '',
  driverId: '',
  routeId: '',
  departureTime: '',
  arrivalTime: '',
  dutyType: 'linked',
  restDuration: 30,
};

export default function Schedules() {
  const { data: schedules, loading, error, refetch } = useFetch(scheduleService.getAll);
  const { data: buses } = useFetch(busService.getAll);
  const { data: drivers } = useFetch(driverService.getAll);
  const { data: routes } = useFetch(routeService.getAll);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<CreateScheduleInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { canEdit, canDelete } = useRole();

  // ── Derived stats ──
  const total = schedules?.length ?? 0;
  const scheduled = schedules?.filter(s => s.status === 'scheduled').length ?? 0;
  const active = schedules?.filter(s => s.status === 'active').length ?? 0;
  const completed = schedules?.filter(s => s.status === 'completed').length ?? 0;

  // ── Filtered list ──
  const filtered = (schedules ?? []).filter(s =>
    filter === 'all' || s.status === filter || s.dutyType === filter
  );

  // ── Open modal ──
  const openAdd = () => {
    setForm(emptyForm);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(emptyForm);
    setFormError(null);
    setFormSuccess(null);
  };

  // ── Validate ──
  const validate = () => {
    if (!form.busId) return 'Please select a bus';
    if (!form.driverId) return 'Please select a driver';
    if (!form.routeId) return 'Please select a route';
    if (!form.departureTime) return 'Departure time is required';
    if (!form.arrivalTime) return 'Arrival time is required';
    // Same time is not allowed — overnight is fine
    if (form.departureTime === form.arrivalTime)
      return 'Departure and arrival time cannot be the same';
    return null;
  };
  // ── Submit ──
  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setFormError(validationError); return; }

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const response = await scheduleService.add(form);
      setFormSuccess(response.message || 'Schedule created successfully');
      refetch();
      // Close after short delay so user sees success message
      setTimeout(() => closeModal(), 1500);
    } catch (err: any) {
      // Backend conflict errors show here
      setFormError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update status ──
  const handleStatusUpdate = async (schedule: Schedule, status: Schedule['status']) => {
    setUpdatingId(schedule._id);
    try {
      await scheduleService.updateStatus(schedule._id, status);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Delete ──
  const handleDelete = async (schedule: Schedule) => {
    const busNumber = schedule.busId?.busNumber ?? 'this schedule';
    if (!window.confirm(`Delete schedule for ${busNumber}?`)) return;
    try {
      await scheduleService.delete(schedule._id);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ── Status action buttons ──
  const getStatusActions = (schedule: Schedule) => {
    const isUpdating = updatingId === schedule._id;
    const btn = (label: string, status: Schedule['status'], icon: React.ReactNode, style: string) => (
      <button
        key={status}
        onClick={() => handleStatusUpdate(schedule, status)}
        disabled={isUpdating}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-50 ${style}`}
      >
        {icon}
        {isUpdating ? '...' : label}
      </button>
    );

    switch (schedule.status) {
      case 'scheduled':
        return [
          btn('Activate', 'active', <CheckCircle size={11} />, 'text-green-600 hover:bg-green-50'),
          btn('Cancel', 'cancelled', <XCircle size={11} />, 'text-red-500 hover:bg-red-50'),
        ];
      case 'active':
        return [
          btn('Complete', 'completed', <CheckCircle size={11} />, 'text-blue-600 hover:bg-blue-50'),
          btn('Cancel', 'cancelled', <XCircle size={11} />, 'text-red-500 hover:bg-red-50'),
        ];
      default:
        return [];
    }
  };
  const handleExport = () => {
    const rows = (schedules ?? []).map(s => ({
      Bus: s.busId?.busNumber ?? '—',
      Driver: s.driverId?.name ?? '—',
      Route: s.routeId?.routeName ?? '—',
      DepartureTime: s.departureTime,
      ArrivalTime: s.arrivalTime,
      DutyType: s.dutyType,
      Status: s.status,
    }));
    exportToCSV('schedules', rows);
  };

  return (
    <>
      <Topbar title="Schedules" subtitle="Duty scheduling and conflict management" />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <PageHeader
          title="Schedule Management"
          subtitle="Create linked and unlinked duty schedules"
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                Export CSV
              </button>
              {canEdit && (
                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  New Schedule
                </button>
              )}
            </div>
          }
        />

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total" value={total} subtitle="schedules" icon={CalendarClock} color="blue" loading={loading} />
          <StatCard title="Scheduled" value={scheduled} subtitle="upcoming" icon={Clock} color="amber" loading={loading} />
          <StatCard title="Active" value={active} subtitle="running" icon={CheckCircle} color="green" loading={loading} />
          <StatCard title="Completed" value={completed} subtitle="done" icon={CheckCircle} color="purple" loading={loading} />
        </div>

        {/* ── Table card ── */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">

          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {['all', 'scheduled', 'active', 'completed', 'cancelled', 'linked', 'unlinked'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400">
              {filtered.length} of {total} schedules
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              ⚠ {error}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarClock size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                {filter !== 'all' ? `No ${filter} schedules` : 'No schedules yet'}
              </p>
              {filter === 'all' && (
                <button
                  onClick={openAdd}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  Create first schedule
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop table */}
              <table className="w-full text-sm hidden md:table">
                <thead className="bg-gray-50">
                  <tr>
                    {['Bus', 'Driver', 'Route', 'Time', 'Duty Type', 'Status', ...(canDelete ? ['Actions'] : [])].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(s => (
                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-gray-900">{s.busId?.busNumber ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-medium text-gray-800">{s.driverId?.name ?? '—'}</p>
                          {s.driverId?.restUntil && new Date(s.driverId.restUntil) > new Date() && (
                            <p className="text-xs text-purple-500 mt-0.5">
                              Rest until {new Date(s.driverId.restUntil).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{s.routeId?.routeName ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600 text-xs">
                        <div className="flex items-center gap-1">
                          <Clock size={11} className="text-gray-400" />
                          {s.departureTime} → {s.arrivalTime}
                          {s.arrivalTime < s.departureTime && <span className="text-xs text-amber-500 ml-1">+1 day</span>}
                        </div>
                        {s.dutyType === 'unlinked' && <p className="text-purple-500 mt-0.5">+{s.restDuration}min rest</p>}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={s.dutyType} /></td>
                      <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                      {(canEdit || canDelete) && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            {getStatusActions(s)}
                            {canDelete && (
                              <button onClick={() => handleDelete(s)} className="flex items-center gap-1 text-xs text-red-400 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors">
                                <Trash2 size={11} />Delete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-50">
                {filtered.map(s => (
                  <div key={s._id} className="px-4 py-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-900">{s.busId?.busNumber ?? '—'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.driverId?.name ?? '—'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={s.status} />
                        <StatusBadge status={s.dutyType} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">{s.routeId?.routeName ?? '—'}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                      <Clock size={11} className="text-gray-400" />
                      {s.departureTime} → {s.arrivalTime}
                      {s.arrivalTime < s.departureTime && <span className="text-amber-500 ml-1">+1 day</span>}
                    </p>
                    {(canEdit || canDelete) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getStatusActions(s)}
                        {canDelete && (
                          <button onClick={() => handleDelete(s)} className="flex items-center gap-1 text-xs text-red-400 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors">
                            <Trash2 size={11} />Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Schedule Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Create New Schedule"
      >
        <div className="space-y-4">

          {/* Success message */}
          {formSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 flex items-center gap-2">
              <CheckCircle size={14} />
              {formSuccess}
            </div>
          )}

          {/* Duty type toggle — most important field, shown first */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Duty Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['linked', 'unlinked'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setForm(f => ({ ...f, dutyType: type }))}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium border-2 transition-all capitalize ${form.dutyType === type
                    ? type === 'linked'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {form.dutyType === 'linked'
                ? 'Driver stays with the same bus for entire shift'
                : 'Driver hands over bus after trip and gets rest period'}
            </p>
          </div>

          {/* Bus */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Bus <span className="text-red-500">*</span>
            </label>
            <select
              value={form.busId}
              onChange={e => setForm(f => ({ ...f, busId: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a bus</option>
              {(buses ?? []).map(bus => (
                <option key={bus._id} value={bus._id}>
                  {bus.busNumber} — {bus.capacity} seats ({bus.status})
                </option>
              ))}
            </select>
          </div>

          {/* Driver */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Driver <span className="text-red-500">*</span>
            </label>
            <select
              value={form.driverId}
              onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a driver</option>
              {(drivers ?? []).map(driver => (
                <option
                  key={driver._id}
                  value={driver._id}
                  disabled={driver.status === 'on-rest'}
                >
                  {driver.name} — {driver.licenseNumber}
                  {driver.status === 'on-rest' ? ' (on rest)' : ''}
                  {driver.status === 'on-duty' ? ' (on duty)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Route */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Route <span className="text-red-500">*</span>
            </label>
            <select
              value={form.routeId}
              onChange={e => setForm(f => ({ ...f, routeId: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a route</option>
              {(routes ?? []).map(route => (
                <option key={route._id} value={route._id}>
                  {route.routeName} — {route.startLocation} → {route.endLocation}
                </option>
              ))}
            </select>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Departure <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.departureTime}
                onChange={e => setForm(f => ({ ...f, departureTime: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Arrival <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.arrivalTime}
                onChange={e => setForm(f => ({ ...f, arrivalTime: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Rest duration — only for unlinked */}
          {form.dutyType === 'unlinked' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Rest Duration (minutes)
              </label>
              <input
                type="number"
                value={form.restDuration}
                onChange={e => setForm(f => ({ ...f, restDuration: Number(e.target.value) }))}
                min={10}
                max={120}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Driver will be blocked from new schedules for this duration after completion
              </p>
            </div>
          )}

          {/* Conflict error from backend */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Buttons */}
          {!formSuccess && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={closeModal}
                className="flex-1 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition-colors"
              >
                {submitting ? 'Checking conflicts...' : 'Create Schedule'}
              </button>
            </div>
          )}

        </div>
      </Modal>
    </>
  );
}