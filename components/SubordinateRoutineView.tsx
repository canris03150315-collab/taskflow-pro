import React, { useState, useEffect, useMemo } from 'react';
import { User, Role, DepartmentDef } from '../types';
import { api } from '../services/api';

interface RoutineRecord {
  id: string;
  user_id: string;
  department_id: string;
  date: string;
  items: Array<{ task: string; isCompleted: boolean }>;
}

interface SubordinateRoutineViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
}

export const SubordinateRoutineView: React.FC<SubordinateRoutineViewProps> = ({ 
  currentUser, 
  users, 
  departments 
}) => {
  const [routineRecords, setRoutineRecords] = useState<RoutineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>(
    currentUser.role === Role.SUPERVISOR ? currentUser.department : 'ALL'
  );

  // 獲取下屬列表
  const subordinates = useMemo(() => {
    let targets: User[] = [];

    if (currentUser.role === Role.SUPERVISOR) {
      targets = users.filter(u => u.role === Role.EMPLOYEE && u.department === currentUser.department);
    } else if (currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER) {
      if (selectedDept !== 'ALL') {
        targets = users.filter(u => u.department === selectedDept && u.role !== Role.BOSS);
      } else {
        targets = users.filter(u => u.role !== Role.BOSS && u.id !== currentUser.id);
      }
    }
    return targets;
  }, [users, currentUser, selectedDept]);

  // 載入每日任務記錄
  useEffect(() => {
    const loadRoutineRecords = async () => {
      setLoading(true);
      try {
        const records = await api.routines.getHistory();
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = records.filter(r => r.date === today);
        setRoutineRecords(todayRecords);
      } catch (error) {
        console.error('載入每日任務記錄失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRoutineRecords();
  }, []);

  // 計算用戶的每日任務完成狀況
  const getUserRoutineStats = (userId: string) => {
    const userRecord = routineRecords.find(r => r.user_id === userId);
    if (!userRecord || !userRecord.items) {
      return { total: 0, completed: 0, percentage: 0, hasRecord: false };
    }

    const total = userRecord.items.length;
    const completed = userRecord.items.filter(item => item.isCompleted).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percentage, hasRecord: true };
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">載入中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>📋</span> 下屬每日任務執行狀況
          </h2>
          <p className="text-sm text-slate-500 font-bold mt-1">
            查看團隊成員今日的每日任務完成進度
          </p>
        </div>

        {/* Department Filter */}
        {currentUser.role === Role.BOSS && (
          <select 
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="ALL">所有部門</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subordinates.map(user => {
          const stats = getUserRoutineStats(user.id);
          const userRecord = routineRecords.find(r => r.user_id === user.id);
          
          return (
            <div 
              key={user.id} 
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition p-5"
            >
              {/* User Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full border-2 border-slate-200 overflow-hidden">
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800">{user.name}</h3>
                  <p className="text-xs text-slate-500">{getDeptName(user.department)}</p>
                </div>
              </div>

              {/* Progress */}
              {stats.hasRecord ? (
                <>
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-600">今日任務完成度</span>
                      <span className="text-2xl font-black text-blue-600">{stats.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          stats.percentage === 100 ? 'bg-emerald-500' : 
                          stats.percentage >= 50 ? 'bg-blue-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${stats.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-1 text-xs text-slate-500">
                      <span>已完成 {stats.completed} / {stats.total} 項</span>
                      {stats.percentage === 100 && (
                        <span className="text-emerald-600 font-bold">✓ 全部完成</span>
                      )}
                    </div>
                  </div>

                  {/* Task List */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {userRecord?.items.map((item, index) => (
                      <div 
                        key={index}
                        className={`flex items-start gap-2 p-2 rounded text-sm ${
                          item.isCompleted 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="flex-shrink-0 mt-0.5">
                          {item.isCompleted ? '✓' : '○'}
                        </span>
                        <span className={item.isCompleted ? 'line-through' : ''}>
                          {item.task}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm">今日尚未開始每日任務</p>
                </div>
              )}
            </div>
          );
        })}

        {subordinates.length === 0 && (
          <div className="col-span-full py-10 text-center text-slate-400">
            該部門目前沒有下屬資料
          </div>
        )}
      </div>
    </div>
  );
};
