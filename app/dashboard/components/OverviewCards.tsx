// app/dashboard/components/OverviewCards.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

export default function OverviewCards() {
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(0);
  const [currentYear, setCurrentYear] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // Initialize with today's date
  useEffect(() => {
    const today = new Date();
    setSelectedDate(today.getDate());
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setIsClient(true);
  }, []);

  // Mock data
  const stats = [
    { label: 'Tasks Due Today', value: 14, change: '+29%', color: 'text-green-600' },
    { label: 'Today’s To Do’s', value: 12, change: '+42%', color: 'text-green-600' },
    { label: 'Time logged today', value: 36260, change: '+42%', color: 'text-green-600' },
  ];

  // Generate days for current month
  const daysInMonth = isClient ? new Date(currentYear, currentMonth + 1, 0).getDate() : 31;
  const firstDay = isClient ? new Date(currentYear, currentMonth, 1).getDay() : 0;

  const renderCalendarDays = () => {
    if (!isClient) return null;
    
    const days = [];
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = 
        day === new Date().getDate() &&
        currentMonth === new Date().getMonth() &&
        currentYear === new Date().getFullYear();

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(day)}
          className={`h-8 w-8 flex items-center justify-center rounded-full cursor-pointer transition ${
            selectedDate === day
              ? 'bg-[#351DEB] text-white'
              : isToday
              ? 'border border-[#351DEB] text-[#351DEB]'
              : 'hover:bg-gray-100'
          }`}
        >
          {day}
        </div>
      );
    }
    return days;
  };

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (!isClient) return null;

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Panel: col-span-8 */}
      <div className="col-span-12 lg:col-span-8 bg-white p-4 rounded-lg shadow">
<h2
  className="text-[18px] font-medium leading-[28px] text-[rgba(47,43,61,0.9)] text-left mb-1 tracking-normal"
>
  Today’s Overview
</h2>
<p
  className="text-[15px] font-normal leading-[22px] text-[rgba(47,43,61,0.55)] text-left mb-4 tracking-normal"
>
  Hi Kemilee, here’s what’s on your agenda today
</p>

        {/* Stats Cards - Horizontal */}
<div className="flex gap-4 mb-4">
  {stats.map((stat, i) => (
    <div
      key={i}
      className="p-[24px] border border-[rgba(230,229,231,1)] rounded-[6px] bg-white flex-1 min-w-0"
    >
      <div
        className="text-[15px] font-normal leading-[22px] text-[rgba(47,43,61,0.9)] text-left"
        style={{ letterSpacing: '0px' }}
      >
        {stat.label}
      </div>
      <div className="flex items-baseline mt-1">
        <span
          className="text-[24px] font-medium leading-[38px] text-[rgba(47,43,61,0.9)] text-left"
          style={{ letterSpacing: '0px' }}
        >
          {stat.value}
        </span>
        <span
          className="ml-1 text-[15px] font-normal leading-[22px] text-[rgba(40,199,111,1)] text-left"
          style={{ letterSpacing: '0px', fontFamily: '"Public Sans", sans-serif' }}
        >
          {stat.change}
        </span>
      </div>
    </div>
  ))}
</div>

        {/* Upcoming & Expenses */}
      </div>

      {/* Right Panel: col-span-4 */}
      <div className="col-span-12 lg:col-span-4 bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <button onClick={goToPrevMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button onClick={goToNextMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 bg-gray-100 text-xs rounded">Monthly</button>
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
            <div key={day} className="h-8 w-8 flex items-center justify-center text-xs text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {renderCalendarDays()}
        </div>
      </div>
    </div>
  );
}