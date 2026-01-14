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
  ArchiveBoxIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

type ClientType = { id: string; name: string };
type Currency = { id: string; name: string; symbol: string | null };

type ClientRow = {
  id: string;
  client_code: string; // ✅ stored in DB now
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  address: string | null;
  date_of_birth: string | null;
  reference_source: string | null;
  notes: string | null;
  picture_url: string | null;
  status: 'active' | 'archived' | string;
  created_at: string;
  client_types?: { name: string } | null;
  billing_currencies?: { name: string; symbol: string | null } | null;
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
        <button onClick={onClose} className="ml-auto text-black/60 hover:text-black">
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

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span
      className={`text-xs px-3 py-1 rounded-full border font-semibold inline-flex items-center justify-center
      ${isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
    >
      {isActive ? 'Active' : 'Archived'}
    </span>
  );
}

/* ---------------- Page ---------------- */

export default function ClientsPage() {
  const { toast, show, clear } = useToast();

  const [loading, setLoading] = useState(true);

  // Table state
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // Search + filters
  const [searchInput, setSearchInput] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Dropdown data
  const [clientTypes, setClientTypes] = useState<ClientType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  // Modal
  const [isAddOpen, setIsAddOpen] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

  const loadDropdowns = async () => {
    const [typesRes, currRes] = await Promise.all([
      supabase.from('client_types').select('id,name').order('name', { ascending: true }),
      supabase.from('billing_currencies').select('id,name,symbol').order('name', { ascending: true }),
    ]);

    if (typesRes.error) console.log('client_types error:', typesRes.error);
    if (currRes.error) console.log('billing_currencies error:', currRes.error);

    setClientTypes((typesRes.data as any) ?? []);
    setCurrencies((currRes.data as any) ?? []);
  };

  const fetchClients = async () => {
    setLoading(true);

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('clients')
      .select(
        `
        id, client_code, name, email, phone, company_name, address, date_of_birth, reference_source, notes, picture_url, status, created_at,
        client_types:client_type_id ( name ),
        billing_currencies:billing_currency_id ( name, symbol )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    const s = searchApplied.trim();
    if (s.length > 0) {
      const like = `%${s}%`;
      query = query.or(
        [
          `client_code.ilike.${like}`,
          `name.ilike.${like}`,
          `email.ilike.${like}`,
          `phone.ilike.${like}`,
          `company_name.ilike.${like}`,
          `reference_source.ilike.${like}`,
        ].join(',')
      );
    }

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (typeFilter !== 'all') query = query.eq('client_type_id', typeFilter);

    const { data, error, count } = await query;

    if (error) {
      setRows([]);
      setTotal(0);
      show('error', error.message);
      setLoading(false);
      return;
    }

    setRows((data as any) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, searchApplied, statusFilter, typeFilter]);

  const onSearch = () => {
    setPage(1);
    setSearchApplied(searchInput);
  };

  const openAdd = async () => {
    await loadDropdowns();
    setIsAddOpen(true);
  };

  const onCreated = async () => {
    setIsAddOpen(false);
    show('success', 'Client added successfully.');
    setPage(1);
    await fetchClients();
  };

  const archiveClient = async (id: string) => {
    const ok = confirm('Archive this client?');
    if (!ok) return;

    const { error } = await supabase.from('clients').update({ status: 'archived' }).eq('id', id);
    if (error) return show('error', error.message);

    show('success', 'Client archived.');
    fetchClients();
  };

  const unarchiveClient = async (id: string) => {
    const ok = confirm('Unarchive this client?');
    if (!ok) return;

    const { error } = await supabase.from('clients').update({ status: 'active' }).eq('id', id);
    if (error) return show('error', error.message);

    show('success', 'Client restored.');
    fetchClients();
  };

  const deleteClient = async (id: string) => {
    const ok = confirm('Permanently delete this client? This cannot be undone.');
    if (!ok) return;

    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) return show('error', error.message);

    show('success', 'Client deleted.');
    fetchClients();
  };

  return (
    <div className="p-6 relative">
      {/* Toast */}
      <div className="fixed top-5 right-5 z-[60] space-y-2">
        {toast ? <Toast type={toast.type} message={toast.message} onClose={clear} /> : null}
      </div>

      {/* Title + Add */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-3xl font-bold text-black">Clients</h1>

        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: PRIMARY }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
        >
          <PlusIcon className="h-5 w-5" />
          Add Client
        </button>
      </div>

      {/* Search + Filters */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 flex items-center gap-3">
            <div className="relative w-full max-w-md">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-black/50" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, email, phone, client id..."
                className="w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm bg-white text-black placeholder:text-black/60 outline-none focus:ring-2 focus:ring-[rgba(39,141,205,0.25)]"
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              />
            </div>

            <button
              onClick={onSearch}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              Search
            </button>

            <button
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
            </button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-black">Per Page:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPage(1);
                setPerPage(Number(e.target.value));
              }}
              className="px-3 py-2 border rounded-xl text-sm bg-white text-black"
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
        <div className="grid grid-cols-12 gap-3 px-5 py-4 text-sm font-semibold text-black border-b">
          <div className="col-span-1">#</div>
          <div className="col-span-2">Client ID</div>
          <div className="col-span-2">Name</div>
          <div className="col-span-2">Email</div>
          <div className="col-span-2">Phone</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-black/70">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-black/70">No clients found.</div>
        ) : (
          rows.map((r, idx) => (
            <div key={r.id} className="grid grid-cols-12 gap-3 px-5 py-4 border-b text-sm items-center">
              <div className="col-span-1 text-black">{(page - 1) * perPage + (idx + 1)}</div>

              <div className="col-span-2 font-semibold text-black">{r.client_code ?? '—'}</div>

              <div className="col-span-2 min-w-0">
                <div className="font-semibold text-black truncate">{r.name}</div>
                {r.company_name ? <div className="text-xs text-black/70 truncate">{r.company_name}</div> : null}
              </div>

              <div className="col-span-2 min-w-0 text-black truncate">{r.email ?? '—'}</div>
              <div className="col-span-2 text-black">{r.phone ?? '—'}</div>

              <div className="col-span-1">
                <span className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-black">
                  {r.client_types?.name ?? '—'}
                </span>
              </div>

              <div className="col-span-1">
                <StatusBadge status={r.status} />
              </div>

              <div className="col-span-1 flex items-center justify-end gap-3 whitespace-nowrap">
                {/* ✅ Clean URLs now */}
                <Link href={`/dashboard/clients/${r.client_code}`} className="text-black/70 hover:text-black" title="View">
                  <EyeIcon className="h-5 w-5" />
                </Link>

                <Link href={`/dashboard/clients/${r.client_code}/edit`} className="text-black/70 hover:text-black" title="Edit">
                  <PencilSquareIcon className="h-5 w-5" />
                </Link>

                {r.status === 'archived' ? (
                  <button onClick={() => unarchiveClient(r.id)} className="text-black/70 hover:text-black" title="Unarchive">
                    <ArrowUturnLeftIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <button onClick={() => archiveClient(r.id)} className="text-black/70 hover:text-black" title="Archive">
                    <ArchiveBoxIcon className="h-5 w-5" />
                  </button>
                )}

                <button onClick={() => deleteClient(r.id)} className="text-black/70 hover:text-red-600" title="Delete">
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Footer + Pagination */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-5 py-4">
          <div className="text-sm text-black/70">
            Showing {(page - 1) * perPage + (rows.length ? 1 : 0)} to {(page - 1) * perPage + rows.length} of {total} clients
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-xl border text-sm disabled:opacity-50 text-black"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>

            <span className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
              {page}
            </span>

            <button
              className="px-4 py-2 rounded-xl border text-sm disabled:opacity-50 text-black"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {filtersOpen && (
        <FiltersDrawer
          onClose={() => setFiltersOpen(false)}
          clientTypes={clientTypes}
          loadDropdowns={loadDropdowns}
          statusFilter={statusFilter}
          setStatusFilter={(v) => {
            setPage(1);
            setStatusFilter(v);
          }}
          typeFilter={typeFilter}
          setTypeFilter={(v) => {
            setPage(1);
            setTypeFilter(v);
          }}
          onClear={() => {
            setPage(1);
            setStatusFilter('all');
            setTypeFilter('all');
          }}
        />
      )}

      {isAddOpen && (
        <AddClientModal
          onClose={() => setIsAddOpen(false)}
          onCreated={onCreated}
          clientTypes={clientTypes}
          currencies={currencies}
          showToast={show}
        />
      )}
    </div>
  );
}

/* ---------------- Filters Drawer ---------------- */

function FiltersDrawer(props: {
  onClose: () => void;
  clientTypes: ClientType[];
  loadDropdowns: () => Promise<void>;
  statusFilter: 'active' | 'archived' | 'all';
  setStatusFilter: (v: 'active' | 'archived' | 'all') => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  onClear: () => void;
}) {
  const { onClose, clientTypes, loadDropdowns, statusFilter, setStatusFilter, typeFilter, setTypeFilter, onClear } = props;

  useEffect(() => {
    if (!clientTypes.length) loadDropdowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl border-l">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="text-lg font-semibold text-black">Filters</div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="text-xs font-semibold text-black mb-1">Status</div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-xl text-sm bg-white text-black"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-black mb-1">Client Type</div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm bg-white text-black"
            >
              <option value="all">All</option>
              {clientTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button onClick={onClear} className="w-full px-4 py-2.5 rounded-xl border text-sm hover:bg-gray-50 text-black">
            Clear Filters
          </button>
        </div>

        <div className="px-5 py-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: PRIMARY }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Add Client Modal ---------------- */

function AddClientModal({
  onClose,
  onCreated,
  clientTypes,
  currencies,
  showToast,
}: {
  onClose: () => void;
  onCreated: () => void;
  clientTypes: ClientType[];
  currencies: Currency[];
  showToast: (type: ToastType, message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    client_type_id: '',
    company_name: '',
    date_of_birth: '',
    address: '',
    billing_currency_id: '',
    reference_source: '',
    notes: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const uploadImageIfNeeded = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setUploading(true);

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const userId = authData.user?.id ?? 'anonymous';

      const ext = imageFile.name.split('.').pop() || 'jpg';
      const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '');
      const fileName = `client_${Date.now()}.${safeExt}`;

      const path = `${userId}/${fileName}`;

      const { error: upErr } = await supabase.storage
        .from('client-avatars')
        .upload(path, imageFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: imageFile.type || 'image/jpeg',
        });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from('client-avatars').getPublicUrl(path);
      const url = data?.publicUrl ?? null;

      setPictureUrl(url);
      return url;
    } catch (e: any) {
      const msg = e?.message ?? 'Image upload failed.';
      showToast('error', msg);
      throw e;
    } finally {
      setUploading(false);
    }
  };

  const getNextClientCode = async (): Promise<string> => {
    // Because CLO is fixed width (CLO00001), ordering by client_code works reliably.
    const { data: last, error } = await supabase
      .from('clients')
      .select('client_code')
      .not('client_code', 'is', null)
      .order('client_code', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!last?.client_code) return 'CLO00001';

    const num = parseInt(String(last.client_code).replace('CLO', ''), 10);
    const next = Number.isFinite(num) ? num + 1 : 1;

    return `CLO${String(next).padStart(5, '0')}`;
  };

  const submit = async () => {
    setErrorMsg(null);

    if (!form.name.trim()) return setErrorMsg('Client name is required.');
    if (!form.client_type_id) return setErrorMsg('Client type is required.');
    if (!form.billing_currency_id) return setErrorMsg('Billing currency is required.');

    setSaving(true);

    try {
      const uploadedUrl = await uploadImageIfNeeded();
      const nextCode = await getNextClientCode();

      const payload = {
        client_code: nextCode,
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        client_type_id: form.client_type_id,
        company_name: form.company_name.trim() || null,
        date_of_birth: form.date_of_birth || null,
        address: form.address.trim() || null,
        billing_currency_id: form.billing_currency_id,
        reference_source: form.reference_source.trim() || null,
        notes: form.notes.trim() || null,
        picture_url: uploadedUrl ?? null,
        status: 'active',
      };

      const { error } = await supabase.from('clients').insert(payload);
      if (error) throw error;

      onCreated();
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to add client.';
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
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-black">Add Client</h2>
            <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 max-h-[75vh] overflow-auto">
            {errorMsg ? (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
                {errorMsg}
              </div>
            ) : null}

            {/* Image upload */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-black mb-2">Client Image</div>

              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl border bg-gray-50 overflow-hidden flex items-center justify-center">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-black/50">No image</span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setImageFile(f);
                      setPictureUrl(null);
                    }}
                    className="text-sm text-black"
                  />

                  {uploading ? (
                    <div className="text-xs text-black/70">Uploading…</div>
                  ) : pictureUrl ? (
                    <div className="text-xs text-black/70">Uploaded ✅</div>
                  ) : (
                    <div className="text-xs text-black/70">PNG/JPG recommended</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Name *">
                <input value={form.name} onChange={set('name')} className="w-full px-3 py-2.5 border rounded-xl text-sm text-black" />
              </Field>

              <Field label="Email">
                <input value={form.email} onChange={set('email')} type="email" className="w-full px-3 py-2.5 border rounded-xl text-sm text-black" />
              </Field>

              <Field label="Phone">
                <input value={form.phone} onChange={set('phone')} className="w-full px-3 py-2.5 border rounded-xl text-sm text-black" />
              </Field>

              <Field label="Company Name">
                <input value={form.company_name} onChange={set('company_name')} className="w-full px-3 py-2.5 border rounded-xl text-sm text-black" />
              </Field>

              <Field label="Client Type *">
                <select value={form.client_type_id} onChange={set('client_type_id')} className="w-full px-3 py-2.5 border rounded-xl text-sm bg-white text-black">
                  <option value="">Select type</option>
                  {clientTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Billing Currency *">
                <select value={form.billing_currency_id} onChange={set('billing_currency_id')} className="w-full px-3 py-2.5 border rounded-xl text-sm bg-white text-black">
                  <option value="">Select currency</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.symbol ? ` (${c.symbol})` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Date of Birth">
                <input value={form.date_of_birth} onChange={set('date_of_birth')} type="date" className="w-full px-3 py-2.5 border rounded-xl text-sm text-black" />
              </Field>

              <Field label="Reference Source">
                <input value={form.reference_source} onChange={set('reference_source')} className="w-full px-3 py-2.5 border rounded-xl text-sm text-black" />
              </Field>

              <Field label="Address" full>
                <input value={form.address} onChange={set('address')} className="w-full px-3 py-2.5 border rounded-xl text-sm text-black" />
              </Field>

              <Field label="Notes" full>
                <textarea value={form.notes} onChange={set('notes')} rows={4} className="w-full px-3 py-2.5 border rounded-xl text-sm text-black" />
              </Field>
            </div>
          </div>

          <div className="px-6 py-4 border-t flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border text-sm hover:bg-gray-50 text-black" disabled={saving || uploading}>
              Cancel
            </button>
            <button
              onClick={submit}
              className="px-5 py-2.5 rounded-xl text-sm text-white font-semibold disabled:opacity-60"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
              disabled={saving || uploading}
            >
              {saving ? 'Saving…' : 'Save Client'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <div className="text-xs font-semibold text-black mb-1">{label}</div>
      {children}
    </div>
  );
}
