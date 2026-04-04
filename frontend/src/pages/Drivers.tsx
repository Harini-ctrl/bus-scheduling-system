import { useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import StatusBadge from '../components/ui/StatusBadge';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import { driverService } from '../services/driverService';
import { useFetch } from '../hooks/useFetch';
import type { Driver } from '../types';
import { useRole } from '../hooks/useRole';

const emptyForm = {
  name: '',
  licenseNumber: '',
  phone: '',
  shiftStart: '',
  shiftEnd: '',
  status: 'available' as Driver['status'],
};

export default function Drivers() {
  const { data: drivers, loading, error, refetch } = useFetch(driverService.getAll);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const { canEdit, canDelete } = useRole();

  // ── Derived data ──
  const filtered = (drivers ?? []).filter(d => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.licenseNumber.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || d.status === filter;
    return matchSearch && matchFilter;
  });

  const total = drivers?.length ?? 0;
  const available = drivers?.filter(d => d.status === 'available').length ?? 0;
  const onDuty = drivers?.filter(d => d.status === 'on-duty').length ?? 0;
  const onRest = drivers?.filter(d => d.status === 'on-rest').length ?? 0;

  // ── Open Add modal ──
  const openAdd = () => {
    setEditingDriver(null);
    setForm(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  };

  // ── Open Edit modal ──
  const openEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setForm({
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      phone: driver.phone ?? '',
      shiftStart: driver.shiftStart ?? '',
      shiftEnd: driver.shiftEnd ?? '',
      status: driver.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
    setForm(emptyForm);
    setFormError(null);
  };

  // ── Validate ──
  const validate = () => {
    if (!form.name.trim()) return 'Driver name is required';
    if (!form.licenseNumber.trim()) return 'License number is required';
    if (form.shiftStart && form.shiftEnd && form.shiftStart >= form.shiftEnd)
      return 'Shift end must be after shift start';
    return null;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setFormError(validationError); return; }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        name: form.name.trim(),
        licenseNumber: form.licenseNumber.trim().toUpperCase(),
        phone: form.phone.trim(),
        shiftStart: form.shiftStart,
        shiftEnd: form.shiftEnd,
        status: form.status,
      };

      if (editingDriver) {
        await driverService.update(editingDriver._id, payload);
      } else {
        await driverService.add(payload);
      }

      closeModal();
      refetch();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (driver: Driver) => {
    if (!window.confirm(`Delete driver ${driver.name}? This cannot be undone.`)) return;
    try {
      await driverService.delete(driver._id);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete driver');
    }
  };

  // ── Rest until display ──
  const formatRestUntil = (restUntil?: string | null) => {
    if (!restUntil) return null;
    const date = new Date(restUntil);
    if (date < new Date()) return null; // rest period already over
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <Topbar title="Drivers" subtitle="Manage your drivers" />

      <div className="p-6 max-w-7xl mx-auto">

        {/* ── Page Header ── */}
        <PageHeader
          title="Driver Management"
          subtitle="Add, edit and monitor all drivers"
          action={
            canEdit && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                <Plus size={16} />
                Add Driver
              </button>
            )
          }
        />

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Drivers" value={total} subtitle="registered" icon={Users} color="blue" loading={loading} />
          <StatCard title="Available" value={available} subtitle="ready" icon={Users} color="green" loading={loading} />
          <StatCard title="On Duty" value={onDuty} subtitle="driving" icon={Users} color="amber" loading={loading} />
          <StatCard title="On Rest" value={onRest} subtitle="resting" icon={Users} color="purple" loading={loading} />
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">

          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <input
              type="text"
              placeholder="Search by name or license..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex items-center gap-2 flex-wrap">
              {['all', 'available', 'on-duty', 'on-rest', 'off-duty'].map(f => (
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
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                {search || filter !== 'all' ? 'No drivers match your search' : 'No drivers added yet'}
              </p>
              {!search && filter === 'all' && (
                <button
                  onClick={openAdd}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  Add your first driver
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                  {['Name', 'License', 'Phone', 'Shift', 'Status', ...(canEdit || canDelete ? ['Actions'] : [])].map(h => (
  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
    {h}
  </th>
))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(driver => {
                    const restUntil = formatRestUntil(driver.restUntil);
                    return (
                      <tr key={driver._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-gray-900">
                          {driver.name}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">
                          {driver.licenseNumber}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">
                          {driver.phone || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs">
                          {driver.shiftStart && driver.shiftEnd
                            ? `${driver.shiftStart} – ${driver.shiftEnd}`
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={driver.status} />
                            {restUntil && (
                              <span className="text-xs text-purple-500">
                                Rest until {restUntil}
                              </span>
                            )}
                          </div>
                        </td>
                       {(canEdit || canDelete) && (
  <td className="px-5 py-3.5">
    <div className="flex items-center gap-2">
      {canEdit && (
        <button
          onClick={() => openEdit(driver)}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <Pencil size={13} />
          Edit
        </button>
      )}
      {canDelete && (
        <button
          onClick={() => handleDelete(driver)}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <Trash2 size={13} />
          Delete
        </button>
      )}
    </div>
  </td>
)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
                Showing {filtered.length} of {total} drivers
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDriver ? `Edit Driver — ${editingDriver.name}` : 'Add New Driver'}
      >
        <div className="space-y-4">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* License Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              License Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. DL-2024-001"
              value={form.licenseNumber}
              onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Phone Number
            </label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Shift Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Shift Start
              </label>
              <input
                type="time"
                value={form.shiftStart}
                onChange={e => setForm(f => ({ ...f, shiftStart: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Shift End
              </label>
              <input
                type="time"
                value={form.shiftEnd}
                onChange={e => setForm(f => ({ ...f, shiftEnd: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Status
            </label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as Driver['status'] }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="available">Available</option>
              <option value="on-duty">On Duty</option>
              <option value="on-rest">On Rest</option>
              <option value="off-duty">Off Duty</option>
            </select>
          </div>

          {/* Form Error */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              ⚠ {formError}
            </div>
          )}

          {/* Buttons */}
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
              {submitting ? 'Saving...' : editingDriver ? 'Update Driver' : 'Add Driver'}
            </button>
          </div>

        </div>
      </Modal>
    </>
  );
}