// app/dashboard/components/ActiveCases.tsx
export default function ActiveCases() {
  const cases = [
    { name: 'Work with your attorney to conduct.', client: 'Jordan Stevenson', status: 'Completed', team: ['J', 'S'] },
    { name: 'Work with your attorney to conduct.', client: 'Jordan Stevenson', status: 'Discovery', team: ['J', 'S'] },
    { name: 'Work with your attorney to conduct.', client: 'Jordan Stevenson', status: 'In Progress', team: ['J', 'S'] },
    { name: 'Work with your attorney to conduct.', client: 'Jordan Stevenson', status: 'Verified', team: ['J', 'S'] },
    { name: 'Work with your attorney to conduct.', client: 'Jordan Stevenson', status: 'Completed', team: ['J', 'S'] },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-[18px] font-medium leading-[28px] text-[rgba(47,43,61,0.9)] tracking-normal text-left mb-4">
        Active Cases
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(230,229,231,1)]">
              <th className="text-left py-4 px-4 text-[13px] font-medium leading-[24px] text-[rgba(47,43,61,0.9)] tracking-[0.2px] uppercase">
                CASE NAME
              </th>
              <th className="text-left py-4 px-4 text-[13px] font-medium leading-[24px] text-[rgba(47,43,61,0.9)] tracking-[0.2px] uppercase">
                CLIENT NAME
              </th>
              <th className="text-left py-4 px-4 text-[13px] font-medium leading-[24px] text-[rgba(47,43,61,0.9)] tracking-[0.2px] uppercase">
                STATUS
              </th>
              <th className="text-left py-4 px-4 text-[13px] font-medium leading-[24px] text-[rgba(47,43,61,0.9)] tracking-[0.2px] uppercase">
                TEAM
              </th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c, i) => (
              <tr key={i} className="border-b border-[rgba(230,229,231,1)]">
                {/* Case Name */}
                <td className="py-4 px-4 text-[15px] font-medium leading-[22px] text-[rgba(47,43,61,0.9)] tracking-normal text-left">
                  {c.name}
                </td>

                {/* Client Name */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                      {c.client.charAt(0)}
                    </div>
                    <span className="text-[15px] font-normal leading-[22px] text-[rgba(47,43,61,0.9)] tracking-normal">
                      {c.client}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="py-4 px-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      c.status === 'Completed'
                        ? 'bg-green-100 text-green-800'
                        : c.status === 'Discovery'
                        ? 'bg-yellow-100 text-yellow-800'
                        : c.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : c.status === 'Verified'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>

                {/* Team */}
                <td className="py-4 px-4">
                  <div className="flex -space-x-2">
                    {c.team.map((t, j) => (
                      <div
                        key={j}
                        className="w-6 h-6 bg-gray-300 text-xs rounded-full flex items-center justify-center text-[rgba(47,43,61,0.7)] font-medium"
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}