'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PRIMARY = '#278DCD';

function Tab({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition`}
      style={{
        backgroundColor: active ? PRIMARY : '#fff',
        color: active ? '#fff' : '#111827',
        borderColor: active ? PRIMARY : '#E5E7EB',
      }}
    >
      {label}
    </Link>
  );
}

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Tab href="/dashboard/clients" label="Clients" />
        <Tab href="/dashboard/clients/types" label="Client Types" />
        <Tab href="/dashboard/clients/currencies" label="Billing Currencies" />
      </div>

      {children}
    </div>
  );
}
