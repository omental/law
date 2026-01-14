'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

import CaseHeaderCard from './components/CaseHeaderCard';
import CaseTabs from './components/CaseTabs';

type CaseView = {
  id: string;
  case_code: string;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High';
  filing_date: string | null;
  expected_completion: string | null;
  is_active: boolean;
  created_at: string;

  clients?: { id: string; name: string } | null;
  case_types?: { id: string; name: string; color_hex: string } | null;
  case_statuses?: { id: string; name: string; color_hex: string } | null;
};

export default function CaseSinglePage() {
  const params = useParams<{ case_code: string }>();
  const router = useRouter();
  const caseCode = params.case_code;

  const [loading, setLoading] = useState(true);
  const [caseRow, setCaseRow] = useState<CaseView | null>(null);

  // tabs: timeline | members | documents | tasks | notes
  const [tab, setTab] = useState<'timeline' | 'members' | 'documents' | 'tasks' | 'notes'>('timeline');

  async function fetchCase() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cases')
        .select(
          `
          id,case_code,title,description,priority,filing_date,expected_completion,is_active,created_at,
          clients:client_id ( id,name ),
          case_types:case_type_id ( id,name,color_hex ),
          case_statuses:case_status_id ( id,name,color_hex )
        `
        )
        .eq('case_code', caseCode)
        .single();

      if (error) throw error;

const row: any = data;

setCaseRow({
  id: row.id,
  case_code: row.case_code,
  title: row.title,
  description: row.description ?? null,
  priority: row.priority,
  filing_date: row.filing_date ?? null,
  expected_completion: row.expected_completion ?? null,
  is_active: !!row.is_active,
  created_at: row.created_at,

  // Normalize possible array/object/null into object|null
  clients: Array.isArray(row.clients) ? row.clients[0] ?? null : row.clients ?? null,
  case_types: Array.isArray(row.case_types) ? row.case_types[0] ?? null : row.case_types ?? null,
  case_statuses: Array.isArray(row.case_statuses) ? row.case_statuses[0] ?? null : row.case_statuses ?? null,
});
    } catch (e) {
      router.push('/dashboard/cases');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseCode]);

  if (loading) return <div className="text-black">Loading...</div>;
  if (!caseRow) return null;

  return (
    <div className="space-y-5">
      {/* Title + back button */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-black">
          {caseRow.title} <span className="font-normal text-gray-600">({caseRow.case_code})</span>
        </h1>

        <Link
          href="/dashboard/cases"
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-black hover:bg-gray-50"
        >
          ← Back to Cases
        </Link>
      </div>

      {/* Summary card (NO court details) */}
      <CaseHeaderCard c={caseRow} />

      {/* Tabs */}
      <CaseTabs tab={tab} setTab={setTab} caseId={caseRow.id} />
    </div>
  );
}
