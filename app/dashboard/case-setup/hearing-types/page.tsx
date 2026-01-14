'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const PRIMARY = '#278DCD';
const HOVER = '#3BB143';

type HearingTypeRow = {
  id: string;
  type_code: string;
  name: string;
  description: string | null;
  duration_min: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: string; type: ToastType; message: string };

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return iso;
  }
}

function Toasts({ toasts, remove }: { toasts: Toast[]; remove: (id: string) => void }) {
  return (
    <div className="fixed right-5 top-5 z-[999] space-y-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'w-[340px] rounded-xl border bg-white p-4 shadow-lg',
            t.type === 'success' && 'border-green-200',
            t.type === 'error' && 'border-red-200',
            t.type === 'info' && 'border-blue-200'
          )}
        >
          <div className="flex items-start gap-3">
            {t.type === 'success' && <CheckCircleIcon className="h-5 w-5 text-green-600" />}
            {t.type === 'error' && <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />}
            {t.type === 'info' && <InformationCircleIcon className="h-5 w-5 text-blue-600" />}
            <div className="flex-1">
              <p className="text-sm text-black">{t.message}</p>
            </div>
            <button onClick={() => remove(t.id)} className="text-gray-500 hover:text-black">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border',
        active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h3 className="text-lg font-semibold text-black">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function HearingTypesPage() {
  const [rows, setRows] = useState<HearingTypeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<HearingTypeRow | null>(null);

  // form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMin, setDurationMin] = useState<number>(30);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = (type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };
  const removeToast = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));

  const from = useMemo(() => (page - 1) * perPage, [page, perPage]);
  const to = useMemo(() => from + perPage - 1, [from, perPage]);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const showingFrom = total === 0 ? 0 : from + 1;
  const showingTo = Math.min(total, to + 1);

  function openAdd() {
    setEditRow(null);
    setName('');
    setDescription('');
    setDurationMin(30);
    setIsActive(true);
    setModalOpen(true);
  }

  function openEdit(r: HearingTypeRow) {
    setEditRow(r);
    setName(r.name);
    setDescription(r.description ?? '');
    setDurationMin(r.duration_min);
    setIsActive(r.is_active);
    setModalOpen(true);
  }

  async function fetchRows() {
    setLoading(true);
    try {
      let query = supabase
        .from('hearing_types')
        .select('id,type_code,name,description,duration_min,is_active,created_at,updated_at', { count: 'exact' });

      if (q.trim()) {
        // search in both type_code and name
        // NOTE: Supabase OR syntax for PostgREST
        const search = q.trim().replaceAll(',', ''); // avoid OR parsing issues
        query = query.or(`type_code.ilike.%${search}%,name.ilike.%${search}%`);
      }

      if (statusFilter === 'active') query = query.eq('is_active', true);
      if (statusFilter === 'inactive') query = query.eq('is_active', false);

      const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;

      setRows((data as HearingTypeRow[]) ?? []);
      setTotal(count ?? 0);
    } catch (e: any) {
      toast('error', e?.message ?? 'Failed to load hearing types.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, statusFilter]);

  // debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchRows();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function save() {
    if (!name.trim()) {
      toast('error', 'Hearing type name is required.');
      return;
    }
    if (!Number.isFinite(durationMin) || durationMin <= 0 || durationMin > 1440) {
      toast('error', 'Duration must be between 1 and 1440 minutes.');
      return;
    }

    setSaving(true);
    try {
      if (editRow) {
        const { error } = await supabase
          .from('hearing_types')
          .update({
            name: name.trim(),
            description: description.trim() ? description.trim() : null,
            duration_min: Math.floor(durationMin),
            is_active: isActive,
          })
          .eq('id', editRow.id);

        if (error) throw error;
        toast('success', 'Hearing type updated.');
      } else {
        // type_code will be auto-generated by trigger
        const { error } = await supabase.from('hearing_types').insert({
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          duration_min: Math.floor(durationMin),
          is_active: isActive,
          type_code: null, // explicit, to trigger generation
        });

        if (error) throw error;
        toast('success', 'Hearing type created.');
      }

      setModalOpen(false);
      await fetchRows();
    } catch (e: any) {
      toast('error', e?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: HearingTypeRow) {
    try {
      const { error } = await supabase.from('hearing_types').update({ is_active: !r.is_active }).eq('id', r.id);
      if (error) throw error;
      toast('success', r.is_active ? 'Marked inactive.' : 'Marked active.');
      await fetchRows();
    } catch (e: any) {
      toast('error', e?.message ?? 'Failed to update status.');
    }
  }

  async function remove(r: HearingTypeRow) {
    const ok = confirm(`Delete "${r.name}" (${r.type_code})? This cannot be undone.`);
    if (!ok) return;

    try {
      const { error } = await supabase.from('hearing_types').delete().eq('id', r.id);
      if (error) throw error;

      toast('success', 'Deleted.');
      if (rows.length === 1 && page > 1) setPage(page - 1);
      else await fetchRows();
    } catch (e: any) {
      toast('error', e?.message ?? 'Delete failed.');
    }
  }

  return (
    <div className="space-y-5">
      <Toasts toasts={toasts} remove={removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black">Hearing Types</h1>

        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white shadow-sm"
          style={{ backgroundColor: HOVER }}
          onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = PRIMARY))}
          onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = HOVER))}
        >
          <PlusIcon className="h-5 w-5" />
          Add Hearing Type
        </button>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-xl border px-10 py-2 text-black placeholder:text-black/60 focus:outline-none focus:ring-2"
              />
            </div>

            <button
              onClick={() => {
                setPage(1);
                fetchRows();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-white"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = HOVER))}
              onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = PRIMARY))}
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              Search
            </button>

            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-black hover:bg-gray-50"
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
            </button>
          </div>

          <div className="flex items-center justify-end gap-3">
            <span className="text-sm text-gray-600">Per Page:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="rounded-xl border px-3 py-2 text-black"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters */}
        {filtersOpen && (
          <div className="mt-4 rounded-xl border bg-gray-50 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="w-full md:max-w-xs">
                <label className="mb-1 block text-sm font-medium text-black">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border px-3 py-2 text-black"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setPage(1);
                    toast('info', 'Filters cleared.');
                  }}
                  className="rounded-xl border px-4 py-2 text-black hover:bg-white"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    setFiltersOpen(false);
                    setPage(1);
                    fetchRows();
                    toast('info', 'Filters applied.');
                  }}
                  className="rounded-xl px-4 py-2 text-white"
                  style={{ backgroundColor: PRIMARY }}
                  onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = HOVER))}
                  onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = PRIMARY))}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-600">
                <th className="px-5 py-4">#</th>
                <th className="px-5 py-4">Type ID</th>
                <th className="px-5 py-4">Hearing Type</th>
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">Duration (min)</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Created At</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-5 py-6 text-black" colSpan={8}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-black" colSpan={8}>
                    No hearing types found.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-5 py-4 text-black">{showingFrom + idx}</td>
                    <td className="px-5 py-4 text-black">{r.type_code}</td>
                    <td className="px-5 py-4 font-medium text-black">{r.name}</td>
                    <td className="px-5 py-4 text-black">{r.description ?? '—'}</td>
                    <td className="px-5 py-4 text-black">{r.duration_min} min</td>
                    <td className="px-5 py-4">
                      <StatusBadge active={r.is_active} />
                    </td>
                    <td className="px-5 py-4 text-black">{formatDate(r.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <button
                          title="View (placeholder)"
                          onClick={() => toast('info', 'View page can be added later.')}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>

                        <button
                          title="Edit"
                          onClick={() => openEdit(r)}
                          className="text-orange-500 hover:text-orange-700"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>

                        <button
                          title={r.is_active ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleActive(r)}
                          className="text-orange-500 hover:text-orange-700"
                        >
                          {r.is_active ? <LockClosedIcon className="h-5 w-5" /> : <LockOpenIcon className="h-5 w-5" />}
                        </button>

                        <button title="Delete" onClick={() => remove(r)} className="text-red-500 hover:text-red-700">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t px-5 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-gray-600">
            Showing {showingFrom} to {showingTo} of {total} hearing types
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={cn(
                'rounded-xl border px-4 py-2 text-sm',
                page <= 1 ? 'text-gray-400' : 'text-black hover:bg-gray-50'
              )}
            >
              Previous
            </button>

            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: PRIMARY }}>
              {page}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={cn(
                'rounded-xl border px-4 py-2 text-sm',
                page >= totalPages ? 'text-gray-400' : 'text-black hover:bg-gray-50'
              )}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} title={editRow ? 'Edit Hearing Type' : 'Add Hearing Type'} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-black">Hearing Type</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-black placeholder:text-black/60"
              placeholder="e.g. Motion Hearing"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-black placeholder:text-black/60"
              placeholder="Short description..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Duration (minutes)</label>
              <input
                type="number"
                min={1}
                max={1440}
                value={durationMin}
                onChange={(e) => setDurationMin(parseInt(e.target.value || '0', 10))}
                className="w-full rounded-xl border px-3 py-2 text-black"
                placeholder="30"
              />
              <p className="mt-1 text-xs text-gray-500">Allowed range: 1–1440 minutes</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">Status</label>
              <select
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive(e.target.value === 'active')}
                className="w-full rounded-xl border px-3 py-2 text-black"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {!editRow && (
                <p className="mt-2 text-xs text-gray-500">
                  Type ID will be auto-generated (e.g. <span className="font-mono">HT000001</span>).
                </p>
              )}
              {editRow && (
                <p className="mt-2 text-xs text-gray-500">
                  Type ID: <span className="font-mono">{editRow.type_code}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="rounded-xl border px-4 py-2 text-black hover:bg-gray-50">
              Cancel
            </button>

            <button
              disabled={saving}
              onClick={save}
              className="rounded-xl px-4 py-2 text-white disabled:opacity-60"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = HOVER))}
              onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = PRIMARY))}
            >
              {saving ? 'Saving...' : editRow ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
