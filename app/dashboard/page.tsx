'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import QuickActions from './components/QuickActions';
import OverviewCards from './components/OverviewCards';
import Charts from './components/Charts';
import Messages from './components/Messages';
import ActiveCases from './components/ActiveCases';
import StorageGauge from './components/StorageGauge';

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserName(session.user.email.split('@')[0] || 'User');
        
        const {  profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        setUserRole(profile?.role || 'client');
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="p-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-sm text-gray-500">Hi {userName}, here's what's on your agenda today</div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-6 mt-6">
        <OverviewCards />
      </div>

      {/* Charts & Messages */}
      <div className="grid grid-cols-1  gap-6 mt-6">
          <Charts />
      </div>

      {/* Active Cases & Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <ActiveCases />
        </div>
        <div>
          <StorageGauge />
        </div>
      </div>
    </div>
  );
}