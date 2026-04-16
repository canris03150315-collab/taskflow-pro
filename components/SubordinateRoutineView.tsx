import React, { useState, useEffect, useMemo } from 'react';
import { User, Role, DepartmentDef } from '../types';
import { api } from '../services/api';

interface RoutineRecord {
  id: string;
  user_id: string;
  department_id: string;
  date: string;
  items: Array<{ text: string; completed: boolean }>;
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
  
  // 日期篩選狀態 - 使用台灣時區 (UTC+8)
  const getTaiwanDate = () => {
    const now = new Date();
    const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return taiwanTime.toISOString().split('T')[0];
  };
  const today = getTaiwanDate();
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedDate, setSelectedDate] = useState<string>(today);

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
        console.log('[SubordinateRoutineView] Raw API response:', records);
        console.log('[SubordinateRoutineView] Selected date:', selectedDate);
        // 按選定日期過濾
        const filteredRecords = records.filter(r => r.date === selectedDate);
        console.log('[SubordinateRoutineView] Filtered records:', filteredRecords);
        if (filteredRecords.length > 0) {
          console.log('[SubordinateRoutineView] First record structure:', JSON.stringify(filteredRecords[0], null, 2));
        }
        setRoutineRecords(filteredRecords as any);
      } catch (error) {
        console.error('載入每日任務記錄失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRoutineRecords();
  }, [selectedDate]);

  // 計算用戶的每日任務完成狀況
  const getUserRoutineStats = (userId: string) => {
    const userRecord = routineRecords.find(r => r.user_id === userId);
    
    // DEBUG: 檢查 Se7en 的數據
    if (userId === 'user-1767451212149-7rxqt4f6d') {
      console.log('[DEBUG] Se7en record:', userRecord);
      console.log('[DEBUG] Se7en items:', userRecord?.items);
    }
    
    if (!userRecord || !userRecord.items) {
      return { total: 0, completed: 0, percentage: 0, hasRecord: false };
    }

    const total = userRecord.items.length;
    const completed = userRecord.items.filter(item => item.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percentage, hasRecord: true };
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  // 計算整體統計
  const overallStats = useMemo(() => {
    const subordinateIds = subordinates.map(u => u.id);
    const relevantRecords = routineRecords.filter(r => subordinateIds.includes(r.user_id));
    
    let totalTasks = 0;
    let completedTasks = 0;
    const incompleteUsers: { user: User; stats: any }[] = [];
    
    subordinates.forEach(user => {
      const stats = getUserRoutineStats(user.id);
      if (stats.hasRecord) {
        totalTasks += stats.total;
        completedTasks += stats.completed;
        if (stats.percentage < 100) {
          incompleteUsers.push({ user, stats });
        }
      }
    });
    
    const overallPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const usersWithRecords = subordinates.filter(u => getUserRoutineStats(u.id).hasRecord).length;
    const usersWithoutRecords = subordinates.length - usersWithRecords;
    
    return {
      totalTasks,
      completedTasks,
      overallPercentage,
      incompleteUsers,
      usersWithRecords,
      usersWithoutRecords
    };
  }, [subordinates, routineRecords]);

  // 快速日期選擇
  const setQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span>📋</span> 下屬每日任務執行狀況
            </h2>
            <p className="text-sm text-slate-500 font-bold mt-1">
              查看團隊成員的每日任務完成進度
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

        {/* Date Filter */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700">📅 查看日期：</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={today}
                className="px-3 py-2 bg-white border-2 border-blue-300 rounded-lg font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-bold">快速選擇：</span>
              <button
                onClick={() => setQuickDate(0)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  selectedDate === today
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-blue-100 border border-slate-300'
                }`}
              >
                今天
              </button>
              <button
                onClick={() => setQuickDate(-1)}
                className="px-3 py-1 bg-white text-slate-600 hover:bg-blue-100 border border-slate-300 rounded-lg text-xs font-bold transition"
              >
                昨天
              </button>
              <button
                onClick={() => setQuickDate(-7)}
                className="px-3 py-1 bg-white text-slate-600 hover:bg-blue-100 border border-slate-300 rounded-lg text-xs font-bold transition"
              >
                7天前
              </button>
              <button
                onClick={() => setQuickDate(-30)}
                className="px-3 py-1 bg-white text-slate-600 hover:bg-blue-100 border border-slate-300 rounded-lg text-xs font-bold transition"
              >
                30天前
              </button>
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
            <div className="text-sm font-bold opacity-90 mb-1">整體完成率</div>
            <div className="text-3xl font-black">{overallStats.overallPercentage}%</div>
            <div className="text-xs opacity-75 mt-1">
              {overallStats.completedTasks} / {overallStats.totalTasks} 項任務
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
            <div className="text-sm font-bold opacity-90 mb-1">已完成人數</div>
            <div className="text-3xl font-black">
              {subordinates.filter(u => getUserRoutineStats(u.id).percentage === 100).length}
            </div>
            <div className="text-xs opacity-75 mt-1">
              / {overallStats.usersWithRecords} 人有記錄
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
            <div className="text-sm font-bold opacity-90 mb-1">未完成人數</div>
            <div className="text-3xl font-black">{overallStats.incompleteUsers.length}</div>
            <div className="text-xs opacity-75 mt-1">需要關注</div>
          </div>

          <div className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl p-4 text-white shadow-lg">
            <div className="text-sm font-bold opacity-90 mb-1">未開始人數</div>
            <div className="text-3xl font-black">{overallStats.usersWithoutRecords}</div>
            <div className="text-xs opacity-75 mt-1">尚未開始任務</div>
          </div>
        </div>

        {/* Incomplete Users Alert */}
        {overallStats.incompleteUsers.length > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-bold text-orange-800 mb-2">未完成每日任務的員工</h3>
                <div className="flex flex-wrap gap-2">
                  {overallStats.incompleteUsers.map(({ user, stats }) => (
                    <div
                      key={user.id}
                      className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-orange-200"
                    >
                      <img src={user.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user.name || 'default')}`} alt={user.name} className="w-5 h-5 rounded-full" />
                      <span className="text-sm font-bold text-slate-700">{user.name}</span>
                      <span className="text-xs font-bold text-orange-600">
                        {stats.completed}/{stats.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
                  <img src={user.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user.name || 'default')}`} alt={user.name} className="w-full h-full object-cover" />
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
                          item.completed 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="flex-shrink-0 mt-0.5">
                          {item.completed ? '✓' : '○'}
                        </span>
                        <span className={item.completed ? 'line-through' : ''}>
                          {item.text}
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
