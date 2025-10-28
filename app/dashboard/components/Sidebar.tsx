// app/dashboard/components/Sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

// Import Heroicons
import {
  HomeIcon,
  UsersIcon,
  UserIcon,
  CheckCircleIcon,
  FolderIcon,
  CalendarIcon,
  BookmarkIcon,
  DocumentIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CreditCardIcon,
  ArrowDownCircleIcon,
  ChatBubbleLeftIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';

type Role = 'superadmin' | 'company' | 'advocate' | 'client';

// ✅ Accept collapsed prop
const Sidebar = ({ collapsed = false }: { collapsed?: boolean }) => {
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        router.push('/login');
        setLoading(false);
        return;
      }

      setUserRole(profile.role as Role);
      setLoading(false);
    };

    fetchRole();
  }, [router]);

  if (loading) return null;

  const menuItems: Record<Role, { name: string; href: string; icon: React.ElementType }[]> = {
    superadmin: [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'Staff', href: '/dashboard/staff', icon: UsersIcon },
      { name: 'Client', href: '/dashboard/client', icon: UserIcon },
      { name: 'Advocate', href: '/dashboard/advocate', icon: CheckCircleIcon },
      { name: 'Cases', href: '/dashboard/cases', icon: FolderIcon },
      { name: 'To-Do', href: '/dashboard/todo', icon: CalendarIcon },
      { name: 'Case Diary / Cable', href: '/dashboard/diary', icon: BookmarkIcon },
      { name: 'Documents', href: '/dashboard/documents', icon: DocumentIcon },
      { name: 'Invoice', href: '/dashboard/invoice', icon: CurrencyDollarIcon },
      { name: 'Cause List', href: '/dashboard/cause-list', icon: ClipboardDocumentListIcon },
      { name: 'Timesheet', href: '/dashboard/timesheet', icon: ClockIcon },
      { name: 'Expense', href: '/dashboard/expense', icon: CreditCardIcon },
      { name: 'Fee Received', href: '/dashboard/fee-received', icon: ArrowDownCircleIcon },
      { name: 'Messenger', href: '/dashboard/messenger', icon: ChatBubbleLeftIcon },
      { name: 'Plan', href: '/dashboard/plan', icon: TrophyIcon },
    ],
    company: [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'Advocates', href: '/dashboard/advocates', icon: CheckCircleIcon },
      { name: 'Clients', href: '/dashboard/clients', icon: UserIcon },
      { name: 'Cases', href: '/dashboard/cases', icon: FolderIcon },
    ],
    advocate: [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'My Cases', href: '/dashboard/cases', icon: FolderIcon },
      { name: 'Messages', href: '/dashboard/chat', icon: ChatBubbleLeftIcon },
      { name: 'Documents', href: '/dashboard/documents', icon: DocumentIcon },
    ],
    client: [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'My Cases', href: '/dashboard/cases', icon: FolderIcon },
      { name: 'Messages', href: '/dashboard/chat', icon: ChatBubbleLeftIcon },
    ],
  };

  const items = userRole ? menuItems[userRole] : [];

  return (
<aside
  className={`bg-white min-h-screen flex flex-col transition-all duration-300 ease-in-out ${
    collapsed ? 'w-[72px]' : 'w-64'
  } shadow-[0px_2px_8px_0px_rgba(47,43,61,0.12)]`}
>
      {/* Logo */}
      <div
        className={`p-4 pt-6 pb-10 flex items-center gap-2 ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <img
          src="/logo.png"
          alt="VILO Logo"
          className={`h-8 w-auto ${collapsed ? 'mx-auto' : ''}`}
        />
      </div>

{/* Apps & Pages Header */}
{!collapsed && (
  <div className="px-4 py-2">
    <h3 className="text-xs font-medium text-gray-600-40">APPS & PAGES</h3>
  </div>
)}

      {/* Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.href} className="group">
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal transition-colors ${
                  pathname === item.href
                    ? 'bg-[#351DEB] text-white'
                    : 'text-[#2F2B3D] group-hover:bg-[#351DEB] group-hover:text-white'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <item.icon
                  className={`h-5 w-5 transition-colors ${
                    pathname === item.href
                      ? 'text-white'
                      : 'text-[#1F3251] group-hover:text-white'
                  }`}
                />
                {!collapsed && (
                  <span className="leading-[22px]">{item.name}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Quick Metrics */}
      {!collapsed && (
        <>
          <div className="px-4 py-2">
            <h3 className="text-xs font-medium text-gray-600-40">QUICK METRICS</h3>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span>Open Cases: 52</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span>Total Billable Hours: 3.2</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Unpaid Invoices: $0</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Recent Activity */}
      {!collapsed && (
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-600-40 mb-2">
            RECENT ACTIVITY
          </h3>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span>Lorem Ipsum</span>
                </div>
                <span className="text-gray-400">4:22 PM</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {!collapsed && (
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 mb-2">
            QUICK ACTIONS
          </h3>
          <div className="space-y-2">
            <button className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md text-sm">
              <FolderIcon className="h-5 w-5" />
              <span>Create Case</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md text-sm">
              <UserIcon className="h-5 w-5" />
              <span>Add Client</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md text-sm">
              <DocumentIcon className="h-5 w-5" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>
      )}

      {/* Sign Out */}
      {!collapsed && (
        <div className="p-4">
          <button
            onClick={() => {
              supabase.auth.signOut();
              router.push('/login');
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;