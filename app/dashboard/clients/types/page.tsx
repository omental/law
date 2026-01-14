'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

type ClientTypeRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

const PRIMARY = '#278DCD';
const HOVER = '#3BB143';

/* ---------------- Toast ---------------- */
type ToastType = 'success' | 'error' | 'info';

function Toast({
  type,
  message,
  onClose,
}: {
  type: ToastType;
  message: string;
  onClose: () => void;
}) {
  const Icon =
    type === 'success'
      ? CheckCircleIcon
      : type === 'error'
      ? ExclamationTriangleIcon
      : InformationCircleIcon;

  const border =
    type === 'success'
      ? 'border-green-200'
      : type === 'error'
      ? 'border-red-200'
      : 'border-blue-200';

  const bg =
    type === 'success'
      ? 'bg-green-50'
      : type === 'error'
      ? 'bg-red-50'
      : 'bg-blue-50';

  const text =
    type === 'success'
      ? 'text-green-700'
      : type === 'error'
      ? 'text-red-700'
      : 'text-blue-700';

  return (
    <div className={`pointer-events-auto w-full max-w-sm rounded-xl border ${border} ${bg} shadow-sm`}>
      <div className="flex items-start gap-3 p-4">
        <Icon className={`h-5 w-5 ${text}`} />
        <div className={`text-sm ${text}`}>{message}</div>
        <button onClick={onClose} className="ml-auto text-gray-500 hover:text-gray-900">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const show = (type: ToastType, message: string) => {
    setToast({ type, message });
    window.clearTimeout((show as any)._t);
    (show as any)._t = window.setTimeout(() => setToast(null), 2500);
  };

  return { toast, show, clear: () => setToast(null) };
}

/* ---------------- Page ---------------- */

export default function ClientTypesPage() {
  const { toast, show, clear } = useToast();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ClientTypeRow[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [searchApplied, setSearchApplied] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientTypeRow | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

  const fetchTypes = async () => {
    setLoading(true);

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('client_types')
      .select(`id, name, description, created_at`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    const s = searchApplied.trim();
    if (s) {
      const like = `%${s}%`;
      query = query.or([`name.ilike.${like}`, `description.ilike.${like}`].join(','));
    }

    const { data, error, count } = await query;

    if (error) {
      show('error', error.message);
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setRows((data as any) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, searchApplied]);

  const onSearch = () => {
    setPage(1);
    setSearchApplied(searchInput);
  };

  const openAdd = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (row: ClientTypeRow) => {
    setEditing(row);
    setIsModalOpen(true);
  };

  const onSaved = async () => {
    setIsModalOpen(false);
    show('success', editing ? 'Client type updated.' : 'Client type added.');
    setPage(1);
    await fetchTypes();
  };

  const deleteType = async (id: string) => {
    const ok = confirm('Delete this client type?');
    if (!ok) return;

    const { error } = await supabase.from('client_types').delete().eq('id', id);
    if (error) return show('error', error.message);

    show('success', 'Client type deleted.');
    fetchTypes();
  };

  return (
    <div className="relative">
      {/* Toast */}
      <div className="fixed top-5 right-5 z-[60] space-y-2">
        {toast ? <Toast type={toast.type} message={toast.message} onClose={clear} /> : null}
      </div>

      {/* Title + Add */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-3xl font-bold">Client Types</h1>

        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: PRIMARY }}
          onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = HOVER))}
          onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = PRIMARY))}
        >
          <PlusIcon className="h-5 w-5" />
          Add Type
        </button>
      </div>

      {/* Search + Per page */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 flex items-center gap-3">
            <div className="relative w-full max-w-md">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search types..."
                className="w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[rgba(39,141,205,0.25)]"
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              />
            </div>

            <button
              onClick={onSearch}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = HOVER))}
              onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = PRIMARY))}
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              Search
            </button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-gray-500">Per Page:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPage(1);
                setPerPage(Number(e.target.value));
              }}
              className="px-3 py-2 border rounded-xl text-sm bg-white"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-2xl mt-4 overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 gap-3 px-5 py-4 text-sm font-semibold text-gray-500 border-b">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Name</div>
          <div className="col-span-6">Description</div>
          <div className="col-span-1">Created</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No client types found.</div>
        ) : (
          rows.map((r, idx) => (
            <div key={r.id} className="grid grid-cols-12 gap-3 px-5 py-4 border-b text-sm items-center">
              <div className="col-span-1">{(page - 1) * perPage + (idx + 1)}</div>
              <div className="col-span-3 font-semibold text-gray-900">{r.name}</div>
              <div className="col-span-6 text-gray-700">{r.description ?? '—'}</div>
              <div className="col-span-1 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</div>

              <div className="col-span-1 flex items-center justify-end gap-3">
                <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-gray-900" title="Edit">
                  <PencilSquareIcon className="h-5 w-5" />
                </button>

                <button onClick={() => deleteType(r.id)} className="text-gray-500 hover:text-red-600" title="Delete">
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Footer + Pagination */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-5 py-4">
          <div className="text-sm text-gray-500">
            Showing {(page - 1) * perPage + (rows.length ? 1 : 0)} to {(page - 1) * perPage + rows.length} of {total} types
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-xl border text-sm disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>

            <span className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
              {page}
            </span>

            <button
              className="px-4 py-2 rounded-xl border text-sm disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ClientTypeModal
          onClose={() => setIsModalOpen(false)}
          onSaved={onSaved}
          showToast={show}
          editing={editing}
        />
      )}
    </div>
  );
}

function ClientTypeModal({
  onClose,
  onSaved,
  showToast,
  editing,
}: {
  onClose: () => void;
  onSaved: () => void;
  showToast: (type: ToastType, message: string) => void;
  editing: ClientTypeRow | null;
}) {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
  });

  const submit = async () => {
    setErrorMsg(null);
    if (!form.name.trim()) return setErrorMsg('Name is required.');

    setSaving(true);

    try {
      if (editing) {
        const { error } = await supabase
          .from('client_types')
          .update({ name: form.name.trim(), description: form.description.trim() || null })
          .eq('id', editing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_types')
          .insert({ name: form.name.trim(), description: form.description.trim() || null });

        if (error) throw error;
      }

      onSaved();
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to save.';
      setErrorMsg(msg);
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">{editing ? 'Edit Client Type' : 'Add Client Type'}</h2>
            <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            {errorMsg ? (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
                {errorMsg}
              </div>
            ) : null}

            <Field label="Name *">
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2.5 border rounded-xl text-sm"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2.5 border rounded-xl text-sm"
              />
            </Field>
          </div>

          <div className="px-6 py-4 border-t flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border text-sm hover:bg-gray-50" disabled={saving}>
              Cancel
            </button>
            <button
              onClick={submit}
              className="px-5 py-2.5 rounded-xl text-sm text-white font-semibold disabled:opacity-60"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = HOVER))}
              onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = PRIMARY))}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-gray-600 mb-1">{label}</div>
      {children}
    </div>
  );
}
