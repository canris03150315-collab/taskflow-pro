
import React, { useState, useEffect, useMemo } from 'react';
import { Task, User, Role, TaskStatus, DepartmentDef } from '../types';

interface CalendarViewProps {
  tasks: Task[];
  users: User[];
  departments: DepartmentDef[];
  currentUser: User;
  onDateSelect: (date: string | null) => void;
  selectedDate: string | null;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  tasks, 
  users, 
  departments,
  currentUser, 
  onDateSelect,
  selectedDate 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // 篩選狀態
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterUser, setFilterUser] = useState<string>('ALL');

  // 初始化權限篩選 (當使用者切換時重置)
  useEffect(() => {
    if (currentUser.role === Role.BOSS) {
      setFilterDept('ALL');
      setFilterUser('ALL');
    } else if (currentUser.role === Role.SUPERVISOR) {
      setFilterDept(currentUser.department); // 主管鎖定在自己的部門
      setFilterUser('ALL');
    } else {
      setFilterDept(currentUser.department);
      setFilterUser(currentUser.id); // 員工鎖定自己
    }
  }, [currentUser]);

  // 部門名稱中文化映射
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  // --- 日曆邏輯 ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-indexed
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  // --- 任務篩選邏輯 (計算日曆上的紅點) ---
  const filteredTasks = tasks.filter(task => {
    // 1. 部門篩選
    if (filterDept !== 'ALL') {
      const targetIsDept = task.targetDepartment === filterDept;
      
      // 也要包含指派給「該部門員工」的任務
      const assignedUser = users.find(u => u.id === task.assignedToUserId || u.id === task.acceptedByUserId);
      const userInDept = assignedUser?.department === filterDept;
      
      // 如果任務既不是指派給該部門，執行者也不在該部門，則過濾掉
      if (!targetIsDept && !userInDept) return false;
    }

    // 2. 人員篩選
    if (filterUser !== 'ALL') {
      const isAssigned = task.assignedToUserId === filterUser;
      const isAccepted = task.acceptedByUserId === filterUser;
      if (!isAssigned && !isAccepted) return false;
    }

    return true;
  });

  // --- 按日期分組任務 (統計數量) ---
  // 定義統計結構
  interface DayStats {
    open: number;      // 未接取
    assigned: number;  // 未完成 (已指派但未開始)
    active: number;    // 進行中
    completed: number; // 已完成
  }

  const tasksByDate: Record<string, DayStats> = {};
  
  filteredTasks.forEach(task => {
    if (!task.deadline) return;
    // 修正：僅取 YYYY-MM-DD 部分，忽略時間
    const dateKey = task.deadline.split('T')[0]; 
    if (!tasksByDate[dateKey]) {
      tasksByDate[dateKey] = { open: 0, assigned: 0, active: 0, completed: 0 };
    }
    
    switch (task.status) {
      case TaskStatus.COMPLETED:
        tasksByDate[dateKey].completed++;
        break;
      case TaskStatus.IN_PROGRESS:
        tasksByDate[dateKey].active++;
        break;
      case TaskStatus.ASSIGNED:
        tasksByDate[dateKey].assigned++;
        break;
      case TaskStatus.OPEN:
        tasksByDate[dateKey].open++;
        break;
    }
  });

  // 輔助函式：取得格子的日期字串
  const getDateStr = (day: number) => {
    const d = new Date(year, month, day);
    // 處理時區偏移，確保轉換為 YYYY-MM-DD 時是當地時間
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  // 生成日曆網格
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...days];

  // 計算下拉選單可用的員工 (依據目前篩選的部門)
  const availableUsers = useMemo(() => {
    if (filterDept === 'ALL') return users;
    return users.filter(u => u.department === filterDept);
  }, [users, filterDept]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 select-none">
      
      {/* --- 控制列 --- */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        
        {/* 月份切換 */}
        <div className="flex items-center gap-2 md:gap-4 w-full justify-between xl:w-auto">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
             ◀
          </button>
          <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-wide flex items-center gap-2">
            📅 {year}年 {month + 1}月
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
             ▶
          </button>
        </div>

        {/* 篩選器區域 */}
        <div className="flex flex-col md:flex-row flex-wrap gap-3 w-full xl:w-auto">
          
          {/* 部門篩選 (僅總經理可見) */}
          {currentUser.role === Role.BOSS && (
             <select 
               value={filterDept}
               onChange={(e) => { setFilterDept(e.target.value); setFilterUser('ALL'); }}
               className="w-full md:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
             >
               <option value="ALL">🏢 所有部門</option>
               {departments.map(d => (
                 <option key={d.id} value={d.id}>{d.name}</option>
               ))}
             </select>
          )}

          {/* 主管的部門顯示 (唯讀) */}
          {currentUser.role === Role.SUPERVISOR && (
            <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-500 cursor-not-allowed flex items-center gap-2">
              <span>🛡️</span> {getDeptName(currentUser.department)}
            </div>
          )}

          {/* 人員篩選 (總經理與主管可見) */}
          {(currentUser.role === Role.BOSS || currentUser.role === Role.SUPERVISOR) && (
            <select 
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full md:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">👥 全體員工</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>
                   {u.name} {currentUser.role === Role.BOSS ? `(${getDeptName(u.department)})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* --- 日曆網格 --- */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d} className="text-center text-xs md:text-sm font-bold text-slate-400 uppercase py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {totalSlots.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} className="aspect-[3/4] md:aspect-square bg-slate-50/50 rounded-lg"></div>;

          const dateStr = getDateStr(day);
          const stats = tasksByDate[dateStr];
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          const hasTasks = stats && (stats.open + stats.assigned + stats.active + stats.completed) > 0;

          return (
            <div 
              key={dateStr}
              onClick={() => onDateSelect(isSelected ? null : dateStr)}
              className={`
                aspect-[3/4] md:aspect-square rounded-lg border p-1 md:p-1.5 cursor-pointer transition relative flex flex-col justify-between group overflow-hidden
                ${isSelected 
                  ? 'bg-blue-50 border-blue-400 ring-1 md:ring-2 ring-blue-200 shadow-md' 
                  : 'bg-white border-slate-100 hover:border-blue-300 hover:shadow-md'
                }
              `}
            >
              {/* 日期數字 */}
              <div className="flex justify-center md:justify-between items-start">
                 <span className={`
                  text-xs md:text-sm font-bold flex items-center justify-center w-5 h-5 md:w-7 md:h-7 rounded-full
                  ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700'}
                `}>
                  {day}
                </span>
              </div>
              
              {/* 任務狀態統計區塊 */}
              {hasTasks ? (
                <>
                  {/* --- Mobile View: 彩色圓點 --- */}
                  <div className="flex md:hidden flex-wrap gap-1 justify-center content-end pb-1 h-full">
                    {stats.open > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="待派"></div>}
                    {stats.assigned > 0 && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="未完"></div>}
                    {stats.active > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="進行"></div>}
                    {stats.completed > 0 && <div className="w-1.5 h-1.5 rounded-full bg-slate-400" title="完成"></div>}
                  </div>

                  {/* --- Desktop View: 詳細文字 --- */}
                  <div className="hidden md:flex flex-col gap-1 w-full mt-1">
                     {/* 未接取 (Open) - 綠色 */}
                     {stats.open > 0 && (
                       <div className="flex items-center justify-between px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-bold">
                         <span>待派</span>
                         <span>{stats.open}</span>
                       </div>
                     )}
                     
                     {/* 未完成 (Assigned) - 紫色 */}
                     {stats.assigned > 0 && (
                       <div className="flex items-center justify-between px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-bold">
                         <span>未完</span>
                         <span>{stats.assigned}</span>
                       </div>
                     )}

                     {/* 進行中 (Active) - 藍色 */}
                     {stats.active > 0 && (
                       <div className="flex items-center justify-between px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-bold">
                         <span>進行</span>
                         <span>{stats.active}</span>
                       </div>
                     )}

                     {/* 已完成 (Completed) - 灰色 */}
                     {stats.completed > 0 && (
                       <div className="flex items-center justify-between px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-xs font-bold opacity-80">
                         <span>完成</span>
                         <span>{stats.completed}</span>
                       </div>
                     )}
                  </div>
                </>
              ) : (
                <div className="hidden md:flex flex-1 items-center justify-center opacity-0 group-hover:opacity-20 transition">
                   <span className="text-xl">📅</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 篩選提示 */}
      {selectedDate && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex flex-col md:flex-row justify-between items-center text-sm text-blue-800 animate-fade-in gap-2">
           <span className="flex items-center gap-2">
             <span>🎯</span> 已鎖定顯示 <strong>{selectedDate}</strong> 的任務
           </span>
           <button onClick={() => onDateSelect(null)} className="text-blue-600 underline hover:text-blue-800 font-bold">
             顯示全部
           </button>
        </div>
      )}
    </div>
  );
};
