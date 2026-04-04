import { useState } from 'react';
import { Plus, Pencil, Trash2, Bus as BusIcon } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import StatusBadge from '../components/ui/StatusBadge';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import { busService } from '../services/busService';
import { useFetch } from '../hooks/useFetch';
import type { Bus } from '../types';
import { exportToCSV } from '../utils/exportCSV';
import { useRole } from '../hooks/useRole';

// ── Form default values ──
const emptyForm = { busNumber: '', capacity: '', status: 'active' as Bus['status'] };

export default function Buses() {
  const { data: buses, loading, error, refetch } = useFetch(busService.getAll);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { canEdit, canDelete } = useRole();

  // Search + filter
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');


  // ── Derived data ──
  const filtered = (buses ?? []).filter(b => {
    const matchSearch = b.busNumber.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || b.status === filter;
    return matchSearch && matchFilter;
  });

  const total = buses?.length ?? 0;
  const active = buses?.filter(b => b.status === 'active').length ?? 0;
  const maintenance = buses?.filter(b => b.status === 'maintenance').length ?? 0;
  const inactive = buses?.filter(b => b.status === 'inactive').length ?? 0;

  // ── Open modal for Add ──
  const openAdd = () => {
    setEditingBus(null);
    setForm(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  };

  // ── Open modal for Edit ──
  const openEdit = (bus: Bus) => {
    setEditingBus(bus);
    setForm({
      busNumber: bus.busNumber,
      capacity: String(bus.capacity),
      status: bus.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // ── Close modal ──
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBus(null);
    setForm(emptyForm);
    setFormError(null);
  };

  // ── Validate form ──
  const validate = () => {
    if (!form.busNumber.trim()) return 'Bus number is required';
    if (!form.capacity || Number(form.capacity) <= 0) return 'Capacity must be greater than 0';
    return null;
  };

  // ── Submit form (Add or Edit) ──
  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setFormError(validationError); return; }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        busNumber: form.busNumber.trim().toUpperCase(),
        capacity: Number(form.capacity),
        status: form.status,
      };

      if (editingBus) {
        await busService.update(editingBus._id, payload);
      } else {
        await busService.add(payload);
      }

      closeModal();
      refetch(); // refresh the list
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (bus: Bus) => {
    if (!window.confirm(`Delete bus ${bus.busNumber}? This cannot be undone.`)) return;
    try {
      await busService.delete(bus._id);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete bus');
    }
  };

  const handleExport = () => {
    const rows = (buses ?? []).map(b => ({
      BusNumber: b.busNumber,
      Capacity: b.capacity,
      Status: b.status,
      CreatedAt: new Date(b.createdAt).toLocaleDateString('en-IN'),
    }));
    exportToCSV('buses', rows);
  };

  return (
    <>
      <Topbar title="Buses" subtitle="Manage your fleet" />

      <div className="p-6 max-w-7xl mx-auto">

        {/* ── Page Header ── */}
        <PageHeader
          title="Fleet Management"
          subtitle="Add, edit and monitor all buses"
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
                  Add Bus
                </button>
              )}
            </div>
          }
        />

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Buses" value={total} subtitle="in fleet" icon={BusIcon} color="blue" loading={loading} />
          <StatCard title="Active" value={active} subtitle="on road" icon={BusIcon} color="green" loading={loading} />
          <StatCard title="Maintenance" value={maintenance} subtitle="being serviced" icon={BusIcon} color="amber" loading={loading} />
          <StatCard title="Inactive" value={inactive} subtitle="not in use" icon={BusIcon} color="purple" loading={loading} />
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">

          {/* Table toolbar */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            {/* Search */}
            <input
              type="text"
              placeholder="Search by bus number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {/* Filter */}
            <div className="flex items-center gap-2">
              {['all', 'active', 'maintenance', 'inactive'].map(f => (
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
              <BusIcon size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                {search || filter !== 'all' ? 'No buses match your search' : 'No buses added yet'}
              </p>
              {!search && filter === 'all' && (
                <button
                  onClick={openAdd}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  Add your first bus
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Bus Number', 'Capacity', 'Status', 'Created', ...(canEdit || canDelete ? ['Actions'] : [])].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(bus => (
                    <tr key={bus._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-gray-900">
                        {bus.busNumber}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {bus.capacity} seats
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={bus.status} />
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {bus.createdAt
                          ? new Date(bus.createdAt).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <button
                              onClick={() => openEdit(bus)}
                              className="flex items-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              <Pencil size={13} />
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(bus)}
                              className="flex items-center gap-1.5 text-xs text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
                Showing {filtered.length} of {total} buses
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingBus ? `Edit Bus — ${editingBus.busNumber}` : 'Add New Bus'}
      >
        <div className="space-y-4">

          {/* Bus Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Bus Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. DL-101"
              value={form.busNumber}
              onChange={e => setForm(f => ({ ...f, busNumber: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Capacity (seats) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Status
            </label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as Bus['status'] }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
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
              {submitting ? 'Saving...' : editingBus ? 'Update Bus' : 'Add Bus'}
            </button>
          </div>

        </div>
      </Modal>
    </>
  );
}