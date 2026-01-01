
import React, { useState, useEffect, useMemo } from 'react';
import { User, Task, Report, FinanceRecord, AttendanceRecord, PerformanceReview, DepartmentDef, Role } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

declare global {
  interface Window {
    XLSX: any;
  }
}

interface DepartmentDataViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
  tasks: Task[];
  reports: Report[];
  financeRecords: FinanceRecord[];
}

export const DepartmentDataView: React.FC<DepartmentDataViewProps> = ({
  currentUser,
  users,
  departments,
  tasks,
  reports,
  financeRecords,
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'REPORTS' | 'TASKS' | 'PERFORMANCE' | 'FINANCE'>('ATTENDANCE');
  const [filterDept, setFilterDept] = useState<string>(currentUser.department);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    // 考慮時區補償，確保獲取當地日期
    const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
    localDate.setDate(localDate.getDate() - 30);
    return localDate.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    // 考慮時區補償，確保獲取當地日期
    const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
    return localDate.toISOString().split('T')[0];
  });
  
  // Data State
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isBoss = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;

  // Initialize Data
  useEffect(() => {
    const fetchAsyncData = async () => {
        setIsLoading(true);
        try {
            const att = await api.attendance.getHistory();
            setAttendanceData(att);
            const reviews = await api.performance.getReviews(startDate.slice(0, 7)); // Initial load for current month
            setPerformanceData(reviews);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    fetchAsyncData();
  }, [startDate]); // Refetch if month changes for performance reviews (simplified logic)

  // --- Helpers ---
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;
  const getUserName = (id?: string) => users.find(u => u.id === id)?.name || 'Unknown';
  const getUserDept = (userId: string) => {
      const u = users.find(user => user.id === userId);
      return u ? u.department : '';
  };

  // --- Filter Logic ---
  const filteredUsers = useMemo(() => {
      if (filterDept === 'ALL') return users;
      return users.filter(u => u.department === filterDept);
  }, [users, filterDept]);

  const targetUserIds = filteredUsers.map(u => u.id);

  const filterByDate = (dateStr: string) => {
      if (!dateStr) return false;
      const d = dateStr.split('T')[0];
      return d >= startDate && d <= endDate;
  };

  // 1. Attendance Data
  const displayAttendance = attendanceData.filter(r => 
      targetUserIds.includes(r.userId) && filterByDate(r.date)
  ).sort((a,b) => b.date.localeCompare(a.date));

  // 2. Reports Data
  const displayReports = reports.filter(r => 
      targetUserIds.includes(r.userId) && filterByDate(r.createdAt)
  ).sort((a,b) => b.createdAt.localeCompare(a.createdAt));

  // 3. Tasks Data
  const displayTasks = tasks.filter(t => 
      (targetUserIds.includes(t.assignedToUserId || '') || targetUserIds.includes(t.acceptedByUserId || '')) 
      && filterByDate(t.createdAt.split('T')[0])
  ).sort((a,b) => b.createdAt.localeCompare(a.createdAt));

  // 4. Performance Data (Roughly filter by period matching start date month)
  const displayPerformance = performanceData.filter(r => 
      targetUserIds.includes(r.targetUserId)
  );

  // 5. Finance Data
  const displayFinance = financeRecords.filter(r => {
      // Dept Scope: match filtered dept
      if (r.scope === 'DEPARTMENT' && r.departmentId === filterDept) return filterByDate(r.date);
      // Personal Scope: match owner in filtered users
      if (r.scope === 'PERSONAL' && r.ownerId && targetUserIds.includes(r.ownerId)) return filterByDate(r.date);
      return false;
  }).sort((a,b) => b.date.localeCompare(a.date));


  // --- Export Function ---
  const handleExport = () => {
      if (!window.XLSX) {
          toast.warning('Excel 匯出模組尚未載入，請稍後再試');
          return;
      }

      let data: any[] = [];
      let filename = `export_${activeTab.toLowerCase()}_${startDate}_${endDate}.xlsx`;

      switch (activeTab) {
          case 'ATTENDANCE':
              data = displayAttendance.map(r => ({
                  日期: r.date,
                  姓名: getUserName(r.userId),
                  部門: getDeptName(getUserDept(r.userId)),
                  上班時間: new Date(r.clockIn).toLocaleTimeString(),
                  下班時間: r.clockOut ? new Date(r.clockOut).toLocaleTimeString() : '未簽退',
                  工時分鐘: r.durationMinutes || 0,
                  狀態: r.status
              }));
              break;
          case 'REPORTS':
              data = displayReports.map(r => ({
                  日期: r.createdAt,
                  姓名: getUserName(r.userId),
                  部門: getDeptName(getUserDept(r.userId)),
                  充值金額: r.content.depositAmount,
                  提現金額: r.content.withdrawalAmount,
                  淨入盈虧: r.content.netIncome,
                  LINE導入: r.content.lineLeads,
                  註冊人數: r.content.registrations,
                  首充人數: r.content.firstDeposits,
                  備註: r.content.notes
              }));
              break;
          case 'TASKS':
              data = displayTasks.map(t => ({
                  建立日期: t.createdAt.split('T')[0],
                  任務標題: t.title,
                  優先級: t.urgency,
                  狀態: t.status,
                  進度: `${t.progress}%`,
                  負責人: getUserName(t.assignedToUserId || t.acceptedByUserId),
                  建立者: getUserName(t.createdBy),
                  截止期限: t.deadline?.replace('T', ' ') || '無'
              }));
              break;
          case 'PERFORMANCE':
              data = displayPerformance.map(r => ({
                  考核月份: r.period,
                  姓名: getUserName(r.targetUserId),
                  部門: getDeptName(getUserDept(r.targetUserId)),
                  總分: r.totalScore,
                  評級: r.grade,
                  任務達成率: `${r.metrics.taskCompletionRate}%`,
                  SOP執行率: `${r.metrics.sopCompletionRate}%`,
                  出勤率: `${r.metrics.attendanceRate}%`,
                  主管評語: r.managerComment
              }));
              break;
          case 'FINANCE':
              data = displayFinance.map(r => ({
                  日期: r.date,
                  類別: r.category,
                  收支類型: r.type === 'INCOME' ? '收入/撥款' : '支出',
                  金額: r.amount,
                  說明: r.description,
                  歸屬: r.scope === 'DEPARTMENT' ? '部門公費' : `個人 (${getUserName(r.ownerId)})`,
                  經手人: getUserName(r.recordedBy),
                  狀態: r.status
              }));
              break;
      }

      if (data.length === 0) {
          toast.warning('目前沒有資料可匯出');
          return;
      }

      const ws = window.XLSX.utils.json_to_sheet(data);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Data");
      window.XLSX.writeFile(wb, filename);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-4">
            <div className="w-full md:w-auto">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span>📥</span> 部門數據中心
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">匯出部門各項營運數據與報表</p>
            </div>
            <button 
                onClick={handleExport}
                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-200 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                匯出 Excel 報表
            </button>
        </div>

        {/* Filters - Stack on mobile, Row on Desktop */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-slate-400 uppercase whitespace-nowrap">日期範圍</span>
                <div className="flex gap-2 w-full sm:w-auto">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none" />
                    <span className="text-slate-400 self-center">~</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none" />
                </div>
            </div>

            <div className="w-full h-px bg-slate-200 md:w-px md:h-6"></div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-slate-400 uppercase whitespace-nowrap">部門</span>
                {isBoss ? (
                    <select 
                        value={filterDept} 
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">🏢 全公司</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                ) : (
                    <div className="w-full sm:w-auto px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-500 cursor-not-allowed">
                        {getDeptName(currentUser.department)}
                    </div>
                )}
            </div>
        </div>

        {/* Tabs - Scrollable on mobile */}
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar pb-1">
            {[
                { id: 'ATTENDANCE', label: '出勤打卡', icon: '⏰' },
                { id: 'REPORTS', label: '工作報表', icon: '📝' },
                { id: 'TASKS', label: '任務概況', icon: '📋' },
                { id: 'FINANCE', label: '公費收支', icon: '💰' },
                { id: 'PERFORMANCE', label: '績效考核', icon: '🏆' },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-shrink-0 px-6 py-3 text-sm font-bold flex items-center gap-2 transition whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                    <span>{tab.icon}</span> {tab.label}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm min-h-[400px]">
            {isLoading && <div className="p-10 text-center text-slate-400">數據載入中...</div>}
            
            {!isLoading && (
                <>
                    {/* Desktop View: Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">
                                {activeTab === 'ATTENDANCE' && (
                                    <tr><th className="p-4">日期</th><th className="p-4">姓名</th><th className="p-4">部門</th><th className="p-4">上班</th><th className="p-4">下班</th><th className="p-4">工時</th><th className="p-4">狀態</th></tr>
                                )}
                                {activeTab === 'REPORTS' && (
                                    <tr><th className="p-4">日期</th><th className="p-4">姓名</th><th className="p-4 text-right">充值</th><th className="p-4 text-right">提現</th><th className="p-4 text-right">淨入</th><th className="p-4 text-right">註冊</th><th className="p-4">備註</th></tr>
                                )}
                                {activeTab === 'TASKS' && (
                                    <tr><th className="p-4">建立日期</th><th className="p-4">標題</th><th className="p-4">負責人</th><th className="p-4">優先級</th><th className="p-4">進度</th><th className="p-4">狀態</th></tr>
                                )}
                                {activeTab === 'FINANCE' && (
                                    <tr><th className="p-4">日期</th><th className="p-4">類別</th><th className="p-4">說明</th><th className="p-4">歸屬</th><th className="p-4 text-right">金額</th><th className="p-4">狀態</th></tr>
                                )}
                                {activeTab === 'PERFORMANCE' && (
                                    <tr><th className="p-4">月份</th><th className="p-4">姓名</th><th className="p-4">部門</th><th className="p-4">總分</th><th className="p-4">評級</th><th className="p-4">狀態</th></tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {activeTab === 'ATTENDANCE' && displayAttendance.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-500">{r.date}</td>
                                        <td className="p-4 font-bold text-slate-700">{getUserName(r.userId)}</td>
                                        <td className="p-4 text-xs text-slate-400">{getDeptName(getUserDept(r.userId))}</td>
                                        <td className="p-4 font-mono">{new Date(r.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                        <td className="p-4 font-mono">{r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}</td>
                                        <td className="p-4">{r.durationMinutes ? `${Math.floor(r.durationMinutes / 60)}h ${r.durationMinutes % 60}m` : '0h'}</td>
                                        <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs font-bold ${r.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{r.status}</span></td>
                                    </tr>
                                ))}
                                {activeTab === 'REPORTS' && displayReports.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-500">{r.createdAt}</td>
                                        <td className="p-4 font-bold text-slate-700">{getUserName(r.userId)}</td>
                                        <td className="p-4 text-right font-mono text-slate-600">{r.content.depositAmount.toLocaleString()}</td>
                                        <td className="p-4 text-right font-mono text-red-400">{r.content.withdrawalAmount.toLocaleString()}</td>
                                        <td className={`p-4 text-right font-mono font-bold ${r.content.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{r.content.netIncome.toLocaleString()}</td>
                                        <td className="p-4 text-right">{r.content.registrations}</td>
                                        <td className="p-4 text-xs text-slate-500 max-w-xs truncate">{r.content.notes}</td>
                                    </tr>
                                ))}
                                {activeTab === 'TASKS' && displayTasks.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-500">{t.createdAt.split('T')[0]}</td>
                                        <td className="p-4 font-bold text-slate-700">{t.title}</td>
                                        <td className="p-4 text-blue-600">{getUserName(t.assignedToUserId || t.acceptedByUserId)}</td>
                                        <td className="p-4 text-xs"><span className="border px-1 rounded">{t.urgency}</span></td>
                                        <td className="p-4 font-mono">{t.progress}%</td>
                                        <td className="p-4 text-xs font-bold text-slate-500">{t.status}</td>
                                    </tr>
                                ))}
                                {activeTab === 'FINANCE' && displayFinance.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-500">{r.date}</td>
                                        <td className="p-4"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{r.category}</span></td>
                                        <td className="p-4 font-medium text-slate-700">{r.description}</td>
                                        <td className="p-4 text-xs text-slate-400">{r.scope === 'DEPARTMENT' ? '部門公費' : getUserName(r.ownerId)}</td>
                                        <td className={`p-4 text-right font-mono font-bold ${r.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>{r.type === 'INCOME' ? '+' : '-'}{r.amount.toLocaleString()}</td>
                                        <td className="p-4 text-xs">{r.status === 'COMPLETED' ? '✅' : '⏳'}</td>
                                    </tr>
                                ))}
                                {activeTab === 'PERFORMANCE' && displayPerformance.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-500">{r.period}</td>
                                        <td className="p-4 font-bold text-slate-700">{getUserName(r.targetUserId)}</td>
                                        <td className="p-4 text-xs text-slate-400">{getDeptName(getUserDept(r.targetUserId))}</td>
                                        <td className="p-4 font-black text-slate-800">{r.totalScore}</td>
                                        <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">{r.grade}</span></td>
                                        <td className="p-4 text-xs">{r.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View: Card List (New Implementation) */}
                    <div className="md:hidden p-4 space-y-4">
                        {activeTab === 'ATTENDANCE' && displayAttendance.map(r => (
                            <div key={r.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-500 text-sm font-mono">{r.date}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${r.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{r.status}</span>
                                </div>
                                <div className="font-bold text-slate-800 text-lg mb-1">{getUserName(r.userId)}</div>
                                <div className="text-xs text-slate-400 mb-3">{getDeptName(getUserDept(r.userId))}</div>
                                <div className="grid grid-cols-2 gap-2 text-sm bg-white p-2 rounded border border-slate-100">
                                    <div><span className="text-slate-400 text-xs block">上班</span> {new Date(r.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                    <div><span className="text-slate-400 text-xs block">下班</span> {r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}</div>
                                </div>
                            </div>
                        ))}

                        {activeTab === 'REPORTS' && displayReports.map(r => (
                            <div key={r.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-500 text-sm font-mono">{r.createdAt}</span>
                                    <span className="font-bold text-slate-700">{getUserName(r.userId)}</span>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-slate-100 mb-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-slate-400">淨入盈虧</span>
                                        <span className={`font-mono font-bold text-lg ${r.content.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            ${r.content.netIncome.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>充 ${r.content.depositAmount.toLocaleString()}</span>
                                        <span>提 ${r.content.withdrawalAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 line-clamp-2">{r.content.notes}</div>
                            </div>
                        ))}

                        {activeTab === 'TASKS' && displayTasks.map(t => (
                            <div key={t.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-slate-800 flex-1 mr-2">{t.title}</div>
                                    <span className="text-xs font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-600">{t.status}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-slate-600 mb-2">
                                    <span>{getUserName(t.assignedToUserId || t.acceptedByUserId)}</span>
                                    <span className="font-mono text-xs text-slate-400">{t.createdAt.split('T')[0]}</span>
                                </div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full" style={{width: `${t.progress}%`}}></div>
                                </div>
                            </div>
                        ))}

                        {activeTab === 'FINANCE' && displayFinance.map(r => (
                            <div key={r.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-slate-500 text-sm font-mono">{r.date}</span>
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{r.category}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-medium text-slate-700 truncate mr-2">{r.description}</div>
                                    <div className={`font-mono font-bold text-lg ${r.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {r.type === 'INCOME' ? '+' : '-'}{r.amount.toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>{getUserName(r.recordedBy)}</span>
                                    <span>{r.status === 'COMPLETED' ? '✅ 已入帳' : '⏳ 待確認'}</span>
                                </div>
                            </div>
                        ))}

                        {activeTab === 'PERFORMANCE' && displayPerformance.map(r => (
                            <div key={r.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-slate-800">{getUserName(r.targetUserId)}</span>
                                    <span className="text-sm font-mono text-slate-500">{r.period}</span>
                                </div>
                                <div className="flex items-center gap-4 bg-white p-3 rounded border border-slate-100">
                                    <div className="flex flex-col items-center">
                                        <span className="text-2xl font-black text-blue-600">{r.grade}</span>
                                        <span className="text-[10px] text-slate-400">評級</span>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200"></div>
                                    <div className="flex-1 text-sm">
                                        <div className="flex justify-between mb-1">
                                            <span>總分</span>
                                            <span className="font-bold">{r.totalScore}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 truncate">{r.managerComment}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty States */}
                    {activeTab === 'ATTENDANCE' && displayAttendance.length === 0 && <div className="p-8 text-center text-slate-400">無出勤資料</div>}
                    {activeTab === 'REPORTS' && displayReports.length === 0 && <div className="p-8 text-center text-slate-400">無報表資料</div>}
                    {activeTab === 'TASKS' && displayTasks.length === 0 && <div className="p-8 text-center text-slate-400">無任務資料</div>}
                    {activeTab === 'FINANCE' && displayFinance.length === 0 && <div className="p-8 text-center text-slate-400">無財務資料</div>}
                    {activeTab === 'PERFORMANCE' && displayPerformance.length === 0 && <div className="p-8 text-center text-slate-400">無績效資料</div>}
                </>
            )}
        </div>
    </div>
  );
};
