// app/dashboard/components/QuickActions.tsx
'use client';

import { useRouter } from 'next/navigation';
import {
  ClockIcon,
  FolderIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

export default function QuickActions() {
  const router = useRouter();

  const actions = [
    { name: 'Log Time', icon: <ClockIcon className="h-5 w-5" />, href: '/dashboard/log-time' },
    { name: 'Case Intake', icon: <FolderIcon className="h-5 w-5" />, href: '/dashboard/case-intake' },
    { name: 'To Do', icon: <CheckCircleIcon className="h-5 w-5" />, href: '/dashboard/to-do' },
    { name: 'Invoice', icon: <CurrencyDollarIcon className="h-5 w-5" />, href: '/dashboard/invoice' },
    { name: 'Document', icon: <DocumentIcon className="h-5 w-5" />, href: '/dashboard/document' },
  ];

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      {actions.map((action) => (
        <button
          key={action.name}
          onClick={() => router.push(action.href)}
          className="flex items-center justify-center gap-2 w-[264px] h-[48px] rounded-lg bg-[rgba(53,29,235,0.04)] text-[#351DEB] font-medium transition-all duration-200 hover:bg-[#351DEB] hover:text-white"
        >
          {action.icon}
          <span>{action.name}</span>
        </button>
      ))}
    </div>
  );
}