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

type EventTypeOpt = { id: string; name: string; color_hex: string; is_active: boolean };

type CaseMeta = {
  title: string;
  filing_date: string | null; // date column -> "YYYY-MM-DD"
};

type TimelineRow = {
  id: string;
  case_id: string;

  title: string;
  description: string | null;

  event_date: string; // YYYY-MM-DD
  completed: boolean;
  is_active: boolean;

  created_at: string;

event_types?: { id: string; name: string; color_hex: string }[]; // Supabase returns array
};

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: string; type: ToastType; message: string };

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
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
          <h3 className="text-xl font-semibold text-black">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}

function CompletedBadge({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border',
        value ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
      )}
    >
      {value ? 'Yes' : 'No'}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border',
        active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function TimelineTab({ caseId }: { caseId: string }) {
  // list state
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // search/filters
  const [q, setQ] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [completedFilter, setCompletedFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // event types
  const [eventTypes, setEventTypes] = useState<EventTypeOpt[]>([]);

  // case meta (for pinned Case Filed row)
  const [caseMeta, setCaseMeta] = useState<CaseMeta | null>(null);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<TimelineRow | null>(null);
  const [saving, setSaving] = useState(false);

  // form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventTypeId, setEventTypeId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [completed, setCompleted] = useState(false);
  const [isActive, setIsActive] = useState(true);

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

  const milestoneType = useMemo(() => {
    const m = eventTypes.find((x) => x.name.toLowerCase() === 'milestone');
    return m ?? null;
  }, [eventTypes]);

  function openAdd() {
    setEditRow(null);
    setTitle('');
    setDescription('');
    setEventTypeId('');
    setEventDate('');
    setCompleted(false);
    setIsActive(true);
    setModalOpen(true);
  }

  function openEdit(r: TimelineRow) {
    setEditRow(r);
    setTitle(r.title);
    setDescription(r.description ?? '');
setEventTypeId(r.event_types?.[0]?.id ?? '');
    setEventDate(r.event_date ?? '');
    setCompleted(Boolean(r.completed));
    setIsActive(Boolean(r.is_active));
    setModalOpen(true);
  }

  async function fetchEventTypes() {
    const { data, error } = await supabase
      .from('event_types')
      .select('id,name,color_hex,is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) toast('error', error.message);
    setEventTypes((data as EventTypeOpt[]) ?? []);
  }

  async function fetchCaseMeta() {
    const { data, error } = await supabase
      .from('cases')
      .select('title,filing_date')
      .eq('id', caseId)
      .single();

    if (error) {
      toast('error', error.message);
      return;
    }

    setCaseMeta(data as CaseMeta);
  }

  async function fetchRows() {
    setLoading(true);
    try {
      let query = supabase
        .from('case_timeline_events')
        .select(
          `
          id,case_id,title,description,event_date,completed,is_active,created_at,
          event_types:event_type_id ( id,name,color_hex )
        `,
          { count: 'exact' }
        )
        .eq('case_id', caseId);

      if (q.trim()) {
        const s = q.trim();
        query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
      }

      if (statusFilter === 'active') query = query.eq('is_active', true);
      if (statusFilter === 'inactive') query = query.eq('is_active', false);

      if (completedFilter === 'yes') query = query.eq('completed', true);
      if (completedFilter === 'no') query = query.eq('completed', false);

      if (typeFilter !== 'all') query = query.eq('event_type_id', typeFilter);

      const { data, error, count } = await query.order('event_date', { ascending: false }).range(from, to);

      if (error) throw error;

setRows((data ?? []) as TimelineRow[]);
      setTotal(count ?? 0);
    } catch (e: any) {
      toast('error', e?.message ?? 'Failed to load timeline events.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEventTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!caseId) return;
    fetchCaseMeta();
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, page, perPage, statusFilter, completedFilter, typeFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchRows();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function save() {
    if (!title.trim()) return toast('error', 'Event Title is required.');
    if (!eventTypeId) return toast('error', 'Event Type is required.');
    if (!eventDate) return toast('error', 'Event Date is required.');

    setSaving(true);
    try {
      const payload: any = {
        case_id: caseId,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        event_type_id: eventTypeId,
        event_date: eventDate,
        completed,
        is_active: isActive,
      };

      if (editRow) {
        const { error } = await supabase.from('case_timeline_events').update(payload).eq('id', editRow.id);
        if (error) throw error;
        toast('success', 'Timeline event updated.');
      } else {
        const { error } = await supabase.from('case_timeline_events').insert(payload);
        if (error) throw error;
        toast('success', 'Timeline event created.');
      }

      setModalOpen(false);
      await fetchRows();
    } catch (e: any) {
      toast('error', e?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: TimelineRow) {
    try {
      const { error } = await supabase.from('case_timeline_events').update({ is_active: !r.is_active }).eq('id', r.id);
      if (error) throw error;

      toast('success', r.is_active ? 'Marked inactive.' : 'Marked active.');
      await fetchRows();
    } catch (e: any) {
      toast('error', e?.message ?? 'Failed to update status.');
    }
  }

  async function remove(r: TimelineRow) {
    const ok = confirm(`Delete "${r.title}"? This cannot be undone.`);
    if (!ok) return;

    try {
      const { error } = await supabase.from('case_timeline_events').delete().eq('id', r.id);
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

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-black">Timeline</h2>

        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white shadow-sm"
          style={{ backgroundColor: HOVER }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
        >
          <PlusIcon className="h-5 w-5" />
          Add Event
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
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
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

              <div>
                <label className="mb-1 block text-sm font-medium text-black">Completed</label>
                <select
                  value={completedFilter}
                  onChange={(e) => {
                    setCompletedFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border px-3 py-2 text-black"
                >
                  <option value="all">All</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">Event Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border px-3 py-2 text-black"
                >
                  <option value="all">All</option>
                  {eventTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setCompletedFilter('all');
                  setTypeFilter('all');
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
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
              >
                Apply
              </button>
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
                <th className="px-5 py-4">Title</th>
                <th className="px-5 py-4">Event Type</th>
                <th className="px-5 py-4">Event Date</th>
                <th className="px-5 py-4">Completed</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {/* ✅ Pinned "Case Filed" row - ALWAYS shown if filing_date exists */}
              {caseMeta?.filing_date && milestoneType && (
                <tr className="border-t bg-gray-50/40">
                  <td className="px-5 py-4 text-black">—</td>

                  <td className="px-5 py-4 font-medium text-black">Case Filed</td>

                  <td className="px-5 py-4">
                    <Pill label="milestone" bg={`${milestoneType.color_hex}22`} fg={milestoneType.color_hex} />
                  </td>

                  <td className="px-5 py-4 text-black">{caseMeta.filing_date}</td>

                  <td className="px-5 py-4">
                    <CompletedBadge value={true} />
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge active={true} />
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <span className="text-xs text-gray-400">Pinned</span>
                    </div>
                  </td>
                </tr>
              )}

              {loading ? (
                <tr>
                  <td className="px-5 py-6 text-black" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-black" colSpan={7}>
                    No timeline events found.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-5 py-4 text-black">{showingFrom + idx}</td>

                    <td className="px-5 py-4 font-medium text-black">{r.title}</td>

                    <td className="px-5 py-4">
{r.event_types?.[0] ? (
  <Pill
    label={r.event_types[0].name.toLowerCase()}
    bg={`${r.event_types[0].color_hex}22`}
    fg={r.event_types[0].color_hex}
  />
) : (
  '—'
)}

                    </td>

                    <td className="px-5 py-4 text-black">{r.event_date ?? '—'}</td>

                    <td className="px-5 py-4">
                      <CompletedBadge value={Boolean(r.completed)} />
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge active={Boolean(r.is_active)} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <button
                          title="View (placeholder)"
                          onClick={() => toast('info', 'View event details later (optional).')}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>

                        <button title="Edit" onClick={() => openEdit(r)} className="text-orange-500 hover:text-orange-700">
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
            Showing {showingFrom} to {showingTo} of {total} timeline events
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={cn('rounded-xl border px-4 py-2 text-sm', page <= 1 ? 'text-gray-400' : 'text-black hover:bg-gray-50')}
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

      {/* Add/Edit Modal (matches screenshot fields) */}
      <Modal open={modalOpen} title={editRow ? 'Edit Timeline Event' : 'Add Timeline Event'} onClose={() => setModalOpen(false)}>
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-black placeholder:text-black/60"
              placeholder="Enter event title"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-black placeholder:text-black/60"
              placeholder="Description"
              rows={4}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Event Type <span className="text-red-500">*</span>
            </label>
            <select
              value={eventTypeId}
              onChange={(e) => setEventTypeId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-black"
            >
              <option value="">Select Event Type</option>
              {eventTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Event Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-black"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="completed"
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300"
            />
            <label htmlFor="completed" className="text-sm font-medium text-black">
              Completed
            </label>
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
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="rounded-xl border px-5 py-2 text-black hover:bg-gray-50">
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={save}
              className="rounded-xl px-6 py-2 text-white disabled:opacity-60"
              style={{ backgroundColor: HOVER }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
