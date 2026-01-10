import React, { useState } from 'react';
import { User, Role, DepartmentDef } from '../types';
import { DocumentLibraryView } from './DocumentLibraryView';
import { DailyTasksTab } from './DailyTasksTab';
import { SubordinateRoutineView } from './SubordinateRoutineView';

interface SOPViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
}

export const SOPView: React.FC<SOPViewProps> = ({ currentUser, users, departments }) => {
  const isSupervisor = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER || currentUser.role === Role.SUPERVISOR;
  
  const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'DAILY_TASKS' | 'STATISTICS'>('DOCUMENTS');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>📑</span> 部門文件與規範
          </h2>
          <p className="text-sm text-slate-500 font-bold mt-1">新人報到須知、工作手冊與標準作業程序</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg gap-1">
          <button 
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition ${
              activeTab === 'DOCUMENTS' 
                ? 'bg-white shadow-sm text-blue-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📄 文件
          </button>
          <button 
            onClick={() => setActiveTab('DAILY_TASKS')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition ${
              activeTab === 'DAILY_TASKS' 
                ? 'bg-white shadow-sm text-emerald-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ✅ 任務
          </button>
          {isSupervisor && (
            <button 
              onClick={() => setActiveTab('STATISTICS')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition ${
                activeTab === 'STATISTICS' 
                  ? 'bg-white shadow-sm text-indigo-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📊 統計
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'DOCUMENTS' && (
        <DocumentLibraryView 
          currentUser={currentUser}
          users={users}
          departments={departments}
        />
      )}

      {activeTab === 'DAILY_TASKS' && (
        <DailyTasksTab 
          templates={[]}
          departments={departments}
          currentUser={currentUser}
          onRefresh={() => {}}
        />
      )}

      {activeTab === 'STATISTICS' && isSupervisor && (
        <SubordinateRoutineView
          currentUser={currentUser}
          users={users}
          departments={departments}
        />
      )}
    </div>
  );
};
