
import React, { useState } from 'react';
import { Task, User, Role, TaskStatus, Urgency, DepartmentDef } from '../types';
import { Badge } from './Badge';

interface TaskCardProps {
  task: Task;
  currentUser: User;
  users: User[]; // 用於查找姓名
  departments?: DepartmentDef[]; // 用於查找部門名稱
  onAccept: (taskId: string) => void;
  onUpdateProgress: (taskId: string, progress: number, note: string, isComplete: boolean) => void;
  onArchive?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onCancel?: (taskId: string) => void; // 撤銷任務
  onReopen?: (taskId: string) => void; // 重新開啟任務
  isHighlighted?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  currentUser, 
  users,
  departments,
  onAccept, 
  onUpdateProgress,
  onArchive,
  onEdit,
  onDelete,
  onCancel,
  onReopen,
  isHighlighted,
  isExpanded,
  onToggleExpand
}) => {
  const [showProgressPanel, setShowProgressPanel] = useState(false);
  const [progressInput, setProgressInput] = useState(task.progress || 0);
  const [noteInput, setNoteInput] = useState('');

  // 查找關聯使用者名稱
  const creatorName = users.find(u => u.id === task.createdBy)?.name;
  const assigneeName = users.find(u => u.id === (task.acceptedByUserId || task.assignedToUserId))?.name;
  
  // 判斷是否為「指派給我」的任務 (且尚未完成)
  const isAssignedToMe = task.assignedToUserId === currentUser.id && task.status === TaskStatus.ASSIGNED;

  // 判斷是否過期 (有截止日 && 時間已過 && 未完成)
  const isExpired = task.deadline 
    ? new Date(task.deadline) < new Date() && task.status !== TaskStatus.COMPLETED
    : false;

  // 格式化截止日期 (將 T 替換為空格，並保留時分)
  const formatDeadline = (deadline?: string) => {
    if (!deadline) return '無期限';
    return deadline.replace('T', ' ');
  };

  // 格式化創建時間
  const formatCreatedAt = (createdAt?: string) => {
    if (!createdAt) return '未知';
    return createdAt.replace('T', ' ').substring(0, 16); // 只顯示到分鐘
  };

  const getTimelineUserName = (userId: string) => users.find(u => u.id === userId)?.name || '未知';

  const handleSubmitProgress = (isComplete: boolean) => {
      // 移除強制備註檢查，允許空值
      onUpdateProgress(task.id, isComplete ? 100 : progressInput, noteInput, isComplete);
      setShowProgressPanel(false);
      setNoteInput('');
  };

  // 判斷是否有執行權限 (所有角色都可以執行任務)
  const canExecuteTask = true;

  // 判斷是否有封存權限 (任務已完成 且 (是建立者 或 是執行者 或 是主管/老闆))
  const canArchive = task.status === TaskStatus.COMPLETED && !task.isArchived && (
      task.createdBy === currentUser.id ||
      task.acceptedByUserId === currentUser.id ||
      currentUser.role === Role.BOSS ||
      currentUser.role === Role.MANAGER ||
      currentUser.role === Role.SUPERVISOR
  );

  // 判斷是否可以編輯任務 (建立者、BOSS 或 MANAGER)
  const canEdit = 
    task.createdBy === currentUser.id ||
    currentUser.role === Role.BOSS ||
    currentUser.role === Role.MANAGER;

  // 判斷是否可以刪除任務 (建立者、BOSS 或 MANAGER，且任務尚未開始)
  const canDelete = 
    (task.createdBy === currentUser.id || currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER) &&
    (task.status === TaskStatus.OPEN || task.status === TaskStatus.ASSIGNED);

  // 判斷是否可以撤銷任務 (建立者，且任務尚未完成或取消)
  const canCancel = 
    task.createdBy === currentUser.id &&
    task.status !== TaskStatus.COMPLETED &&
    task.status !== TaskStatus.CANCELLED;

  // 判斷是否可以重新開啟任務 (建立者，且任務已取消)
  const canReopen = 
    task.createdBy === currentUser.id &&
    task.status === TaskStatus.CANCELLED;

  return (
    <div className={`
      relative rounded-xl p-0.5 transition-all duration-500 group
      ${task.status === TaskStatus.CANCELLED ? 'opacity-50 grayscale' : task.isArchived ? 'opacity-60 grayscale' : (task.status === TaskStatus.COMPLETED ? 'opacity-90' : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200')}
      ${isHighlighted ? 'bg-yellow-400 scale-[1.02] shadow-[0_0_20px_rgba(250,204,21,0.6)] ring-4 ring-yellow-300 z-10' : task.status === TaskStatus.CANCELLED ? 'bg-gradient-to-br from-red-100 via-red-200 to-red-300' : 'bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300'}
    `}>
      {/* S級緊急任務光暈特效 */}
      {task.urgency === Urgency.CRITICAL && task.status !== TaskStatus.COMPLETED && (
        <div className="absolute inset-0 rounded-xl bg-red-400 blur-sm opacity-30 animate-pulse"></div>
      )}

      <div className="bg-white rounded-[10px] p-6 relative border border-white flex flex-col min-h-full">
        
        {/* 指派給您的特別標示 */}
        {isAssignedToMe && task.status === TaskStatus.ASSIGNED && (
           <div className="absolute -right-12 top-6 bg-red-500 text-white text-[10px] font-bold px-12 py-1 rotate-45 shadow-sm z-20">
             指派給您
           </div>
        )}
        {/* 公開任務標示 */}
        {task.status === TaskStatus.OPEN && (
           <div className="absolute -right-12 top-6 bg-emerald-500 text-white text-[10px] font-bold px-12 py-1 rotate-45 shadow-sm z-20">
             公開任務
           </div>
        )}
        {/* 已取消標示 */}
        {task.status === TaskStatus.CANCELLED && (
           <div className="absolute -right-12 top-6 bg-slate-500 text-white text-[10px] font-bold px-12 py-1 rotate-45 shadow-sm z-20">
             已取消
           </div>
        )}

        <div className="flex flex-col h-full relative z-10">
          {/* 卡片頭部 */}
          <div className="flex justify-between items-start mb-3 pr-8">
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge type="status" value={task.status} />
                <Badge type="urgency" value={task.urgency} />
                {task.targetDepartment && <Badge type="department" value={task.targetDepartment} departments={departments} />}
                {task.isArchived && <span className="bg-slate-200 text-slate-500 px-2 py-1 rounded text-xs font-bold border border-slate-300">🗄️ 已封存</span>}
              </div>
              <h4 className={`text-xl font-bold flex flex-wrap items-center gap-2 ${task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                {task.title}
                {isExpired && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600 border border-red-200 shadow-sm animate-pulse whitespace-nowrap no-underline">
                    ⚠️ 已過期
                  </span>
                )}
              </h4>
            </div>
            
            {/* 編輯和刪除按鈕 */}
            {!task.isArchived && (
              <div className="flex gap-1 ml-2">
                {canEdit && onEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                    className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded transition"
                    title="編輯任務"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                {canDelete && onDelete && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (confirm('確定要刪除此任務嗎？此操作無法復原。')) {
                        onDelete(task.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition"
                    title="刪除任務"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                {canCancel && onCancel && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onCancel(task.id);
                    }}
                    className="text-orange-500 hover:text-orange-700 p-1.5 hover:bg-orange-50 rounded transition"
                    title="撤銷任務"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </button>
                )}
                {canReopen && onReopen && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onReopen(task.id);
                    }}
                    className="text-emerald-500 hover:text-emerald-700 p-1.5 hover:bg-emerald-50 rounded transition"
                    title="重新開啟任務"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 關鍵資訊區塊 (Metadata) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
             <div className="flex items-center gap-2">
                 <span className="text-lg">🕐</span>
                 <span className="text-slate-500 font-bold text-xs uppercase">建立:</span>
                 <span className="font-mono text-slate-600 text-xs">
                   {formatCreatedAt(task.createdAt)}
                 </span>
             </div>

             <div className="flex items-center gap-2">
                 <span className="text-lg">📅</span>
                 <span className="text-slate-500 font-bold text-xs uppercase">截止:</span>
                 <span className={`font-mono font-bold ${isExpired ? 'text-red-600' : 'text-slate-700'}`}>
                   {formatDeadline(task.deadline)}
                 </span>
             </div>
             
             <div className="flex items-center gap-2">
                 <span className="text-lg">👤</span>
                 <span className="text-slate-500 font-bold text-xs uppercase">分派:</span>
                 <span className="text-slate-700 font-bold">{creatorName}</span>
             </div>

             {(task.assignedToUserId || task.acceptedByUserId) && (
               <div className="flex items-center gap-2">
                   <span className="text-lg">💼</span>
                   <span className="text-slate-500 font-bold text-xs uppercase">負責:</span>
                   <span className="text-blue-600 font-bold">
                     {assigneeName} {isAssignedToMe && '(您)'}
                   </span>
               </div>
             )}
          </div>

          {/* 進度條 (Progress Bar) */}
          <div className="mb-4">
             <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-1">
                <span>任務進度</span>
                <span>{task.progress}%</span>
             </div>
             <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${task.status === TaskStatus.COMPLETED ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                  style={{ width: `${task.progress}%` }}
                ></div>
             </div>
          </div>

          {/* 卡片內容 (可伸縮區域) */}
          <div className="mb-4 overflow-hidden relative">
            {isExpanded ? (
               <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                      <div className="text-slate-600 text-sm whitespace-pre-line leading-relaxed font-medium">
                        {task.description}
                      </div>
                  </div>

                  {/* Timeline (History) */}
                  {task.timeline && task.timeline.length > 0 && (
                      <div className="border-t border-slate-100 pt-4">
                          <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">進度歷程</h5>
                          <div className="space-y-3 pl-2 border-l-2 border-slate-100 ml-1">
                              {task.timeline.map((entry, idx) => (
                                  <div key={idx} className="relative pl-4">
                                      <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-300"></div>
                                      <div className="flex justify-between items-start text-xs mb-1">
                                          <span className="font-bold text-slate-700">{getTimelineUserName(entry.userId)}</span>
                                          <span className="text-slate-400">{new Date(entry.timestamp).toLocaleString()}</span>
                                      </div>
                                      <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{entry.content}</p>
                                      <div className="text-[10px] text-blue-500 font-bold mt-1">進度更新至: {entry.progress}%</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  <div className="flex justify-end">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                        className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 hover:bg-slate-100 px-2 py-1 rounded transition"
                    >
                        收合內容 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                    </button>
                  </div>
               </div>
            ) : (
               <button 
                  onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                  className="w-full px-4 py-2 flex items-center justify-between text-slate-500 border border-slate-200 rounded-lg hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all group"
               >
                  <span className="text-sm font-bold flex items-center gap-2">
                     📄 查看詳細任務內容 & 歷程
                  </span>
                  <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition">
                     展開 ▼
                  </span>
               </button>
            )}
          </div>
          
          {/* 完成回報顯示 (Legacy) */}
          {task.status === TaskStatus.COMPLETED && task.completionNotes && !isExpanded && (
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg mb-4">
              <p className="text-xs text-emerald-600 font-bold mb-1 uppercase">最新結案報告</p>
              <p className="text-sm text-emerald-800 line-clamp-2">
                  {task.completionNotes}
              </p>
            </div>
          )}

          {/* 內嵌式進度回報面板 */}
          {showProgressPanel && (
              <div className="mb-4 bg-slate-50 border border-blue-200 rounded-xl p-4 shadow-inner animate-fade-in">
                  <div className="flex justify-between items-center mb-3">
                      <h5 className="font-bold text-blue-700 text-sm">更新任務進度</h5>
                      <button onClick={() => setShowProgressPanel(false)} className="text-slate-400 hover:text-slate-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                  </div>
                  
                  <div className="mb-4">
                      <label className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>完成百分比</span>
                          <span className="text-blue-600">{progressInput}%</span>
                      </label>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        value={progressInput} 
                        onChange={(e) => setProgressInput(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                  </div>

                  <div className="mb-4">
                      <label className="block text-xs font-bold text-slate-500 mb-1">進度說明 / 備註</label>
                      <textarea 
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        rows={3}
                        placeholder="請說明目前的執行狀況..."
                      />
                  </div>

                  <div className="flex gap-2">
                      <button 
                        onClick={() => handleSubmitProgress(false)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold transition shadow-sm"
                      >
                        更新進度
                      </button>
                      <button 
                        onClick={() => handleSubmitProgress(true)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-bold transition shadow-sm flex items-center justify-center gap-1"
                      >
                        <span>✔</span> 任務結案
                      </button>
                  </div>
              </div>
          )}

          {/* 卡片底部操作區 */}
          {!showProgressPanel && (
            <div className="mt-auto pt-2 flex justify-end items-center w-full">
                
                {/* Archive Button */}
                {canArchive && onArchive && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onArchive(task.id); }}
                        className="mr-auto text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition"
                    >
                        <span>🗄️</span> 封存任務
                    </button>
                )}

                <div className="flex-shrink-0 ml-auto">
                {/* 可執行: 接取任務 (公開) */}
                {canExecuteTask && task.status === TaskStatus.OPEN && (
                    <button 
                    onClick={() => onAccept(task.id)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md shadow-indigo-100 transition-all"
                    >
                    領取任務
                    </button>
                )}
                
                {/* 可執行: 啟動被指派的任務 */}
                {task.status === TaskStatus.ASSIGNED && canExecuteTask && task.assignedToUserId === currentUser.id && (
                    <button 
                    onClick={() => onAccept(task.id)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md shadow-indigo-100 transition-all animate-pulse"
                    >
                    確認並執行
                    </button>
                )}
                
                {/* 可執行: 回報成果 (開啟面板) */}
                {canExecuteTask && task.status === TaskStatus.IN_PROGRESS && task.acceptedByUserId === currentUser.id && (
                    <button 
                    onClick={() => { setShowProgressPanel(true); setNoteInput(''); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md shadow-blue-100 transition-all flex items-center gap-2"
                    >
                    <span>回報進度</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                )}

                {/* 完成標記 */}
                {task.status === TaskStatus.COMPLETED && (
                    <span className="text-emerald-600 font-bold text-sm border border-emerald-200 px-3 py-1 rounded bg-emerald-50 select-none flex items-center gap-1">
                    <span>✔</span> {task.isArchived ? '已封存' : '已結案'}
                    </span>
                )}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
