import React from 'react';
import { User, Announcement, DepartmentDef } from '../types';

interface ReadStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement;
  users: User[];
  departments: DepartmentDef[];
}

export const ReadStatusModal: React.FC<ReadStatusModalProps> = ({ isOpen, onClose, announcement, users, departments }) => {
  if (!isOpen) return null;

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  const readUsers = users.filter(u => (announcement.readBy || []).includes(u.id));
  const unreadUsers = users.filter(u => !(announcement.readBy || []).includes(u.id));

  // Sort by department
  unreadUsers.sort((a, b) => a.department.localeCompare(b.department));

  const readPercentage = Math.round((readUsers.length / users.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-wide">
              閱讀狀態統計
            </h2>
            <p className="text-xs text-slate-500 mt-1 truncate max-w-sm font-bold">
               {announcement.title}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-6 bg-white border-b border-slate-100">
           <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-500">已讀率</span>
              <span className="text-xl font-black text-blue-600">{readPercentage}%</span>
           </div>
           <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${readPercentage}%` }}></div>
           </div>
           <div className="flex gap-4 mt-2 text-xs font-bold">
              <span className="text-emerald-600">✔ 已讀：{readUsers.length} 人</span>
              <span className="text-red-500">✖ 未讀：{unreadUsers.length} 人</span>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* Unread List */}
           <div>
              <h3 className="text-sm font-bold text-red-500 mb-3 border-b border-red-100 pb-2 flex items-center gap-2">
                 <span>⚠️</span> 尚未閱讀 ({unreadUsers.length})
              </h3>
              <div className="space-y-2">
                 {unreadUsers.length === 0 && <p className="text-xs text-slate-400 italic">所有人都已閱讀！</p>}
                 {unreadUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-50 transition border border-transparent hover:border-red-100">
                       <img src={u.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(u.name || 'default')}`} className="w-8 h-8 rounded-full bg-slate-100" />
                       <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-700 truncate">{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{getDeptName(u.department)}</div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Read List */}
           <div>
              <h3 className="text-sm font-bold text-emerald-600 mb-3 border-b border-emerald-100 pb-2 flex items-center gap-2">
                 <span>✅</span> 已確認閱讀 ({readUsers.length})
              </h3>
              <div className="space-y-2">
                 {readUsers.length === 0 && <p className="text-xs text-slate-400 italic">尚無人閱讀</p>}
                 {readUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 transition border border-transparent hover:border-emerald-100 opacity-70 hover:opacity-100">
                       <img src={u.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(u.name || 'default')}`} className="w-8 h-8 rounded-full bg-slate-100" />
                       <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-700 truncate">{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{getDeptName(u.department)}</div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};