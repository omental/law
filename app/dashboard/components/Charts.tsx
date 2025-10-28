// app/dashboard/components/Charts.tsx
'use client';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
} from 'recharts';
export default function Charts() {
  // Mock data for donut chart
  const data = [
    { name: 'Paid', value: 35, color: '#351DEB' },
    { name: 'Unpaid', value: 15, color: '#E6E5E7' },
  ];

  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const paidPercentage = Math.round((data[0].value / total) * 100);

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Billing Overview - Donut Chart */}
<div className="bg-white p-6 rounded-lg shadow">
  <div className="flex justify-between items-start mb-4">
    <div>
      <h3 className="text-[18px] font-medium leading-[28px] text-[rgba(47,43,61,0.9)] tracking-normal text-left">
        Billing Overview
      </h3>
      <p className="text-[15px] font-normal leading-[22px] text-[rgba(47,43,61,0.55)] tracking-normal text-left mt-1">
        Total invoices this month
      </p>
    </div>
    <button className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-sm font-normal">
      + Create Invoice
    </button>
  </div>

  {/* Donut Chart - min height 350px */}
<div className="h-[350px] relative">
  <ResponsiveContainer width="100%" height="100%">
    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius="50%"   
        outerRadius="75%"   
        paddingAngle={2}
        dataKey="value"
        stroke="none"
        isAnimationActive={true}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  </ResponsiveContainer>

  {/* Center Text - now using absolute positioning for perfect centering */}
  <div className="absolute inset-0 flex flex-col items-center justify-center">
    <div className="text-[15px] font-medium leading-[22px] text-[rgba(47,43,61,0.9)] tracking-normal text-center">
      Received
    </div>
    <div className="text-[15px] font-medium leading-[22px] text-[rgba(47,43,61,0.7)] tracking-normal text-center mt-1">
      {paidPercentage}%
    </div>
  </div>
</div>

  {/* Legend */}
  <div className="flex justify-center mt-6 space-x-6">
    <div className="flex items-center space-x-2">
      <div className="w-4 h-4 rounded-full bg-[#351DEB]"></div>
      <span className="text-[15px] font-normal leading-[22px] text-[rgba(47,43,61,0.55)] tracking-normal">
        Paid
      </span>
    </div>
    <div className="flex items-center space-x-2">
      <div className="w-4 h-4 rounded-full bg-[#E6E5E7]"></div>
      <span className="text-[15px] font-normal leading-[22px] text-[rgba(47,43,61,0.55)] tracking-normal">
        Unpaid
      </span>
    </div>
  </div>
</div>

      {/* Month Overview & Earnings Report */}
<div className="bg-white p-6 rounded-lg shadow">
  <div className="flex justify-between items-start mb-4">
    <div>
      <h3 className="text-[18px] font-medium leading-[28px] text-[rgba(47,43,61,0.9)] tracking-normal text-left">
        Month Overview
      </h3>
      <p className="text-[15px] font-normal leading-[22px] text-[rgba(47,43,61,0.55)] tracking-normal text-left mt-1">
        Commercial networks
      </p>
    </div>
    <div className="text-right">
      <div className="text-[18px] font-bold text-[rgba(47,43,61,0.9)]">12,582</div>
      <div className="flex items-center gap-1 text-[14px] text-[rgba(47,43,61,0.55)]">
        <div className="w-3 h-3 rounded-full bg-[#351DEB]"></div>
        <span>Visits</span>
      </div>
    </div>
  </div>

  {/* Line Chart */}
  <div className="h-[350px] relative">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={[
          { name: 'May', visits: 100 },
          { name: 'Jun', visits: 150 },
          { name: 'Jul', visits: 130 },
          { name: 'Aug', visits: 200 },
          { name: 'Sep', visits: 300 },
        ]}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        {/* X-Axis */}
        <XAxis
          dataKey="name"
          tick={{
            fontSize: 14,
            fill: 'rgba(47,43,61,0.55)',
            fontFamily: 'Public Sans',
          }}
          axisLine={false}
          tickLine={false}
        />

        {/* Y-Axis */}
        <YAxis
          domain={[0, 400]}
          tickCount={5}
          tick={{
            fontSize: 14,
            fill: 'rgba(47,43,61,0.55)',
            fontFamily: 'Public Sans',
          }}
          axisLine={false}
          tickLine={false}
        />

        {/* Grid Lines */}
        <CartesianGrid strokeDasharray="3 3" stroke="#E6E5E7" />

        {/* Gradient Definition */}
        <defs>
          <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#351DEB" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#351DEB" stopOpacity={0.1} />
          </linearGradient>
        </defs>

        {/* Area (Fill Under Line) */}
        <Area
          type="monotone"
          dataKey="visits"
          stroke="#351DEB"
          fill="url(#colorVisits)"
          strokeWidth={2}
          dot={{
            r: 4,
            fill: '#351DEB',
            stroke: '#fff',
            strokeWidth: 2,
          }}
          activeDot={{
            r: 6,
            fill: '#351DEB',
            stroke: '#fff',
            strokeWidth: 3,
          }}
        />

        {/* Line (Optional if you want outline) */}
        <Line
          type="monotone"
          dataKey="visits"
          stroke="#351DEB"
          strokeWidth={2}
          dot={false}
          activeDot={{
            r: 6,
            fill: '#351DEB',
            stroke: '#fff',
            strokeWidth: 3,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
</div>

<div className="bg-white p-6 rounded-lg shadow">
  <div className="flex justify-between items-start mb-4">
    <h3 className="text-[18px] font-medium leading-[28px] text-[rgba(47,43,61,0.9)] tracking-normal text-left">
      Earnings Report
    </h3>
    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded text-sm">
      <span className="text-[14px] text-[rgba(47,43,61,0.55)]">06/22/2020 - 06/22/2020</span>
      <ChevronDownIcon className="h-4 w-4 text-[rgba(47,43,61,0.55)]" />
    </div>
  </div>

  {/* Bar Chart */}
  <div className="h-[350px] relative">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={[
          { name: '7/12', earnings: 100 },
          { name: '8/12', earnings: 200 },
          { name: '9/12', earnings: 140 },
          { name: '10/12', earnings: 350 }, // Highlighted bar
          { name: '11/12', earnings: 280 },
          { name: '12/12', earnings: 150 },
        ]}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        {/* X-Axis */}
        <XAxis
          dataKey="name"
          tick={{
            fontSize: 14,
            fill: 'rgba(47,43,61,0.55)',
            fontFamily: 'Public Sans',
          }}
          axisLine={false}
          tickLine={false}
        />

        {/* Y-Axis */}
        <YAxis
          domain={[0, 400]}
          tickCount={5}
          tick={{
            fontSize: 14,
            fill: 'rgba(47,43,61,0.55)',
            fontFamily: 'Public Sans',
          }}
          axisLine={false}
          tickLine={false}
        />

        {/* Grid Lines */}
        <CartesianGrid strokeDasharray="3 3" stroke="#E6E5E7" />

        {/* Bars */}
<Bar
  dataKey="earnings"
  radius={[4, 4, 0, 0]}
  isAnimationActive={true}
>
  {data.map((entry, index) => {
const isHighest = entry.value === Math.max(...data.map(d => d.value));    return (
      <Cell
        key={`cell-${index}`}
        fill={isHighest ? '#351DEB' : '#E8E6FC'} // ✅ Your exact colors
      />
    );
  })}
</Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
    </div>
  );
}