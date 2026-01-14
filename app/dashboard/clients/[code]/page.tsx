'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

import {
  ArrowLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  CalendarDaysIcon,
  IdentificationIcon,
  BanknotesIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

type ClientDetail = {
  id: string;
  client_code: string;
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

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold
      ${isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-black border-gray-200'}`}
    >
      {isActive ? 'Active' : 'Archived'}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-xl border transition
      ${active ? 'bg-white text-black border-black/10 shadow-sm' : 'bg-transparent text-black border-transparent hover:border-black/10 hover:bg-white'}`}
    >
      {children}
    </button>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-xl border bg-white flex items-center justify-center">
        <Icon className="h-5 w-5 text-black/70" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-black">{label}</div>
        <div className="text-sm text-black break-words">{value ?? '—'}</div>
      </div>
    </div>
  );
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  // if date is like "YYYY-MM-DD", keep it readable
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleString();
}

export default function ClientSinglePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params?.code;

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'documents' | 'cases'>('documents');

  const initials = useMemo(() => {
    const n = client?.name?.trim() ?? '';
    if (!n) return 'CL';
    const parts = n.split(' ').filter(Boolean);
    const a = parts[0]?.[0] ?? 'C';
    const b = parts[1]?.[0] ?? '';
    return (a + b).toUpperCase();
  }, [client?.name]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        if (!code) {
          setErrorMsg('Client code missing in URL.');
          setClient(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('clients')
          .select(
            `
            id, client_code, name, email, phone, company_name, address, date_of_birth, reference_source, notes,
            picture_url, status, created_at,
            client_types:client_type_id ( name ),
            billing_currencies:billing_currency_id ( name, symbol )
          `
          )
          .eq('client_code', code)
          .single();

        if (error) throw error;

        setClient((data as any) ?? null);
      } catch (e: any) {
        setClient(null);
        setErrorMsg(e?.message ?? 'Failed to load client.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [code]);

  return (
    <div className="p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/clients')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white text-black hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back
          </button>

          <div>
            <div className="text-2xl font-bold text-black">Client Details</div>
            <div className="text-sm text-black/70">View client profile and future documents/cases</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* These links can be enabled later */}
          <Link
            href="/dashboard/clients"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: PRIMARY }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
          >
            Clients List
          </Link>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="bg-white border rounded-2xl p-6 text-sm text-black/70">Loading…</div>
      ) : errorMsg ? (
        <div className="bg-white border rounded-2xl p-6">
          <div className="text-sm font-semibold text-red-600">{errorMsg}</div>
        </div>
      ) : !client ? (
        <div className="bg-white border rounded-2xl p-6 text-sm text-black/70">Client not found.</div>
      ) : (
        <>
          {/* Header Card */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1: Avatar */}
              <div className="flex items-start gap-4">
                <div className="relative">
                  {client.picture_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={client.picture_url}
                      alt={client.name}
                      className="h-28 w-28 rounded-2xl object-cover border"
                    />
                  ) : (
                    <div className="h-28 w-28 rounded-2xl border bg-gray-50 flex items-center justify-center text-xl font-bold text-black">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-xl font-bold text-black truncate">{client.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-black">{client.client_code}</span>
                    <StatusBadge status={client.status} />
                  </div>

                  {client.company_name ? (
                    <div className="mt-2 text-sm text-black/80">
                      <span className="font-semibold text-black">Company:</span> {client.company_name}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Column 2: Client Information */}
              <div className="space-y-4">
                <div className="text-sm font-bold text-black">Client Information</div>

                <InfoRow
                  icon={EnvelopeIcon}
                  label="Email"
                  value={client.email ? <span className="text-black">{client.email}</span> : '—'}
                />
                <InfoRow icon={PhoneIcon} label="Phone" value={client.phone ?? '—'} />
                <InfoRow icon={MapPinIcon} label="Address" value={client.address ?? '—'} />
              </div>

              {/* Column 3: Additional Information */}
              <div className="space-y-4">
                <div className="text-sm font-bold text-black">Additional Information</div>

                <InfoRow icon={IdentificationIcon} label="Client ID" value={client.client_code} />
                <InfoRow icon={TagIcon} label="Client Type" value={client.client_types?.name ?? '—'} />
                <InfoRow
                  icon={BanknotesIcon}
                  label="Billing Currency"
                  value={
                    client.billing_currencies
                      ? `${client.billing_currencies.name}${client.billing_currencies.symbol ? ` (${client.billing_currencies.symbol})` : ''}`
                      : '—'
                  }
                />
                <InfoRow icon={CalendarDaysIcon} label="Created At" value={fmtDate(client.created_at)} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <TabButton active={activeTab === 'documents'} onClick={() => setActiveTab('documents')}>
                Documents
              </TabButton>
              <TabButton active={activeTab === 'cases'} onClick={() => setActiveTab('cases')}>
                Cases
              </TabButton>
            </div>

            <div className="p-6">
              {activeTab === 'documents' ? (
                <div className="text-sm text-black/70">
                  Documents will appear here later. (We will integrate after the documents module is ready.)
                </div>
              ) : (
                <div className="text-sm text-black/70">
                  Cases will appear here later. (We will integrate after the case management module is ready.)
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
