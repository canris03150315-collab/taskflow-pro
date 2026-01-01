
import React, { useMemo } from 'react';
import { User, ChatMessage, ChatChannel, DepartmentDef } from '../types';

interface ChatMessageReadStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessage;
  channel: ChatChannel;
  users: User[];
  departments: DepartmentDef[];
}

export const ChatMessageReadStatusModal: React.FC<ChatMessageReadStatusModalProps> = ({
  isOpen,
  onClose,
  message,
  channel,
  users,
  departments
}) => {
  if (!isOpen) return null;

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  // 計算邏輯：誰應該在這個頻道裡？
  const allParticipants = useMemo(() => {
    if (channel.type === 'DIRECT') {
      return users.filter(u => channel.participants.includes(u.id));
    } else if (channel.id === 'general' || channel.id === 'GENERAL') {
      // 假設 General 是全員
      return users;
    } else if (channel.type === 'DEPARTMENT') {
      // 部門頻道 (channel.id 通常對應 department id)
      return users.filter(u => u.department === channel.id);
    }
    // Fallback: 如果有 participants 就用，沒有就假設是部門或全員
    if (channel.participants && channel.participants.length > 0) {
        return users.filter(u => channel.participants.includes(u.id));
    }
    return [];
  }, [channel, users]);

  // 過濾出已讀與未讀
  // 排除發送者自己 (雖然通常發送者在 readBy 裡，但已讀名單通常不顯示自己讀了自己)
  const readUsers = allParticipants.filter(u => message.readBy.includes(u.id) && u.id !== message.userId);
  
  // 未讀：應該在頻道裡，但 ID 不在 readBy 列表，且不是發送者
  const unreadUsers = allParticipants.filter(u => !message.readBy.includes(u.id) && u.id !== message.userId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">訊息已讀狀態</h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate">
              {message.content}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex bg-white border-b border-slate-100">
           <div className="flex-1 p-3 text-center border-r border-slate-100">
              <div className="text-xs font-bold text-slate-400 uppercase">已讀</div>
              <div className="text-xl font-black text-emerald-600">{readUsers.length}</div>
           </div>
           <div className="flex-1 p-3 text-center">
              <div className="text-xs font-bold text-slate-400 uppercase">未讀</div>
              <div className="text-xl font-black text-slate-400">{unreadUsers.length}</div>
           </div>
        </div>

        {/* Lists */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
           
           {/* Read Section */}
           <div>
              <h3 className="text-xs font-bold text-emerald-600 mb-2 flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 已讀成員
              </h3>
              <div className="space-y-2">
                 {readUsers.length === 0 && <p className="text-xs text-slate-300 italic pl-3">尚無人閱讀</p>}
                 {readUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                       <img src={u.avatar} className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200" />
                       <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-700 truncate">{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{getDeptName(u.department)}</div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Unread Section */}
           {unreadUsers.length > 0 && (
             <div>
                <h3 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> 未讀成員
                </h3>
                <div className="space-y-2 opacity-60">
                   {unreadUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                         <div className="relative">
                            <img src={u.avatar} className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 grayscale" />
                         </div>
                         <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-700 truncate">{u.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold">{getDeptName(u.department)}</div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           )}

        </div>
      </div>
    </div>
  );
};
