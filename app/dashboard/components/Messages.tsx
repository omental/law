// app/dashboard/components/Messages.tsx
export default function Messages() {
  const messages = [
    { name: 'Adalberto Granin', role: 'UX/UI Designer', date: 'Apr 8', avatar: 'A' },
    { name: 'Heather Gislason', role: 'UI Designer', date: 'Jan 20', avatar: 'H' },
    { name: 'Rosemary Hettinger', role: 'Direct Mobility Manager', date: 'Jan 22', avatar: 'R' },
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-semibold mb-4">Messages</h3>
      <div className="space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">
              {msg.avatar}
            </div>
            <div className="flex-1">
              <div className="font-medium">{msg.name}</div>
              <div className="text-xs text-gray-500">{msg.role}</div>
            </div>
            <div className="text-xs text-gray-400">{msg.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}