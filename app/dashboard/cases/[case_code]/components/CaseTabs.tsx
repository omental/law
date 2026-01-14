'use client';

import TimelineTab from '../tabs/TimelineTab';
import TeamMembersTab from '../tabs/TeamMembersTab';
import DocumentsTab from '../tabs/DocumentsTab';
import TasksTab from '../tabs/TasksTab';
import NotesTab from '../tabs/NotesTab';

type TabKey = 'timeline' | 'members' | 'documents' | 'tasks' | 'notes';

export default function CaseTabs({
  tab,
  setTab,
  caseId,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  caseId: string;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'members', label: 'Team Members' },
    { key: 'documents', label: 'Documents' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'notes', label: 'Notes' },
  ];

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      {/* Tab header */}
      <div className="flex flex-wrap gap-2 border-b p-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm ${
              tab === t.key ? 'bg-blue-50 text-black border border-blue-200' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {tab === 'timeline' && <TimelineTab caseId={caseId} />}
        {tab === 'members' && <TeamMembersTab />}
{tab === 'documents' && <DocumentsTab caseId={caseId} />}
        {tab === 'tasks' && <TasksTab />}
        {tab === 'notes' && <NotesTab />}
        
      </div>
    </div>
  );
}
