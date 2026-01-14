'use client';

type CaseView = {
  id: string;
  case_code: string;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High';
  filing_date: string | null;
  expected_completion: string | null;
  is_active: boolean;

  clients?: { id: string; name: string } | null;
  case_types?: { id: string; name: string; color_hex: string } | null;
  case_statuses?: { id: string; name: string; color_hex: string } | null;
};

function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: bg, color: fg }}>
      {label}
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

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${cls}`}>{p}</span>;
}

export default function CaseHeaderCard({ c }: { c: CaseView }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-6">
        <div>
          <p className="text-xs text-gray-600">Client:</p>
          <p className="text-black">{c.clients?.name ?? '—'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-600">Case Type:</p>
          <p className="text-black">{c.case_types?.name ?? '—'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-600">Filing Date:</p>
          <p className="text-black">{c.filing_date ?? '—'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-600">Expected Completion:</p>
          <p className="text-black">{c.expected_completion ?? '—'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-600">Status:</p>
          {c.case_statuses ? (
            <Pill label={c.case_statuses.name} bg={`${c.case_statuses.color_hex}22`} fg={c.case_statuses.color_hex} />
          ) : (
            <p className="text-black">—</p>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-600">Priority:</p>
          <PriorityBadge p={c.priority} />
        </div>
      </div>

      <div className="border-t p-5">
        <p className="text-sm font-medium text-gray-700 mb-2">Description:</p>
        <p className="text-black">{c.description?.trim() ? c.description : '—'}</p>
      </div>
    </div>
  );
}
