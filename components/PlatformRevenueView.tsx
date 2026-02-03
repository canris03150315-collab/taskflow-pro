import React, { useState } from 'react';
import { User, DepartmentDef } from '../types';
import { RevenueUploadTab } from './RevenueUploadTab';
import { RevenueStatsTab } from './RevenueStatsTab';
import { RevenueDateStatsTab } from './RevenueDateStatsTab';
import { RevenueHistoryTab } from './RevenueHistoryTab';
import RevenueMonthlyView from './RevenueMonthlyView';

interface PlatformRevenueViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
}

export const PlatformRevenueView: React.FC<PlatformRevenueViewProps> = ({
  currentUser,
  users,
  departments
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'monthly' | 'platform_stats' | 'date_stats' | 'history'>('monthly');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveSubTab('upload')}
          className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${
            activeSubTab === 'upload'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📤 上傳報表
        </button>
        <button
          onClick={() => setActiveSubTab('monthly')}
          className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${
            activeSubTab === 'monthly'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📅 月度視圖
        </button>
        <button
          onClick={() => setActiveSubTab('platform_stats')}
          className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${
            activeSubTab === 'platform_stats'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📊 平台統計
        </button>
        <button
          onClick={() => setActiveSubTab('date_stats')}
          className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${
            activeSubTab === 'date_stats'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📅 日期統計
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${
            activeSubTab === 'history'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📜 修改記錄
        </button>
      </div>

      {activeSubTab === 'upload' && (
        <RevenueUploadTab currentUser={currentUser} />
      )}
      {activeSubTab === 'monthly' && (
        <RevenueMonthlyView currentUser={currentUser} />
      )}
      {activeSubTab === 'platform_stats' && (
        <RevenueStatsTab currentUser={currentUser} users={users} departments={departments} />
      )}
      {activeSubTab === 'date_stats' && (
        <RevenueDateStatsTab currentUser={currentUser} />
      )}
      {activeSubTab === 'history' && (
        <RevenueHistoryTab currentUser={currentUser} users={users} />
      )}
    </div>
  );
};
