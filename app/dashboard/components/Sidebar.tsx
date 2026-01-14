// app/dashboard/components/Sidebar.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

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
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

type Role = 'superadmin' | 'company' | 'advocate' | 'client';

type NavItem = {
  name: string;
  href?: string;
  icon?: React.ElementType;
  children?: NavItem[];
};

const Sidebar = ({ collapsed = false }: { collapsed?: boolean }) => {
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  // expand states
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Case Management': true,
    'Case Setup': true,
  });

  useEffect(() => {
    const fetchRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

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

  const isActiveHref = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

const hasActiveChild = (item?: NavItem): boolean => {
  if (!item?.children?.length) return false;
  return item.children.some((c) => isActiveHref(c.href) || hasActiveChild(c));
};

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const caseManagementItem = useMemo<NavItem>(
    () => ({
      name: 'Case Management',
      icon: FolderIcon,
      children: [
        {
          name: 'Case Setup',
          children: [
            { name: 'Case Types', href: '/dashboard/case-setup/case-types' },
            { name: 'Case Statuses', href: '/dashboard/case-setup/case-statuses' },
            { name: 'Event Types', href: '/dashboard/case-setup/event-types' },
            { name: 'Hearing Types', href: '/dashboard/case-setup/hearing-types' },
          ],
        },
        { name: 'Cases', href: '/dashboard/cases' },
        { name: 'Hearings', href: '/dashboard/hearings' },
      ],
    }),
    []
  );

  const menuItems: Record<Role, NavItem[]> = useMemo(
    () => ({
      superadmin: [
        { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
        { name: 'Staff', href: '/dashboard/staff', icon: UsersIcon },
        { name: 'Client', href: '/dashboard/clients', icon: UserIcon },
        { name: 'Advocate', href: '/dashboard/advocate', icon: CheckCircleIcon },

        // ✅ replace "Cases" with "Case Management"
        caseManagementItem,

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

        // ✅ replace "Cases" with "Case Management"
        caseManagementItem,
      ],

      advocate: [
        { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },

        // ✅ replace "My Cases" with "Case Management"
        {
          name: 'Case Management',
          icon: FolderIcon,
          children: [
            { name: 'Cases', href: '/dashboard/cases' },
            { name: 'Hearings', href: '/dashboard/hearings' },
          ],
        },

        { name: 'Messages', href: '/dashboard/chat', icon: ChatBubbleLeftIcon },
        { name: 'Documents', href: '/dashboard/documents', icon: DocumentIcon },
      ],

      client: [
        { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },

        // ✅ replace "My Cases" with "Case Management"
        {
          name: 'Case Management',
          icon: FolderIcon,
          children: [
            { name: 'Cases', href: '/dashboard/cases' },
            { name: 'Hearings', href: '/dashboard/hearings' },
          ],
        },

        { name: 'Messages', href: '/dashboard/chat', icon: ChatBubbleLeftIcon },
      ],
    }),
    [caseManagementItem]
  );

  // Auto-open groups when route is inside them
  useEffect(() => {
    if (!userRole) return;
    const items = menuItems[userRole] ?? [];

    const ensureOpen = (item: NavItem) => {
      if (item.children?.length) {
        const active = hasActiveChild(item);
        if (active) {
          setOpenGroups((prev) => ({ ...prev, [item.name]: true }));
          item.children.forEach(ensureOpen);
        }
      }
    };

    items.forEach(ensureOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, userRole]);

  if (loading) return null;

  const items = userRole ? menuItems[userRole] : [];

  const ActiveLinkClass =
    'bg-[#351DEB] text-white';
  const InactiveLinkClass =
    'text-[#2F2B3D] group-hover:bg-[#351DEB] group-hover:text-white';

  const renderItem = (item: NavItem, level = 0) => {
    const Icon = item.icon;
    const isGroup = !!item.children?.length;
    const active =
      isActiveHref(item.href) || hasActiveChild(item);

    // padding per level (indented submenu)
    const padLeft = collapsed ? 'px-2' : level === 0 ? 'px-3' : level === 1 ? 'pl-10 pr-3' : 'pl-14 pr-3';

    if (isGroup) {
      const isOpen = openGroups[item.name] ?? false;

      return (
        <li key={item.name} className="space-y-1">
          <button
            type="button"
            onClick={() => toggleGroup(item.name)}
            className={`
              group w-full flex items-center justify-between gap-3 py-2 rounded-md text-sm font-normal transition-colors
              ${active ? ActiveLinkClass : InactiveLinkClass}
              ${collapsed ? 'justify-center px-2' : padLeft}
            `}
          >
            <span className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
              {Icon ? (
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    active ? 'text-white' : 'text-[#1F3251] group-hover:text-white'
                  }`}
                />
              ) : (
                <span className="h-5 w-5" />
              )}

              {!collapsed && <span className="leading-[22px]">{item.name}</span>}
            </span>

            {!collapsed && (
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${
                  active ? 'text-white' : 'text-[#1F3251] group-hover:text-white'
                }`}
              />
            )}
          </button>

          {!collapsed && isOpen && (
            <ul className="space-y-1">
              {item.children!.map((child) => renderItem(child, level + 1))}
            </ul>
          )}
        </li>
      );
    }

    // normal link item
    return (
      <li key={item.href ?? item.name} className="group">
        <Link
          href={item.href!}
          className={`
            flex items-center gap-3 py-2 rounded-md text-sm font-normal transition-colors
            ${isActiveHref(item.href) ? ActiveLinkClass : InactiveLinkClass}
            ${collapsed ? 'justify-center px-2' : padLeft}
          `}
        >
          {Icon ? (
            <Icon
              className={`h-5 w-5 transition-colors ${
                isActiveHref(item.href) ? 'text-white' : 'text-[#1F3251] group-hover:text-white'
              }`}
            />
          ) : (
            <span className="h-5 w-5" />
          )}

          {!collapsed && <span className="leading-[22px]">{item.name}</span>}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={`bg-white min-h-screen flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-64'
      } shadow-[0px_2px_8px_0px_rgba(47,43,61,0.12)]`}
    >
      {/* Logo */}
      <div className={`p-4 pt-6 pb-10 flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
        <img src="/logo.png" alt="VILO Logo" className={`h-8 w-auto ${collapsed ? 'mx-auto' : ''}`} />
      </div>

      {/* Apps & Pages Header */}
      {!collapsed && (
        <div className="px-4 py-2">
          <h3 className="text-xs font-medium text-gray-600-40">APPS & PAGES</h3>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">{items.map((item) => renderItem(item, 0))}</ul>
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
          <h3 className="text-xs font-semibold text-gray-600-40 mb-2">RECENT ACTIVITY</h3>
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
          <h3 className="text-xs font-semibold text-gray-500 mb-2">QUICK ACTIONS</h3>
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