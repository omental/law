'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const PRIMARY = '#278DCD';
const HOVER = '#3BB143';

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
            'w-[360px] rounded-xl border bg-white p-4 shadow-lg',
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

type DocConf = 'public' | 'internal' | 'privileged' | 'confidential';

type DocRow = {
  id: string;
  title: string;
  confidentiality: DocConf;
  source_type: 'upload' | 'editor';
  storage_path: string | null;
  mime_type: string | null;
  file_ext: string | null;
  created_at: string;

document_categories?: { id: string; name: string; color_hex: string }[]; // Supabase returns array
};

type CategoryOpt = { id: string; name: string; color_hex: string };

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {label}
    </span>
  );
}

function ConfidentialityPill({ v }: { v: DocConf }) {
  const map: Record<DocConf, string> = {
    public: '#10B981',
    internal: '#3B82F6',
    privileged: '#EF4444',
    confidential: '#F59E0B',
  };
  const color = map[v] ?? '#6B7280';
  const label = v.charAt(0).toUpperCase() + v.slice(1);
  return <Pill label={label} color={color} />;
}

export default function DocumentsTab({ caseId }: { caseId: string }) {
  const router = useRouter();
  const params = useParams<{ case_code: string }>();

  const [rows, setRows] = useState<DocRow[]>([]);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);

  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [confFilter, setConfFilter] = useState<string>('all');

  // Add Document modal
  const [addOpen, setAddOpen] = useState(false);

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [docTitle, setDocTitle] = useState('');
  const [docCategoryId, setDocCategoryId] = useState('');
  const [docConf, setDocConf] = useState<DocConf>('internal');
  const [docFile, setDocFile] = useState<File | null>(null);

  // Create blank modal
  const [blankOpen, setBlankOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [blankTitle, setBlankTitle] = useState('');
  const [blankCategoryId, setBlankCategoryId] = useState('');
  const [blankConf, setBlankConf] = useState<DocConf>('internal');

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

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('document_categories')
      .select('id,name,color_hex')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) toast('error', error.message);
    setCategories((data as CategoryOpt[]) ?? []);
  }

  async function fetchRows() {
    setLoading(true);
    try {
      let query = supabase
        .from('case_documents')
        .select(
          `
          id,title,confidentiality,source_type,storage_path,mime_type,file_ext,created_at,
          document_categories:category_id ( id,name,color_hex )
        `,
          { count: 'exact' }
        )
        .eq('case_id', caseId);

      if (q.trim()) {
        const s = q.trim();
        query = query.ilike('title', `%${s}%`);
      }

      if (categoryFilter !== 'all') query = query.eq('category_id', categoryFilter);
      if (confFilter !== 'all') query = query.eq('confidentiality', confFilter);

const { data, error, count } = await query
  .order('created_at', { ascending: false })
  .range(from, to);

setRows((data ?? []) as DocRow[]);

      if (error) throw error;
setRows((data ?? []) as DocRow[]);
      setTotal(count ?? 0);
    } catch (e: any) {
      toast('error', e?.message ?? 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, categoryFilter, confFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchRows();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function openAdd() {
    setAddOpen(true);
  }

  function openUpload() {
    setAddOpen(false);
    setDocTitle('');
    setDocCategoryId('');
    setDocConf('internal');
    setDocFile(null);
    setUploadOpen(true);
  }

  function openBlank() {
    setAddOpen(false);
    setBlankTitle('');
    setBlankCategoryId('');
    setBlankConf('internal');
    setBlankOpen(true);
  }

function ensureValidFile(
  f: File
): { ok: true; ext: string } | { ok: false; message: string } {
  const okExt = ['pdf', 'doc', 'docx'];
  const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
  if (!okExt.includes(ext)) {
    return { ok: false, message: 'Only PDF, DOC, DOCX are allowed.' };
  }
  return { ok: true, ext };
}

  async function uploadDocument() {
    if (!docTitle.trim()) return toast('error', 'Document name is required.');
    if (!docFile) return toast('error', 'Please select a file.');

    const check = ensureValidFile(docFile);
    if (!check.ok) return toast('error', check.message);

    setUploading(true);
    try {
      // 1) create row first (so we get id for storage path)
      const { data: inserted, error: insErr } = await supabase
        .from('case_documents')
        .insert({
          case_id: caseId,
          title: docTitle.trim(),
          category_id: docCategoryId || null,
          confidentiality: docConf,
          source_type: 'upload',
          mime_type: docFile.type || null,
          file_ext: check.ext,
        })
        .select('id')
        .single();

      if (insErr) throw insErr;
      const newDocId = inserted.id as string;

      // 2) upload file
      const storagePath = `cases/${caseId}/uploads/${newDocId}.${check.ext}`;
      const { error: upErr } = await supabase.storage.from('case-documents').upload(storagePath, docFile, {
        upsert: true,
        contentType: docFile.type || undefined,
      });
      if (upErr) throw upErr;

      // 3) update row with storage_path
      const { error: updErr } = await supabase.from('case_documents').update({ storage_path: storagePath }).eq('id', newDocId);
      if (updErr) throw updErr;

      toast('success', 'Document uploaded.');
      setUploadOpen(false);
      await fetchRows();
    } catch (e: any) {
      toast('error', e?.message ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function createBlankDocument() {
    if (!blankTitle.trim()) return toast('error', 'Document name is required.');

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('case_documents')
        .insert({
          case_id: caseId,
          title: blankTitle.trim(),
          category_id: blankCategoryId || null,
          confidentiality: blankConf,
          source_type: 'editor',
          editor_json: null,
          editor_html: null,
        })
        .select('id')
        .single();

      if (error) throw error;

      setBlankOpen(false);
      toast('success', 'Blank document created.');

      router.push(`/dashboard/cases/${params.case_code}/documents/${data.id}/edit`);
    } catch (e: any) {
      toast('error', e?.message ?? 'Failed to create document.');
    } finally {
      setCreating(false);
    }
  }

  async function getSignedUrl(path: string) {
    const { data, error } = await supabase.storage.from('case-documents').createSignedUrl(path, 60 * 10);
    if (error) throw error;
    return data.signedUrl;
  }

  async function viewDoc(r: DocRow) {
    try {
      // If editor doc: if pdf exists -> view it else open editor
      if (r.source_type === 'editor') {
        if (r.storage_path) {
          const url = await getSignedUrl(r.storage_path);
          window.open(url, '_blank');
          return;
        }
        router.push(`/dashboard/cases/${params.case_code}/documents/${r.id}/edit`);
        return;
      }

      // upload doc
      if (!r.storage_path) return toast('error', 'File not found.');

      if (r.file_ext === 'pdf') {
        const url = await getSignedUrl(r.storage_path);
        window.open(url, '_blank');
        return;
      }

      toast('info', 'DOC/DOCX cannot be viewed here. Use download. For PDF, click View.');
    } catch (e: any) {
      toast('error', e?.message ?? 'Failed to open document.');
    }
  }

  async function editDoc(r: DocRow) {
    // Only editor docs are editable inside app for now
    if (r.source_type === 'editor') {
      router.push(`/dashboard/cases/${params.case_code}/documents/${r.id}/edit`);
      return;
    }

    if (r.file_ext === 'pdf') {
      toast('info', 'PDF is view-only here. Click View to open it.');
    } else {
      toast('info', 'DOC/DOCX editing is not available yet. Download and edit locally.');
    }
  }

  async function downloadDoc(r: DocRow) {
    try {
      const path = r.storage_path;
      if (!path) return toast('error', 'No file available.');

      const url = await getSignedUrl(path);
      window.open(url, '_blank');
    } catch (e: any) {
      toast('error', e?.message ?? 'Download failed.');
    }
  }

  async function remove(r: DocRow) {
    const ok = confirm(`Delete "${r.title}"? This cannot be undone.`);
    if (!ok) return;

    try {
      if (r.storage_path) {
        await supabase.storage.from('case-documents').remove([r.storage_path]);
      }

      const { error } = await supabase.from('case_documents').delete().eq('id', r.id);
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
        <h2 className="text-xl font-semibold text-black">Documents</h2>

        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white shadow-sm"
          style={{ backgroundColor: HOVER }}
          onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = PRIMARY))}
          onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = HOVER))}
        >
          <PlusIcon className="h-5 w-5" />
          Add Document
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border px-3 py-2 text-black"
                >
                  <option value="all">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">Confidentiality</label>
                <select
                  value={confFilter}
                  onChange={(e) => {
                    setConfFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border px-3 py-2 text-black"
                >
                  <option value="all">All</option>
                  {['public', 'internal', 'privileged', 'confidential'].map((v) => (
                    <option key={v} value={v}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end justify-end gap-2">
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setConfFilter('all');
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
                <th className="px-5 py-4">Document Name</th>
                <th className="px-5 py-4">Document Type</th>
                <th className="px-5 py-4">Confidentiality</th>
                <th className="px-5 py-4">Created At</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-5 py-6 text-black" colSpan={6}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-black" colSpan={6}>
                    No documents found.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-5 py-4 text-black">{showingFrom + idx}</td>

                    <td className="px-5 py-4 font-medium text-black">{r.title}</td>

                    <td className="px-5 py-4">
{r.document_categories?.[0] ? (
  <Pill label={r.document_categories[0].name} color={r.document_categories[0].color_hex} />
) : (
  <span className="text-black">—</span>
)}

                    </td>

                    <td className="px-5 py-4">
                      <ConfidentialityPill v={r.confidentiality} />
                    </td>

                    <td className="px-5 py-4 text-black">{(r.created_at || '').slice(0, 10)}</td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <button title="View" onClick={() => viewDoc(r)} className="text-blue-600 hover:text-blue-800">
                          <EyeIcon className="h-5 w-5" />
                        </button>

                        <button title="Edit" onClick={() => editDoc(r)} className="text-orange-500 hover:text-orange-700">
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>

                        <button
                          title="Download"
                          onClick={() => downloadDoc(r)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
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
            Showing {showingFrom} to {showingTo} of {total} documents
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

            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: PRIMARY }}
            >
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

      {/* Add Document -> choose method */}
      <Modal open={addOpen} title="Add Document" onClose={() => setAddOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-black/70">Choose how you want to add a document.</p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button onClick={openUpload} className="rounded-2xl border p-4 text-left hover:bg-gray-50">
              <p className="text-base font-semibold text-black">Upload Document</p>
              <p className="mt-1 text-sm text-black/70">Upload PDF / DOC / DOCX</p>
            </button>

            <button onClick={openBlank} className="rounded-2xl border p-4 text-left hover:bg-gray-50">
              <p className="text-base font-semibold text-black">Create Blank Document</p>
              <p className="mt-1 text-sm text-black/70">Write in editor and export to PDF</p>
            </button>
          </div>
        </div>
      </Modal>

      {/* Upload modal */}
      <Modal open={uploadOpen} title="Upload Document" onClose={() => setUploadOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Document Name <span className="text-red-500">*</span>
            </label>
            <input
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-black placeholder:text-black/60"
              placeholder="e.g. Witness Statements"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Document Type</label>
              <select
                value={docCategoryId}
                onChange={(e) => setDocCategoryId(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-black"
              >
                <option value="">Select Type (optional)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">Confidentiality</label>
              <select
                value={docConf}
                onChange={(e) => setDocConf(e.target.value as DocConf)}
                className="w-full rounded-xl border px-3 py-2 text-black"
              >
                {[
                  { value: 'public', label: 'Public' },
                  { value: 'internal', label: 'Internal' },
                  { value: 'privileged', label: 'Privileged' },
                  { value: 'confidential', label: 'Confidential' },
                ].map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border bg-white px-3 py-2 text-black"
            />
            <p className="mt-1 text-xs text-black/60">Supported: PDF, DOC, DOCX</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setUploadOpen(false)} className="rounded-xl border px-5 py-2 text-black hover:bg-gray-50">
              Cancel
            </button>
            <button
              disabled={uploading}
              onClick={uploadDocument}
              className="rounded-xl px-6 py-2 text-white disabled:opacity-60"
              style={{ backgroundColor: HOVER }}
              onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = PRIMARY))}
              onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = HOVER))}
            >
              {uploading ? 'Uploading...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Blank modal */}
      <Modal open={blankOpen} title="Create Blank Document" onClose={() => setBlankOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Document Name <span className="text-red-500">*</span>
            </label>
            <input
              value={blankTitle}
              onChange={(e) => setBlankTitle(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-black placeholder:text-black/60"
              placeholder="e.g. Agreement Draft"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Document Type</label>
              <select
                value={blankCategoryId}
                onChange={(e) => setBlankCategoryId(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-black"
              >
                <option value="">Select Type (optional)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">Confidentiality</label>
              <select
                value={blankConf}
                onChange={(e) => setBlankConf(e.target.value as DocConf)}
                className="w-full rounded-xl border px-3 py-2 text-black"
              >
                {[
                  { value: 'public', label: 'Public' },
                  { value: 'internal', label: 'Internal' },
                  { value: 'privileged', label: 'Privileged' },
                  { value: 'confidential', label: 'Confidential' },
                ].map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setBlankOpen(false)} className="rounded-xl border px-5 py-2 text-black hover:bg-gray-50">
              Cancel
            </button>
            <button
              disabled={creating}
              onClick={createBlankDocument}
              className="rounded-xl px-6 py-2 text-white disabled:opacity-60"
              style={{ backgroundColor: HOVER }}
              onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = PRIMARY))}
              onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = HOVER))}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
