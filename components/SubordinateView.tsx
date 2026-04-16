import React, { useState, useMemo, useEffect } from 'react';
import { User, Task, Role, TaskStatus, DepartmentDef } from '../types';
import { Badge } from './Badge';
import { api } from '../services/api';

interface RoutineRecord {
  id: string;
  user_id: string;
  department_id: string;
  date: string;
  items: Array<{ task: string; isCompleted: boolean }>;
}

interface SubordinateViewProps {
  currentUser: User;
  users: User[];
  tasks: Task[];
  departments: DepartmentDef[];
}

export const SubordinateView: React.FC<SubordinateViewProps> = ({ currentUser, users, tasks, departments }) => {
  const [routineRecords, setRoutineRecords] = useState<Record<string, RoutineRecord>>({});
  const [showRoutines, setShowRoutines] = useState(false);

  // View Modes:
  // 'DASHBOARD': Overview of all departments (Boss only)
  // 'DEPT_LIST': Grid of employees in a specific department
  // 'USER_DETAIL': Detailed task list for a specific employee
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'DEPT_LIST' | 'USER_DETAIL'>(
    currentUser.role === Role.BOSS ? 'DASHBOARD' : 'DEPT_LIST'
  );
  
  // Selection State
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Init for supervisor
  if (currentUser.role === Role.SUPERVISOR && selectedDept === 'ALL') {
      setSelectedDept(currentUser.department);
  }

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Department Helpers
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;
  const getDeptDef = (id: string) => departments.find(d => d.id === id);

  const getDeptColorClass = (id: string) => {
    const theme = getDeptDef(id)?.theme || 'slate';
    const map: Record<string, string> = {
        slate: 'bg-slate-800 text-white',
        blue: 'bg-blue-600 text-white',
        purple: 'bg-purple-600 text-white',
        rose: 'bg-rose-500 text-white',
        emerald: 'bg-emerald-600 text-white',
        orange: 'bg-orange-600 text-white',
        cyan: 'bg-cyan-600 text-white'
    };
    return map[theme] || map['slate'];
  };

  const getDeptBgClass = (id: string) => {
    const theme = getDeptDef(id)?.theme || 'slate';
    // Using string interpolation safe for tailwind if configured, otherwise might need full mapping
    // But since we are restricted in file modification, we assume these classes exist in the project
    return `bg-${theme}-50 border-${theme}-200 hover:border-${theme}-400`;
  };

  // --- Helper Functions ---

  // 標準化狀態比對函數
  const normalizeStatus = (status: string): TaskStatus => {
    if (!status) return TaskStatus.OPEN;
    const s = status.toLowerCase().replace(/[_\s]/g, '');
    if (s === 'open') return TaskStatus.OPEN;
    if (s === 'assigned') return TaskStatus.ASSIGNED;
    if (s === 'inprogress') return TaskStatus.IN_PROGRESS;
    if (s === 'completed') return TaskStatus.COMPLETED;
    if (s === 'cancelled') return TaskStatus.CANCELLED;
    return status as TaskStatus;
  };

  const getDeptStats = (deptId: string) => {
    // 包含部門內所有成員（不只是 EMPLOYEE）
    const deptMembers = users.filter(u => u.department === deptId);
    const memberIds = deptMembers.map(u => u.id);
    
    // 任務來源：指派給部門成員、部門成員接取、或目標部門為此部門
    const deptTasks = tasks.filter(t => 
      (t.assignedToUserId && memberIds.includes(t.assignedToUserId)) || 
      (t.acceptedByUserId && memberIds.includes(t.acceptedByUserId)) ||
      (t.targetDepartment === deptId)
    );

    const activeCount = deptTasks.filter(t => normalizeStatus(t.status) === TaskStatus.IN_PROGRESS).length;
    const pendingCount = deptTasks.filter(t => {
      const normalized = normalizeStatus(t.status);
      return normalized === TaskStatus.ASSIGNED || normalized === TaskStatus.OPEN;
    }).length;
    const completedCount = deptTasks.filter(t => normalizeStatus(t.status) === TaskStatus.COMPLETED).length;

    return { 
        employeeCount: deptMembers.length, 
        activeCount,
        pendingCount,
        completedCount,
        totalTasks: deptTasks.length
    };
  };

  const getEmployeeStats = (userId: string) => {
    // 包含指派給用戶、用戶接取、或用戶創建的任務
    const userTasks = tasks.filter(t => 
      t.assignedToUserId === userId || 
      t.acceptedByUserId === userId ||
      t.createdBy === userId
    );

    const pending = userTasks.filter(t => {
      const normalized = normalizeStatus(t.status);
      return normalized === TaskStatus.ASSIGNED || normalized === TaskStatus.OPEN;
    }).length;
    const active = userTasks.filter(t => normalizeStatus(t.status) === TaskStatus.IN_PROGRESS).length;
    const completed = userTasks.filter(t => normalizeStatus(t.status) === TaskStatus.COMPLETED).length;
    
    const currentTask = userTasks.find(t => normalizeStatus(t.status) === TaskStatus.IN_PROGRESS);

    return { total: userTasks.length, pending, active, completed, currentTask, allTasks: userTasks };
  };

  // --- Filter Logic ---
  const subordinates = useMemo(() => {
    let targets: User[] = [];

    if (currentUser.role === Role.SUPERVISOR) {
      // 主管只能看自己部門的一般員工
      targets = users.filter(u => u.role === Role.EMPLOYEE && u.department === currentUser.department);
    } else if (currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER) {
      // BOSS/MANAGER 可以看到所有非 BOSS 的成員（包含 MANAGER、SUPERVISOR、EMPLOYEE）
      // 當查看特定部門時，顯示所有該部門成員（包含自己）
      if (selectedDept !== 'ALL') {
        targets = users.filter(u => u.department === selectedDept && u.role !== Role.BOSS);
      } else {
        targets = users.filter(u => u.role !== Role.BOSS && u.id !== currentUser.id);
      }
    } else {
      return [];
    }
    return targets;
  }, [users, currentUser, selectedDept]);

  // Pagination for Employee List
  const [visibleCount, setVisibleCount] = useState(20);

  // Reset pagination when dept changes
  useMemo(() => {
      setVisibleCount(20);
  }, [selectedDept, viewMode]);

  const visibleSubordinates = useMemo(() => {
      return subordinates.slice(0, visibleCount);
  }, [subordinates, visibleCount]);

  // --- Handlers ---
  const handleDeptClick = (deptId: string) => {
    setSelectedDept(deptId);
    setViewMode('DEPT_LIST');
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setViewMode('USER_DETAIL');
  };

  const handleBack = () => {
    if (viewMode === 'USER_DETAIL') {
      setViewMode('DEPT_LIST');
      setSelectedUser(null);
    } else if (viewMode === 'DEPT_LIST') {
      if (currentUser.role === Role.BOSS) {
        setViewMode('DASHBOARD');
        setSelectedDept('ALL');
      }
      // Supervisors stay in DEPT_LIST
    }
  };

  // --- RENDER: LEVEL 1 - DASHBOARD VIEW (Boss Only) ---
  if (viewMode === 'DASHBOARD' && currentUser.role === Role.BOSS) {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span>📊</span> 團隊工作總覽
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">
                    請選擇部門以查看詳細人員清單
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {departments.map(dept => {
                    const stats = getDeptStats(dept.id);
                    return (
                        <button 
                            key={dept.id} 
                            onClick={() => handleDeptClick(dept.id)}
                            className={`relative rounded-xl border p-6 text-left transition-all shadow-sm hover:shadow-lg group ${getDeptBgClass(dept.id)}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md ${getDeptColorClass(dept.id)}`}>
                                        <span className="text-lg font-bold">{dept.name[0]}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">{dept.name}</h3>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            {stats.employeeCount} 位成員
                                        </p>
                                    </div>
                                </div>
                                <div className="p-2 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white/60 rounded-lg p-2 text-center backdrop-blur-sm">
                                    <div className="text-2xl font-black text-slate-700">{stats.activeCount}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">進行中</div>
                                </div>
                                <div className="bg-white/60 rounded-lg p-2 text-center backdrop-blur-sm">
                                    <div className="text-2xl font-black text-slate-700">{stats.pendingCount}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">待處理</div>
                                </div>
                                <div className="bg-white/60 rounded-lg p-2 text-center backdrop-blur-sm">
                                    <div className="text-2xl font-black text-slate-700">{stats.completedCount}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">已完成</div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
  }

  // --- RENDER: LEVEL 3 - USER TASK DETAIL VIEW ---
  if (viewMode === 'USER_DETAIL' && selectedUser) {
    const stats = getEmployeeStats(selectedUser.id);
    const activeTasks = stats.allTasks.filter(t => normalizeStatus(t.status) === TaskStatus.IN_PROGRESS);
    const pendingTasks = stats.allTasks.filter(t => {
      const normalized = normalizeStatus(t.status);
      return normalized === TaskStatus.ASSIGNED || normalized === TaskStatus.OPEN;
    });
    const completedTasks = stats.allTasks.filter(t => normalizeStatus(t.status) === TaskStatus.COMPLETED);

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
           <button onClick={handleBack} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
           </button>
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-slate-200 overflow-hidden">
                <img src={selectedUser.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(selectedUser.name || 'default')}`} alt={selectedUser.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  {selectedUser.name} 的工作詳情
                </h2>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                   <span>{getDeptName(selectedUser.department)}</span>
                   <span className="text-slate-300">|</span>
                   <span>{selectedUser.username}</span>
                </div>
              </div>
           </div>
        </div>

        {/* Task Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-250px)] overflow-hidden">
           
           {/* Column 1: Active */}
           <div className="flex flex-col bg-blue-50/50 rounded-xl border border-blue-100 overflow-hidden">
              <div className="p-4 bg-blue-100/50 border-b border-blue-200 flex justify-between items-center">
                 <h3 className="font-bold text-blue-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> 進行中
                 </h3>
                 <span className="bg-white text-blue-600 px-2 py-0.5 rounded text-xs font-bold">{activeTasks.length}</span>
              </div>
              <div className="p-3 overflow-y-auto space-y-3 flex-1">
                 {activeTasks.length === 0 && <div className="text-center py-10 text-slate-400 text-sm italic">無進行中任務</div>}
                 {activeTasks.map(task => (
                    <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-blue-200 border-l-4 border-l-blue-500">
                       <div className="flex justify-between items-start mb-2">
                          <Badge type="urgency" value={task.urgency} />
                          {task.deadline && <span className="text-xs font-bold text-red-500">{task.deadline.split('T')[0]}</span>}
                       </div>
                       <h4 className="font-bold text-slate-800 mb-2">{task.title}</h4>
                       <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
                    </div>
                 ))}
              </div>
           </div>

           {/* Column 2: Pending */}
           <div className="flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span> 待處理
                 </h3>
                 <span className="bg-white text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{pendingTasks.length}</span>
              </div>
              <div className="p-3 overflow-y-auto space-y-3 flex-1">
                 {pendingTasks.length === 0 && <div className="text-center py-10 text-slate-400 text-sm italic">無待處理任務</div>}
                 {pendingTasks.map(task => (
                    <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:border-slate-300 transition">
                       <div className="flex justify-between items-start mb-2">
                          <Badge type="urgency" value={task.urgency} />
                          {task.deadline && <span className="text-xs font-mono text-slate-400">{task.deadline.split('T')[0]}</span>}
                       </div>
                       <h4 className="font-bold text-slate-700 mb-1">{task.title}</h4>
                       <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                          <span>分派人:</span>
                          <span className="font-bold">{users.find(u => u.id === task.createdBy)?.name}</span>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Column 3: Completed */}
           <div className="flex flex-col bg-emerald-50/30 rounded-xl border border-emerald-100 overflow-hidden">
              <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
                 <h3 className="font-bold text-emerald-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 已完成
                 </h3>
                 <span className="bg-white text-emerald-600 px-2 py-0.5 rounded text-xs font-bold">{completedTasks.length}</span>
              </div>
              <div className="p-3 overflow-y-auto space-y-3 flex-1">
                 {completedTasks.length === 0 && <div className="text-center py-10 text-slate-400 text-sm italic">無已完成任務</div>}
                 {completedTasks.map(task => (
                    <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100 opacity-80 hover:opacity-100 transition">
                       <div className="flex items-center gap-2 mb-2">
                          <span className="text-emerald-500">✔</span>
                          <h4 className="font-bold text-slate-600 line-through decoration-slate-300">{task.title}</h4>
                       </div>
                       {task.completionNotes && (
                          <div className="text-xs bg-emerald-50 text-emerald-700 p-2 rounded mt-1 italic">
                             "{task.completionNotes}"
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           </div>

        </div>
      </div>
    );
  }

  // --- RENDER: LEVEL 2 - DEPT LIST VIEW ---
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
              {currentUser.role === Role.BOSS && (
                  <button onClick={handleBack} className="text-slate-400 hover:text-blue-600 transition p-1 -ml-1">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                  </button>
              )}
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <span>👥</span> {selectedDept === 'ALL' ? '所有人員' : getDeptName(selectedDept)}
              </h2>
          </div>
          <p className="text-sm text-slate-500 font-bold mt-1 pl-1">
            人員工作概況清單 <span className="text-blue-500">(點擊卡片查看詳情)</span>
          </p>
        </div>

        {/* Boss Dropdown */}
        {currentUser.role === Role.BOSS && (
          <select 
            value={selectedDept}
            onChange={(e) => handleDeptClick(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visibleSubordinates.map(user => {
          const stats = getEmployeeStats(user.id);
          const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
          
          return (
            <button 
              key={user.id} 
              onClick={() => handleUserClick(user)}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 transition p-5 flex flex-col relative overflow-hidden group text-left w-full"
            >
              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-4 -mt-4 transition group-hover:bg-blue-50"></div>

              {/* User Info */}
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-16 h-16 rounded-full p-1 bg-slate-100 border border-slate-200 group-hover:border-blue-300 transition">
                  <img src={user.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user.name || 'default')}`} alt={user.name} className="w-full h-full rounded-full bg-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition">{user.name}</h3>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{getDeptName(user.department)}</div>
                  <div className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded inline-block">
                    {user.username}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="text-center p-2 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition">
                   <div className="text-xs text-slate-400 font-bold mb-1">待處理</div>
                   <div className="text-xl font-black text-slate-700">{stats.pending}</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-100 group-hover:bg-blue-100 group-hover:border-blue-200 transition">
                   <div className="text-xs text-blue-400 font-bold mb-1">進行中</div>
                   <div className="text-xl font-black text-blue-600">{stats.active}</div>
                </div>
                <div className="text-center p-2 bg-emerald-50 rounded-lg border border-emerald-100 group-hover:bg-emerald-100 group-hover:border-emerald-200 transition">
                   <div className="text-xs text-emerald-500 font-bold mb-1">已完成</div>
                   <div className="text-xl font-black text-emerald-600">{stats.completed}</div>
                </div>
              </div>

              {/* Current Focus */}
              <div className="mb-6 flex-1 w-full">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">當前執行項目</p>
                {stats.currentTask ? (
                  <div className="flex items-start gap-2 text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 group-hover:border-blue-200 transition">
                    <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0 animate-pulse"></span>
                    <span className="line-clamp-2">{stats.currentTask.title}</span>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 italic py-2">目前沒有進行中的任務</div>
                )}
              </div>

              {/* Completion Progress */}
              <div className="mt-auto w-full">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-1">
                   <span>任務完成率</span>
                   <span>{completionRate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                   <div 
                     className={`h-full rounded-full transition-all duration-500 ${completionRate === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                     style={{ width: `${completionRate}%` }}
                   ></div>
                </div>
              </div>
              
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
              </div>

            </button>
          );
        })}

        {subordinates.length === 0 && (
           <div className="col-span-full py-10 text-center text-slate-400">
              該部門目前沒有一般員工資料
           </div>
        )}
      </div>

      {subordinates.length > visibleCount && (
          <div className="text-center py-4">
              <button 
                  onClick={() => setVisibleCount(prev => prev + 20)}
                  className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-full transition shadow-sm"
              >
                  Load More ({subordinates.length - visibleCount} remaining)...
              </button>
          </div>
      )}
    </div>
  );
};