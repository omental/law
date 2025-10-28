// app/dashboard/components/StorageGauge.tsx
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function StorageGauge() {
  const used = 85; // 85%
  const total = 1000; // MB
  const usedMB = Math.round((used / 100) * total); // 850

  // Generate segments for the gauge
  const totalSegments = 24;
  const usedSegments = Math.ceil((used / 100) * totalSegments);

  const data = Array.from({ length: totalSegments }, (_, i) => ({
    value: 1,
    fill: i < usedSegments ? '#351DEB' : '#E6E5E7',
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-[18px] font-medium leading-[28px] text-[rgba(47,43,61,0.9)] tracking-normal text-left mb-4">
        Storage
      </h3>
      <div className="relative w-full h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180} // Start from top
              endAngle={0}     // End at bottom → creates semi-circle
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={1}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[32px] font-bold text-[rgba(47,43,61,0.9)] tracking-normal">
            {used}%
          </div>
          <div className="text-[15px] font-normal leading-[22px] text-[rgba(47,43,61,0.55)] tracking-normal mt-1">
            {usedMB}MB of {total}MB
          </div>
        </div>
      </div>
    </div>
  );
}