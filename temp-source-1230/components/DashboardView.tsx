
import React, { useMemo } from 'react';
import { User, Task, Announcement, Report, TaskStatus, Role, DepartmentDef } from '../types';
import { DailyRoutineWidget } from './DailyRoutineWidget';
import { AttendanceWidget } from './AttendanceWidget';
import { DailyTaskChecklist } from './DailyTaskChecklist';
import { Badge } from './Badge';

interface DashboardViewProps {
    currentUser: User;
    tasks: Task[];
    announcements: Announcement[];
    reports: Report[];
    departments: DepartmentDef[];
    onChangePage: (page: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
    currentUser, tasks, announcements, reports, departments, onChangePage 
}) => {

    const isBoss = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;

    // --- Statistics ---
    // 進行中的任務：我接取的或指派給我的，狀態為 IN_PROGRESS
    const myActiveTasks = Array.isArray(tasks) ? tasks.filter(t => 
        (t.acceptedByUserId === currentUser.id || t.assignedToUserId === currentUser.id) && 
        t.status === TaskStatus.IN_PROGRESS
    ) : [];
    // 待接收的任務：指派給我但尚未接取的任務
    const myPendingTasks = Array.isArray(tasks) ? tasks.filter(t => 
        t.assignedToUserId === currentUser.id && 
        t.status === TaskStatus.ASSIGNED
    ) : [];
    // 我創建的任務
    const myCreatedTasks = Array.isArray(tasks) ? tasks.filter(t => 
        t.createdBy === currentUser.id && 
        !t.isArchived &&
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.CANCELLED
    ) : [];
    const unreadAnnouncements = Array.isArray(announcements) ? announcements.filter(a => !a.readBy.includes(currentUser.id)) : [];
    
    // Financial Quick Stats (Derived from Reports)
    const latestReport = reports.length > 0 ? reports[0] : null;

    // --- Activity Feed Logic ---
    const activityFeed = useMemo(() => {
        const events: { id: string, type: 'TASK' | 'REPORT' | 'ANNOUNCEMENT', title: string, time: string, meta?: string }[] = [];
        
        // Add recent tasks (created in last 7 days)
        if (Array.isArray(tasks)) {
            tasks.slice(0, 10).forEach(t => {
            events.push({ 
                id: t.id, 
                type: 'TASK', 
                title: `新任務：${t.title}`, 
                time: t.createdAt,
                meta: t.status 
            });
        });
        }

        // Add recent reports (只顯示有備註的報表，避免太多空白項目)
        if (Array.isArray(reports)) {
            reports
                .filter(r => r.content?.notes && r.content.notes.trim())
                .slice(0, 3)
                .forEach(r => {
                    const notePreview = r.content.notes.substring(0, 30).trim();
                    events.push({ 
                        id: r.id, 
                        type: 'REPORT', 
                        title: `提交報表：${notePreview}${r.content.notes.length > 30 ? '...' : ''}`, 
                        time: r.createdAt 
                    });
                });
        }

        // Add announcements
        if (Array.isArray(announcements)) {
            announcements.slice(0, 5).forEach(a => {
                events.push({
                    id: a.id,
                    type: 'ANNOUNCEMENT',
                    title: `發布公告：${a.title}`,
                    time: a.createdAt
                });
            });
        }

        return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
    }, [tasks, reports, announcements]);

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes} 分鐘前`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} 小時前`;
        return `${Math.floor(hours / 24)} 天前`;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-20 animate-fade-in px-1 md:px-0">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <span>👋</span> 早安，{currentUser.name}
                    </h1>
                    <p className="text-slate-500 font-bold mt-2">
                        今天是 {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                    </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                     <div className="bg-white px-3 md:px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-center flex-shrink-0 min-w-[80px]">
                         <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">待辦任務</div>
                         <div className="text-lg md:text-xl font-black text-slate-800">{myActiveTasks.length + myPendingTasks.length + myCreatedTasks.filter(t => !myActiveTasks.find(a => a.id === t.id) && !myPendingTasks.find(p => p.id === t.id)).length}</div>
                     </div>
                     <div className="bg-white px-3 md:px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-center flex-shrink-0 min-w-[80px]">
                         <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">未讀公告</div>
                         <div className={`text-lg md:text-xl font-black ${unreadAnnouncements.length > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                             {unreadAnnouncements.length}
                         </div>
                     </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                
                {/* Left Column: Routine & Tasks (2/3 width) */}
                <div className="lg:col-span-2 space-y-4 md:space-y-8">
                    
                    {/* 1. Daily Task Checklist */}
                    <DailyTaskChecklist currentUser={currentUser} departments={departments} />

                    {/* 2. Daily SOP Widget */}
                    <DailyRoutineWidget currentUser={currentUser} />

                    {/* 2. My Tasks Overview */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <span>🚀</span> 我的任務概況
                            </h3>
                            <button onClick={() => onChangePage('tasks')} className="text-xs text-blue-600 font-bold hover:underline">
                                查看全部 &rarr;
                            </button>
                        </div>
                        <div className="p-5">
                            {myActiveTasks.length === 0 && myPendingTasks.length === 0 && myCreatedTasks.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    目前沒有進行中的任務，去任務大廳看看吧！
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {myPendingTasks.map(t => (
                                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-amber-50/50 hover:bg-amber-50 transition cursor-pointer" onClick={() => onChangePage('tasks')}>
                                            <Badge type="urgency" value={t.urgency} />
                                            <div className="flex-1 font-bold text-slate-700 truncate">{t.title}</div>
                                            <span className="text-xs font-bold text-amber-600 px-2 py-1 bg-amber-100 rounded">待接收</span>
                                        </div>
                                    ))}
                                    {myActiveTasks.map(t => (
                                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-blue-100 bg-blue-50/30 hover:bg-blue-50 transition cursor-pointer" onClick={() => onChangePage('tasks')}>
                                            <Badge type="urgency" value={t.urgency} />
                                            <div className="flex-1 font-bold text-slate-700 truncate">{t.title}</div>
                                            <div className="w-20">
                                                <div className="flex justify-between text-[10px] text-blue-600 font-bold mb-1">
                                                    <span>進度</span>
                                                    <span>{t.progress}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${t.progress}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {myCreatedTasks.filter(t => !myActiveTasks.find(a => a.id === t.id) && !myPendingTasks.find(p => p.id === t.id)).map(t => (
                                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-purple-50/30 hover:bg-purple-50 transition cursor-pointer" onClick={() => onChangePage('tasks')}>
                                            <Badge type="urgency" value={t.urgency} />
                                            <div className="flex-1 font-bold text-slate-700 truncate">{t.title}</div>
                                            <span className="text-xs font-bold text-purple-600 px-2 py-1 bg-purple-100 rounded">我創建</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Attendance & Alerts & Activity (1/3 width) */}
                <div className="space-y-4 md:space-y-8">
                    
                    {/* 0. Attendance Clock */}
                    <AttendanceWidget currentUser={currentUser} />

                    {/* 1. Announcements */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <span>📢</span> 最新公告
                            </h3>
                            {unreadAnnouncements.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadAnnouncements.length} 未讀</span>}
                        </div>
                        <div className="divide-y divide-slate-100">
                            {announcements.slice(0, 3).map(ann => {
                                const isUnread = !ann.readBy.includes(currentUser.id);
                                return (
                                    <div key={ann.id} className={`p-4 hover:bg-slate-50 transition cursor-pointer ${isUnread ? 'bg-red-50/30' : ''}`} onClick={() => onChangePage('bulletin')}>
                                        <div className="flex justify-between items-start mb-1">
                                            {ann.priority === 'IMPORTANT' && <span className="text-[10px] text-red-500 border border-red-200 px-1 rounded mr-2 mt-0.5 font-bold">重要</span>}
                                            <h4 className={`text-sm font-bold flex-1 ${isUnread ? 'text-slate-900' : 'text-slate-500'}`}>{ann.title}</h4>
                                            {isUnread && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5"></span>}
                                        </div>
                                        <div className="text-xs text-slate-400 truncate">{ann.content}</div>
                                    </div>
                                );
                            })}
                             {announcements.length === 0 && <div className="p-4 text-center text-slate-400 text-xs">無公告</div>}
                        </div>
                    </div>

                    {/* 2. Company Pulse / Activity Feed (New) */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <span>⚡</span> 最新動態 (Live)
                            </h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {activityFeed.map(item => (
                                <div key={item.id} className="flex gap-3 text-sm">
                                    <div className="flex-shrink-0 mt-1">
                                        {item.type === 'TASK' && <span className="text-blue-500">📋</span>}
                                        {item.type === 'REPORT' && <span className="text-emerald-500">📝</span>}
                                        {item.type === 'ANNOUNCEMENT' && <span className="text-orange-500">📢</span>}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-slate-700 font-bold truncate">{item.title}</p>
                                        <p className="text-xs text-slate-400">{formatTimeAgo(item.time)}</p>
                                    </div>
                                </div>
                            ))}
                            {activityFeed.length === 0 && <div className="text-center text-slate-400 text-xs py-2">無近期動態</div>}
                        </div>
                    </div>

                    {/* 3. Financial Summary (Boss View - moved down) */}
                    {isBoss && latestReport && (
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
                            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                                <span>📊</span> 昨日營運速報
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-slate-300 text-sm">淨入盈虧</span>
                                    <span className={`text-2xl font-black font-mono ${latestReport.content.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {latestReport.content.netIncome >= 0 ? '+' : ''}{latestReport.content.netIncome.toLocaleString()}
                                    </span>
                                </div>
                                <div className="w-full h-px bg-white/10"></div>
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div>
                                        <div className="text-xl font-bold">{latestReport.content.registrations}</div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase">註冊人數</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold">{latestReport.content.firstDeposits}</div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase">首充人數</div>
                                    </div>
                                </div>
                                <button onClick={() => onChangePage('reports')} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition mt-2">
                                    查看完整報表
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
