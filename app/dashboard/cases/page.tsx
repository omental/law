'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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

type CaseRow = {
  id: string;
  case_code: string;
  title: string;
  description: string | null;

  priority: 'Low' | 'Medium' | 'High';
  filing_date: string | null;
  expected_completion: string | null;

  estimated_value: number | null;
  opposing_party: string | null;

  is_active: boolean;
  created_at: string;

clients?: { id: string; name: string }[];
case_types?: { id: string; name: string; color_hex: string }[];
case_statuses?: { id: string; name: string; color_hex: string; is_closed: boolean }[];
};

type ClientOpt = { id: string; name: string; client_code?: string | null };
type CaseTypeOpt = { id: string; name: string; color_hex: string; is_active: boolean };
type CaseStatusOpt = { id: string; name: string; color_hex: string; is_active: boolean };

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: string; type: ToastType; message: string };

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(isoOrDate: string) {
  // expecting "YYYY-MM-DD" from date field
  if (!isoOrDate) return '—';
  return isoOrDate;
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
        active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function PriorityBadge({ p }: { p: 'Low' | 'Medium' | 'High' }) {
  const cls =
    p === 'High'
      ? 'bg-red-50 text-red-700 border-red-200'
      : p === 'Medium'
      ? 'bg-orange-50 text-orange-700 border-orange-200'
      : 'bg-green-50 text-green-700 border-green-200';

  return <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border', cls)}>{p}</span>;
}

function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: bg, color: fg }}>
      {label}
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
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
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

