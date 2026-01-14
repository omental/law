'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { XMarkIcon } from '@heroicons/react/24/outline';

const PRIMARY = '#278DCD';
const HOVER = '#3BB143';

type CategoryOpt = { id: string; name: string; color_hex: string };

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
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

export default function AddDocumentModal({
  open,
  onClose,
  caseId,
  categories,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string;
  categories: CategoryOpt[];
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<'choose' | 'upload' | 'blank'>('choose');
  const [saving, setSaving] = useState(false);

  // common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>(''); // optional
  const [confidentiality, setConfidentiality] = useState<'public' | 'internal' | 'privileged'>('public');

  // upload
  const [file, setFile] = useState<File | null>(null);

  const accept = useMemo(() => '.pdf,.doc,.docx', []);

  function resetAll() {
    setMode('choose');
    setTitle('');
    setDescription('');
    setCategoryId('');
    setConfidentiality('public');
    setFile(null);
    setSaving(false);
  }

  async function saveUpload() {
    if (!title.trim()) return alert('Document name is required.');
    if (!file) return alert('Please select a file.');

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'doc', 'docx'].includes(ext)) return alert('Only PDF/DOC/DOCX allowed.');

    setSaving(true);
    try {
      // upload to storage
      const path = `cases/${caseId}/${crypto.randomUUID()}-${file.name}`;

      const { error: upErr } = await supabase.storage.from('case-documents').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;

      // insert row
      const { error: insErr } = await supabase.from('case_documents').insert({
        case_id: caseId,
        category_id: categoryId || null,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        confidentiality,
        source_type: 'upload',

        storage_path: path,
        mime_type: file.type || null,
        file_ext: ext,
        file_size: file.size,
      });

      if (insErr) throw insErr;

      onSaved();
      resetAll();
    } catch (e: any) {
      alert(e?.message ?? 'Upload failed.');
    } finally {
      setSaving(false);
    }
  }

  async function saveBlank() {
    if (!title.trim()) return alert('Document name is required.');
    setSaving(true);
    try {
      // create an editor document record (we’ll open editor next step)
      const { error } = await supabase.from('case_documents').insert({
        case_id: caseId,
        category_id: categoryId || null,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        confidentiality,
        source_type: 'editor',
        editor_html: '<p><br/></p>',
      });

      if (error) throw error;
      alert('Blank document created. Next step: we’ll open the editor to write and export PDF.');
      onSaved();
      resetAll();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to create blank document.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={mode === 'choose' ? 'Add Document' : mode === 'upload' ? 'Upload Document' : 'Create Blank Document'}
      onClose={() => {
        resetAll();
        onClose();
      }}
    >
      {mode === 'choose' && (
        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => setMode('upload')}
            className="rounded-2xl border p-5 text-left hover:bg-gray-50"
          >
            <div className="text-lg font-semibold text-black">Upload Document</div>
            <p className="mt-1 text-sm text-gray-600">
              Upload PDF/DOC/DOCX to this case.
            </p>
          </button>

          <button
            onClick={() => setMode('blank')}
            className="rounded-2xl border p-5 text-left hover:bg-gray-50"
          >
            <div className="text-lg font-semibold text-black">Create Blank Document</div>
            <p className="mt-1 text-sm text-gray-600">
              Write in a Word-like editor and save as PDF.
            </p>
          </button>
        </div>
      )}

      {mode !== 'choose' && (
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Document Name <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-black placeholder:text-black/60"
              placeholder="Enter document name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-black placeholder:text-black/60"
              placeholder="Optional"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">Document Type</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
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
                value={confidentiality}
                onChange={(e) => setConfidentiality(e.target.value as any)}
                className="w-full rounded-xl border px-3 py-2 text-black"
              >
                <option value="public">Public</option>
                <option value="internal">Internal</option>
                <option value="privileged">Privileged</option>
              </select>
            </div>
          </div>

          {mode === 'upload' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                File <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept={accept}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-xl border px-3 py-2 text-black"
              />
              <p className="mt-2 text-xs text-gray-600">Supported: PDF, DOC, DOCX</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setMode('choose')}
              className="rounded-xl border px-5 py-2 text-black hover:bg-gray-50"
            >
              Back
            </button>

            <div className="flex items-center gap-3">
              <button onClick={onClose} className="rounded-xl border px-5 py-2 text-black hover:bg-gray-50">
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={mode === 'upload' ? saveUpload : saveBlank}
                className="rounded-xl px-6 py-2 text-white disabled:opacity-60"
                style={{ backgroundColor: HOVER }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
