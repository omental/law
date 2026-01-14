'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import LinkExt from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

const PRIMARY = '#278DCD';
const HOVER = '#3BB143';

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function DocumentEditor({
  docId,
  caseId,
  title,
  initialJson,
  initialHtml,
  initialPdfPath,
  backHref,
}: {
  docId: string;
  caseId: string;
  title: string;
  initialJson: any | null;
  initialHtml: string | null;
  initialPdfPath: string | null;
  backHref: string;
}) {
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(initialPdfPath);
  const [exporting, setExporting] = useState(false);

  const saveTimer = useRef<any>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      LinkExt.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: 'Start typing your document...',
      }),
    ],
    content: initialJson
      ? initialJson
      : initialHtml
      ? initialHtml
      : '<p></p>',
    editorProps: {
      attributes: {
        class:
          'prose max-w-none focus:outline-none text-black',
      },
    },
  });

  // Debounced autosave
  useEffect(() => {
    if (!editor) return;

    const handler = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          const json = editor.getJSON();
          const html = editor.getHTML();

          const { error } = await supabase
            .from('case_documents')
            .update({
              editor_json: json,
              editor_html: html,
            })
            .eq('id', docId);

          if (error) throw error;

          setLastSavedAt(new Date().toLocaleTimeString());
        } catch (e) {
          // keep silent to avoid annoying spam; you can add toast later
          console.error(e);
        } finally {
          setSaving(false);
        }
      }, 800);
    };

    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [editor, docId]);

  async function getSignedUrl(path: string) {
    const { data, error } = await supabase.storage.from('case-documents').createSignedUrl(path, 60 * 10);
    if (error) throw error;
    return data.signedUrl;
  }

  async function viewPdf() {
    if (!pdfPath) return;
    const url = await getSignedUrl(pdfPath);
    window.open(url, '_blank');
  }

  async function exportToPdf() {
    if (!editor) return;

    setExporting(true);
    try {
      // Dynamically import to avoid turbopack issues
      const html2pdf = (await import('html2pdf.js')).default;

      // Create printable container
      const wrapper = document.createElement('div');
      wrapper.style.padding = '24px';
      wrapper.style.background = 'white';
      wrapper.style.color = 'black';
      wrapper.style.fontFamily = 'Arial, sans-serif';
      wrapper.innerHTML = `
        <div style="font-size:20px;font-weight:700;margin-bottom:16px;">${escapeHtml(title)}</div>
        <div>${editor.getHTML()}</div>
      `;

const opt = {
  margin: 10,
  filename: `${safeFileName(title)}.pdf`,
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
} as const;


      const worker = html2pdf().set(opt).from(wrapper);
      const blob: Blob = await worker.outputPdf('blob');

      const newPdfPath = `cases/${caseId}/generated/${docId}.pdf`;

      const { error: upErr } = await supabase.storage
        .from('case-documents')
        .upload(newPdfPath, blob, {
          upsert: true,
          contentType: 'application/pdf',
        });

      if (upErr) throw upErr;

      const { error: updErr } = await supabase
        .from('case_documents')
        .update({ pdf_storage_path: newPdfPath })
        .eq('id', docId);

      if (updErr) throw updErr;

      setPdfPath(newPdfPath);
      await viewPdf();
    } catch (e) {
      console.error(e);
      alert('Failed to export PDF.');
    } finally {
      setExporting(false);
    }
  }

  if (!editor) return <div className="text-black">Loading editor...</div>;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm text-black hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back
          </Link>

          <div>
            <h1 className="text-xl font-semibold text-black">{title}</h1>
            <p className="text-xs text-black/60">
              {saving ? 'Saving…' : lastSavedAt ? `Saved at ${lastSavedAt}` : 'Autosave enabled'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={!pdfPath}
            onClick={viewPdf}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm',
              pdfPath ? 'text-black hover:bg-gray-50' : 'text-gray-400'
            )}
          >
            <EyeIcon className="h-5 w-5" />
            View PDF
          </button>

          <button
            disabled={exporting}
            onClick={exportToPdf}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-white shadow-sm disabled:opacity-60"
            style={{ backgroundColor: HOVER }}
            onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = PRIMARY))}
            onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = HOVER))}
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <ToolBtn label="H1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} />
          <ToolBtn label="H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} />
          <ToolBtn label="B" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} />
          <ToolBtn label="I" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} />
          <ToolBtn label="U" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} />
          <ToolBtn label="• List" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} />
          <ToolBtn label="1. List" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} />
          <ToolBtn label="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} />
          <ToolBtn label="Left" onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} />
          <ToolBtn label="Center" onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} />
          <ToolBtn label="Right" onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} />
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolBtn({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl border px-3 py-2 text-sm text-black hover:bg-gray-50',
        active && 'bg-gray-100'
      )}
      type="button"
    >
      {label}
    </button>
  );
}

function safeFileName(name: string) {
  return name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'document';
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