export default function CasesPage() {
  // list state
  const caseHref = (code: string) => `/dashboard/cases/${encodeURIComponent(code)}`;

  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'Low' | 'Medium' | 'High'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all'); // case_type_id
  const [statusFilter, setStatusFilter] = useState<string>('all'); // case_status_id

  // options
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [types, setTypes] = useState<CaseTypeOpt[]>([]);
  const [statuses, setStatuses] = useState<CaseStatusOpt[]>([]);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<CaseRow | null>(null);
  const [saving, setSaving] = useState(false);

  // form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [caseTypeId, setCaseTypeId] = useState('');
  const [caseStatusId, setCaseStatusId] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [filingDate, setFilingDate] = useState<string>('');
  const [expectedCompletion, setExpectedCompletion] = useState<string>('');
  const [estimatedValue, setEstimatedValue] = useState<string>('');
  const [opposingParty, setOpposingParty] = useState<string>('');
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

  function openAdd() {
    setEditRow(null);
    setTitle('');
    setDescription('');
    setClientId('');
    setCaseTypeId('');
    setCaseStatusId('');
    setPriority('Medium');
    setFilingDate('');
    setExpectedCompletion('');
    setEstimatedValue('');
    setOpposingParty('');
    setIsActive(true);
    setModalOpen(true);
  }

  function openEdit(r: CaseRow) {
    setEditRow(r);
    setTitle(r.title);
    setDescription(r.description ?? '');
setClientId(r.clients?.[0]?.id ?? '');
setCaseTypeId(r.case_types?.[0]?.id ?? '');
setCaseStatusId(r.case_statuses?.[0]?.id ?? '');
    setPriority(r.priority ?? 'Medium');
    setFilingDate(r.filing_date ?? '');
    setExpectedCompletion(r.expected_completion ?? '');
    setEstimatedValue(r.estimated_value != null ? String(r.estimated_value) : '');
    setOpposingParty(r.opposing_party ?? '');
    setIsActive(r.is_active);
    setModalOpen(true);
  }

  async function fetchOptions() {
    // clients dropdown
    const [{ data: cData, error: cErr }, { data: tData, error: tErr }, { data: sData, error: sErr }] =
      await Promise.all([
        supabase.from('clients').select('id,name,client_code').order('name', { ascending: true }),
        supabase.from('case_types').select('id,name,color_hex,is_active').eq('is_active', true).order('name', { ascending: true }),
        supabase.from('case_statuses').select('id,name,color_hex,is_active').eq('is_active', true).order('name', { ascending: true }),
      ]);

    if (cErr) toast('error', cErr.message);
    if (tErr) toast('error', tErr.message);
    if (sErr) toast('error', sErr.message);

    setClients((cData as ClientOpt[]) ?? []);
    setTypes((tData as CaseTypeOpt[]) ?? []);
    setStatuses((sData as CaseStatusOpt[]) ?? []);
  }

  async function fetchRows() {
    setLoading(true);
    try {
      let query = supabase
        .from('cases')
        .select(
          `
          id,case_code,title,description,priority,filing_date,expected_completion,estimated_value,opposing_party,is_active,created_at,
          clients:client_id ( id,name ),
          case_types:case_type_id ( id,name,color_hex ),
          case_statuses:case_status_id ( id,name,color_hex,is_closed )
        `,
          { count: 'exact' }
        );

      if (q.trim()) {
        const search = q.trim().replaceAll(',', '');
        query = query.or(
          `case_code.ilike.%${search}%,title.ilike.%${search}%,clients.name.ilike.%${search}%`
        );
      }

      if (activeFilter === 'active') query = query.eq('is_active', true);
      if (activeFilter === 'inactive') query = query.eq('is_active', false);

      if (priorityFilter !== 'all') query = query.eq('priority', priorityFilter);

      if (typeFilter !== 'all') query = query.eq('case_type_id', typeFilter);
      if (statusFilter !== 'all') query = query.eq('case_status_id', statusFilter);

      const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);

      if (error) throw error;
setRows((data ?? []) as CaseRow[]);
      setTotal(count ?? 0);
    } catch (e: any) {
      toast('error', e?.message ?? 'Failed to load cases.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, activeFilter, priorityFilter, typeFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchRows();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function save() {
    if (!title.trim()) return toast('error', 'Case Title is required.');
    if (!clientId) return toast('error', 'Client is required.');
    if (!caseTypeId) return toast('error', 'Case Type is required.');
    if (!caseStatusId) return toast('error', 'Case Status is required.');

    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        client_id: clientId,
        case_type_id: caseTypeId,
        case_status_id: caseStatusId,
        priority,
        filing_date: filingDate ? filingDate : null,
        expected_completion: expectedCompletion ? expectedCompletion : null,
        estimated_value: estimatedValue ? Number(estimatedValue) : null,
        opposing_party: opposingParty.trim() ? opposingParty.trim() : null,
        is_active: isActive,
      };

      if (editRow) {
        const { error } = await supabase.from('cases').update(payload).eq('id', editRow.id);
        if (error) throw error;
        toast('success', 'Case updated.');
      } else {
        payload.case_code = null; // generate CASE000001...
        const { error } = await supabase.from('cases').insert(payload);
        if (error) throw error;
        toast('success', 'Case created.');
      }

      setModalOpen(false);
      await fetchRows();
    } catch (e: any) {
      toast('error', e?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: CaseRow) {
    try {
      const { error } = await supabase.from('cases').update({ is_active: !r.is_active }).eq('id', r.id);
      if (error) throw error;
      toast('success', r.is_active ? 'Marked inactive.' : 'Marked active.');
      await fetchRows();
    } catch (e: any) {
      toast('error', e?.message ?? 'Failed to update active status.');
    }
  }

  async function remove(r: CaseRow) {
    const ok = confirm(`Delete "${r.title}" (${r.case_code})? This cannot be undone.`);
    if (!ok) return;

    try {
      const { error } = await supabase.from('cases').delete().eq('id', r.id);
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
        <h1 className="text-2xl font-semibold text-black">Cases</h1>

        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white shadow-sm"
          style={{ backgroundColor: HOVER }}
          onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = PRIMARY))}
          onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = HOVER))}
        >
          <PlusIcon className="h-5 w-5" />
          Add Case
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Active Status</label>
                <select
                  value={activeFilter}
                  onChange={(e) => {
                    setActiveFilter(e.target.value as any);
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
                <label className="mb-1 block text-sm font-medium text-black">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border px-3 py-2 text-black"
                >
                  <option value="all">All</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">Case Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border px-3 py-2 text-black"
                >
                  <option value="all">All</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">Case Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border px-3 py-2 text-black"
                >
                  <option value="all">All</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setActiveFilter('all');
                  setPriorityFilter('all');
                  setTypeFilter('all');
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
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-600">
                <th className="px-5 py-4">#</th>
                <th className="px-5 py-4">Case ID</th>
                <th className="px-5 py-4">Title</th>
                <th className="px-5 py-4">Client</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Priority</th>
                <th className="px-5 py-4">Filing Date</th>
                <th className="px-5 py-4">Active Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-5 py-6 text-black" colSpan={10}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-black" colSpan={10}>
                    No cases found.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-5 py-4 text-black">{showingFrom + idx}</td>
<td className="px-5 py-4">
  <Link
    href={caseHref(r.case_code)}
    className="text-black hover:underline"
    title="Open case"
  >
    {r.case_code}
  </Link>
</td>
<td className="px-5 py-4 font-medium">
  <Link
    href={caseHref(r.case_code)}
    className="text-black hover:underline"
    title="Open case"
  >
    {r.title}
  </Link>
</td>
<td className="px-5 py-4 text-black">{r.clients?.[0]?.name ?? '—'}</td>

                    <td className="px-5 py-4">
 {r.case_types?.[0] ? (
  <Pill
    label={r.case_types[0].name}
    bg={`${r.case_types[0].color_hex}22`}
    fg={r.case_types[0].color_hex}
  />
) : (
  '—'
)}

                    </td>

                    <td className="px-5 py-4">
{r.case_statuses?.[0] ? (
  <Pill
    label={r.case_statuses[0].name}
    bg={`${r.case_statuses[0].color_hex}22`}
    fg={r.case_statuses[0].color_hex}
  />
) : (
  '—'
)}

                    </td>

                    <td className="px-5 py-4">
                      <PriorityBadge p={r.priority} />
                    </td>

                    <td className="px-5 py-4 text-black">{r.filing_date ? formatDate(r.filing_date) : '—'}</td>

                    <td className="px-5 py-4">
                      <StatusBadge active={r.is_active} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-3">
<Link
  href={caseHref(r.case_code)}
  title="View"
  className="text-blue-600 hover:text-blue-800"
>
  <EyeIcon className="h-5 w-5" />
</Link>


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
            Showing {showingFrom} to {showingTo} of {total} cases
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

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} title={editRow ? 'Edit Case' : 'Add New Case'} onClose={() => setModalOpen(false)}>
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Case Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-black placeholder:text-black/60"
              placeholder="Enter case title"
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-black"
              >
                <option value="">Select Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                Case Type <span className="text-red-500">*</span>
              </label>
              <select
                value={caseTypeId}
                onChange={(e) => setCaseTypeId(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-black"
              >
                <option value="">Select Case Type</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                Case Status <span className="text-red-500">*</span>
              </label>
              <select
                value={caseStatusId}
                onChange={(e) => setCaseStatusId(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-black"
              >
                <option value="">Select Case Status</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-xl border px-3 py-2 text-black"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">Filing Date</label>
              <input
                type="date"
                value={filingDate}
                onChange={(e) => setFilingDate(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">Expected Completion</label>
              <input
                type="date"
                value={expectedCompletion}
                onChange={(e) => setExpectedCompletion(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">Estimated Value</label>
              <input
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-black"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">Opposing Party</label>
              <input
                value={opposingParty}
                onChange={(e) => setOpposingParty(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-black"
                placeholder="Opposing party"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-black">Active Status</label>
              <select
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive(e.target.value === 'active')}
                className="w-full rounded-xl border px-3 py-2 text-black"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
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
              onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = PRIMARY))}
              onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = HOVER))}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
