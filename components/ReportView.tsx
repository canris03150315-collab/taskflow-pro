// components/ReportView.tsx
import React, { useState } from 'react';
import { User, DepartmentDef } from '../types';
import WorkLogTab from './WorkLogTab';
import { MyFilesTab } from './files/MyFilesTab';
import { CompanyFilesTab } from './files/CompanyFilesTab';
import { OperationsLogTab } from './files/OperationsLogTab';
import { TrashView } from './files/TrashView';

interface ReportViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
}

type Tab = 'my-files' | 'company-files' | 'work-logs' | 'operations';

export const ReportView: React.FC<ReportViewProps> = ({ currentUser, users, departments }) => {
  const [activeTab, setActiveTab] = useState<Tab>('my-files');
  const [trashOpen, setTrashOpen] = useState(false);

  const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'my-files', label: '我的檔案', icon: '📁' },
    { id: 'company-files', label: '公司檔案', icon: '🌐' },
    { id: 'work-logs', label: '工作日誌', icon: '📝' },
    ...(isManager ? [{ id: 'operations' as Tab, label: '操作紀錄', icon: '🔍' }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">工作報表中心</h2>
          <p className="text-sm text-slate-500 mt-0.5">管理工作檔案 · 雲端版本管理</p>
        </div>
        <button
          className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200"
          onClick={() => setTrashOpen(true)}
        >
          🗑 垃圾桶
        </button>
      </div>

      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`px-4 py-3 text-sm font-bold flex items-center gap-2 ${
                activeTab === t.id
                  ? 'text-slate-900 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setActiveTab(t.id)}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'my-files' && <MyFilesTab currentUser={currentUser} />}
      {activeTab === 'company-files' && <CompanyFilesTab currentUser={currentUser} />}
      {activeTab === 'work-logs' && (
        <WorkLogTab currentUser={currentUser} users={users} departments={departments} />
      )}
      {activeTab === 'operations' && <OperationsLogTab currentUser={currentUser} />}

      {trashOpen && <TrashView currentUser={currentUser} onClose={() => setTrashOpen(false)} />}
    </div>
  );
};
