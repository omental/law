'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import DocumentEditor from './components/DocumentEditor';

type DocRow = {
  id: string;
  case_id: string;
  title: string;
  source_type: 'upload' | 'editor';
  editor_json: any | null;
  editor_html: string | null;
  pdf_storage_path: string | null;
  created_at: string;
};

export default function DocumentEditPage() {
  const params = useParams<{ case_code: string; doc_id: string }>();
  const router = useRouter();

  const docId = params.doc_id;

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<DocRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const caseCode = useMemo(() => params.case_code, [params.case_code]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from('case_documents')
        .select('id,case_id,title,source_type,editor_json,editor_html,pdf_storage_path,created_at')
        .eq('id', docId)
        .single();

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      // Only editor docs are editable here
      if (data.source_type !== 'editor') {
        router.push(`/dashboard/cases/${caseCode}`);
        return;
      }

      setDoc(data as DocRow);
      setLoading(false);
    })();
  }, [docId, router, caseCode]);

  if (loading) return <div className="text-black">Loading...</div>;
  if (err) return <div className="text-red-600">{err}</div>;
  if (!doc) return <div className="text-black">Document not found.</div>;

  return (
    <DocumentEditor
      docId={doc.id}
      caseId={doc.case_id}
      title={doc.title}
      initialJson={doc.editor_json}
      initialHtml={doc.editor_html}
      initialPdfPath={doc.pdf_storage_path}
      backHref={`/dashboard/cases/${caseCode}`}
    />
  );
}
