
import React, { useMemo, useState } from 'react';
import { User, Task, Announcement, Report, TaskStatus, Role, DepartmentDef } from '../types';
import { DailyRoutineWidget } from './DailyRoutineWidget';
import { AttendanceWidget } from './AttendanceWidget';
import { DailyTaskChecklist } from './DailyTaskChecklist';
import { Badge } from './Badge';
import { api } from '../services/api';
import { useToast } from './Toast';

interface DashboardViewProps {
    currentUser: User;
    tasks: Task[];
    announcements: Announcement[];
    reports: Report[];
    departments: DepartmentDef[];
    onChangePage: (page: any) => void;
    onTaskUpdate?: () => void;
    onAnnouncementUpdate?: () => void;
    onOpenCreateTask?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
    currentUser, tasks, announcements, reports, departments, onChangePage,
    onTaskUpdate, onAnnouncementUpdate, onOpenCreateTask
}) => {
    const toast = useToast();
    const [isAccepting, setIsAccepting] = useState<string | null>(null);
    const [isMarkingRead, setIsMarkingRead] = useState<string | null>(null);

    const isBoss = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;

    // --- Statistics (優化：使用 useMemo 避免不必要的重複計算) ---
    // 進行中的任務：我接取的或指派給我的，狀態為 IN_PROGRESS
    const myActiveTasks = useMemo(() => 
        Array.isArray(tasks) ? tasks.filter(t => 
            (t.acceptedByUserId === currentUser.id || t.assignedToUserId === currentUser.id) && 
            t.status === TaskStatus.IN_PROGRESS
        ) : [],
        [tasks, currentUser.id]
    );
    
    // 待接收的任務：指派給我但尚未接取的任務
    const myPendingTasks = useMemo(() => 
        Array.isArray(tasks) ? tasks.filter(t => 
            t.assignedToUserId === currentUser.id && 
            t.status === TaskStatus.ASSIGNED
        ) : [],
        [tasks, currentUser.id]
    );
    
    // 我創建的任務
    const myCreatedTasks = useMemo(() => 
        Array.isArray(tasks) ? tasks.filter(t => 
            t.createdBy === currentUser.id && 
            !t.isArchived &&
            t.status !== TaskStatus.COMPLETED &&
            t.status !== TaskStatus.CANCELLED
        ) : [],
        [tasks, currentUser.id]
    );
    
    // 未讀公告
    const unreadAnnouncements = useMemo(() => 
        Array.isArray(announcements) ? announcements.filter(a => !a.readBy.includes(currentUser.id)) : [],
        [announcements, currentUser.id]
    );
    
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

    // 優化：使用 useCallback 避免函數重建
    const formatTimeAgo = React.useCallback((dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes} 分鐘前`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} 小時前`;
        return `${Math.floor(hours / 24)} 天前`;
    }, []);

    // 快速接取任務
    const handleQuickAccept = async (taskId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setIsAccepting(taskId);
        try {
            await api.tasks.accept(taskId);
            toast.success('任務已接取');
            onTaskUpdate?.();
        } catch (error) {
            console.error('接取任務失敗:', error);
            toast.error('接取任務失敗');
        } finally {
            setIsAccepting(null);
        }
    };

    // 快速標記公告已讀
    const handleQuickMarkRead = async (announcementId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMarkingRead(announcementId);
        try {
            await api.announcements.markRead(announcementId, currentUser.id);
            toast.success('已標記為已讀');
            onAnnouncementUpdate?.();
        } catch (error) {
            console.error('標記已讀失敗:', error);
            toast.error('標記已讀失敗');
        } finally {
            setIsMarkingRead(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-3 md:space-y-6 pb-20 animate-fade-in px-2 md:px-4 lg:px-0">
            {/* Welcome Section - 移動端優化 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 md:gap-4 border-b border-slate-200 pb-3 md:pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="text-2xl md:text-3xl">👋</span> 早安，{currentUser.name}
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 font-bold mt-1 md:mt-2">
                        今天是 {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                    </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                     <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm text-center flex-shrink-0 min-w-[90px] md:min-w-[100px]">
                         <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide">待辦任務</div>
                         <div className="text-xl md:text-2xl font-black text-slate-800 mt-1">{myActiveTasks.length + myPendingTasks.length + myCreatedTasks.filter(t => !myActiveTasks.find(a => a.id === t.id) && !myPendingTasks.find(p => p.id === t.id)).length}</div>
                     </div>
                     <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm text-center flex-shrink-0 min-w-[90px] md:min-w-[100px]">
                         <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide">未讀公告</div>
                         <div className={`text-xl md:text-2xl font-black mt-1 ${unreadAnnouncements.length > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                             {unreadAnnouncements.length}
                         </div>
                     </div>
                </div>
            </div>

            {/* Quick Actions Bar - 移動端優化：更大的觸控區域 */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">
                <button 
                    onClick={() => onOpenCreateTask?.()}
                    className="flex-shrink-0 px-4 py-2.5 md:py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 text-white rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg active:shadow transform hover:scale-105 active:scale-95 min-h-[44px] md:min-h-0"
                >
                    <span className="text-base md:text-sm">➕</span> <span className="whitespace-nowrap">新增任務</span>
                </button>
                <button 
                    onClick={() => onChangePage('tasks')}
                    className="flex-shrink-0 px-4 py-2.5 md:py-2 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md active:shadow transform hover:scale-105 active:scale-95 min-h-[44px] md:min-h-0"
                >
                    <span className="text-base md:text-sm">📋</span> <span className="whitespace-nowrap">任務列表</span>
                </button>
                <button 
                    onClick={() => onChangePage('sop')}
                    className="flex-shrink-0 px-4 py-2.5 md:py-2 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md active:shadow transform hover:scale-105 active:scale-95 min-h-[44px] md:min-h-0"
                >
                    <span className="text-base md:text-sm">📖</span> <span className="whitespace-nowrap">SOP 文檔</span>
                </button>
                <button 
                    onClick={() => onChangePage('data_center')}
                    className="flex-shrink-0 px-4 py-2.5 md:py-2 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md active:shadow transform hover:scale-105 active:scale-95 min-h-[44px] md:min-h-0"
                >
                    <span className="text-base md:text-sm">📊</span> <span className="whitespace-nowrap">部門資料</span>
                </button>
                <button 
                    onClick={() => onChangePage('chat')}
                    className="flex-shrink-0 px-4 py-2.5 md:py-2 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md active:shadow transform hover:scale-105 active:scale-95 min-h-[44px] md:min-h-0"
                >
                    <span className="text-base md:text-sm">💬</span> <span className="whitespace-nowrap">聊天室</span>
                </button>
            </div>

            {/* Main Content - 移動端優化間距 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-8">
                
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
                        <div className="p-4 md:p-5">
                            {myActiveTasks.length === 0 && myPendingTasks.length === 0 && myCreatedTasks.length === 0 ? (
                                <div className="text-center py-8 md:py-12 animate-fade-in">
                                    <div className="text-5xl md:text-6xl mb-3 md:mb-4 opacity-50">📋</div>
                                    <p className="text-sm md:text-base text-slate-400 font-bold mb-1 md:mb-2">目前沒有進行中的任務</p>
                                    <p className="text-xs text-slate-300 mb-3 md:mb-4">去任務大廳看看有沒有可以接取的任務吧！</p>
                                    <button 
                                        onClick={() => onChangePage('tasks')}
                                        className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-bold rounded-lg transition transform hover:scale-105 active:scale-95 min-h-[44px]"
                                    >
                                        前往任務大廳
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2.5 md:space-y-3">
                                    {myPendingTasks.slice(0, 5).map((t, index) => (
                                        <div 
                                            key={t.id} 
                                            className="flex items-center gap-2 md:gap-3 p-3 md:p-3.5 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/30 hover:from-amber-100 hover:to-amber-50 active:from-amber-100 active:to-amber-50 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-md animate-slide-in-right"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <Badge type="urgency" value={t.urgency} />
                                            <div className="flex-1 font-bold text-sm md:text-base text-slate-700 truncate cursor-pointer min-h-[44px] flex items-center" onClick={() => onChangePage('tasks')}>{t.title}</div>
                                            <button
                                                onClick={(e) => handleQuickAccept(t.id, e)}
                                                disabled={isAccepting === t.id}
                                                className="flex-shrink-0 px-3 md:px-4 py-2 md:py-1.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-blue-300 text-white text-xs md:text-xs font-bold rounded-lg transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-sm hover:shadow min-h-[44px] md:min-h-0 whitespace-nowrap"
                                            >
                                                {isAccepting === t.id ? '接取中...' : '立即接取'}
                                            </button>
                                        </div>
                                    ))}
                                    {myActiveTasks.slice(0, 5).map((t, index) => (
                                        <div 
                                            key={t.id} 
                                            className="flex items-center gap-2 md:gap-3 p-3 md:p-3.5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50/30 hover:from-blue-100 hover:to-blue-50 active:from-blue-100 active:to-blue-50 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-md cursor-pointer animate-slide-in-right min-h-[60px] md:min-h-0" 
                                            onClick={() => onChangePage('tasks')}
                                            style={{ animationDelay: `${(myPendingTasks.length + index) * 50}ms` }}
                                        >
                                            <Badge type="urgency" value={t.urgency} />
                                            <div className="flex-1 font-bold text-sm md:text-base text-slate-700 truncate">{t.title}</div>
                                            <div className="w-16 md:w-20 flex-shrink-0">
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
                                    {myCreatedTasks.filter(t => !myActiveTasks.find(a => a.id === t.id) && !myPendingTasks.find(p => p.id === t.id)).slice(0, 5).map(t => (
                                        <div key={t.id} className="flex items-center gap-2 md:gap-3 p-3 md:p-3.5 rounded-xl border border-slate-200 bg-purple-50/30 hover:bg-purple-50 active:bg-purple-50 transition cursor-pointer min-h-[60px] md:min-h-0" onClick={() => onChangePage('tasks')}>
                                            <Badge type="urgency" value={t.urgency} />
                                            <div className="flex-1 font-bold text-sm md:text-base text-slate-700 truncate">{t.title}</div>
                                            <span className="text-xs font-bold text-purple-600 px-2 py-1 bg-purple-100 rounded whitespace-nowrap">我創建</span>
                                        </div>
                                    ))}
                                    {(myPendingTasks.length > 5 || myActiveTasks.length > 5 || myCreatedTasks.length > 5) && (
                                        <div className="text-center pt-2">
                                            <button onClick={() => onChangePage('tasks')} className="text-xs text-slate-400 hover:text-blue-600 transition">
                                                顯示更多任務...
                                            </button>
                                        </div>
                                    )}
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
                            {announcements.length === 0 ? (
                                <div className="text-center py-12 animate-fade-in">
                                    <div className="text-5xl mb-3 opacity-50">📢</div>
                                    <p className="text-slate-400 text-sm font-bold">目前沒有公告</p>
                                    <p className="text-xs text-slate-300 mt-1">有新公告時會顯示在這裡</p>
                                </div>
                            ) : announcements.slice(0, 3).map((ann, index) => {
                                const isUnread = !ann.readBy.includes(currentUser.id);
                                return (
                                    <div 
                                        key={ann.id} 
                                        className={`p-4 hover:bg-slate-50 transition-all duration-200 animate-fade-in ${isUnread ? 'bg-red-50/30 border-l-4 border-red-400' : ''}`}
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-start gap-2 flex-1 cursor-pointer" onClick={() => onChangePage('bulletin')}>
                                                {ann.priority === 'IMPORTANT' && <span className="text-[10px] text-red-500 border border-red-200 px-1 rounded mt-0.5 font-bold">重要</span>}
                                                <h4 className={`text-sm font-bold flex-1 ${isUnread ? 'text-slate-900' : 'text-slate-500'}`}>{ann.title}</h4>
                                            </div>
                                            {isUnread ? (
                                                <button
                                                    onClick={(e) => handleQuickMarkRead(ann.id, e)}
                                                    disabled={isMarkingRead === ann.id}
                                                    className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-700 font-bold ml-2 disabled:text-blue-300 transition-all duration-200 transform hover:scale-110 active:scale-95"
                                                >
                                                    {isMarkingRead === ann.id ? '標記中...' : '標記已讀'}
                                                </button>
                                            ) : (
                                                <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0 mt-1.5 opacity-50"></span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400 truncate cursor-pointer" onClick={() => onChangePage('bulletin')}>{ann.content}</div>
                                    </div>
                                );
                            })}
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
