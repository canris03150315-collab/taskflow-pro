import React, { useState } from 'react';
import { User, ChatChannel, DepartmentDef } from '../types';

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: ChatChannel;
  users: User[];
  currentUser: User;
  departments: DepartmentDef[];
  onLeaveGroup: () => void;
  onEditGroup: (newName: string, newMembers: string[]) => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  onClose,
  channel,
  users,
  currentUser,
  departments,
  onLeaveGroup,
  onEditGroup
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(channel.name || '');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    channel.participants?.filter(id => id !== currentUser.id) || []
  );
  const [showAddMember, setShowAddMember] = useState(false);

  if (!isOpen) return null;

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  // 獲取頻道成員詳細資訊
  const members = (channel.participants || [])
    .map(id => users.find(u => u.id === id))
    .filter(Boolean) as User[];

  // 可添加的成員（不在群組中的用戶）
  const availableUsers = users.filter(u => 
    u.id !== currentUser.id && 
    !channel.participants?.includes(u.id)
  );

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = () => {
    onEditGroup(groupName, [currentUser.id, ...selectedMembers]);
    setIsEditing(false);
  };

  const handleLeave = () => {
    if (confirm('確定要離開此群組嗎？')) {
      onLeaveGroup();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                👥
              </div>
              <div>
                {isEditing ? (
                  <input 
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="bg-white/20 text-white placeholder-white/60 px-2 py-1 rounded-lg text-lg font-bold outline-none focus:bg-white/30"
                    placeholder="群組名稱"
                  />
                ) : (
                  <h2 className="text-lg font-bold text-white">{channel.name || '群組'}</h2>
                )}
                <p className="text-xs text-blue-100 mt-0.5">{members.length} 位成員</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition p-1">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
               </svg>
            </button>
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-600">群組成員</h3>
              {isEditing && (
                <button 
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="relative z-10 text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  添加成員
                </button>
              )}
            </div>

            {/* Add Member Section */}
            {isEditing && showAddMember && availableUsers.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600 font-medium mb-2">選擇要添加的成員：</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {availableUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => toggleMember(user.id)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg transition text-left
                        ${selectedMembers.includes(user.id) ? 'bg-blue-100' : 'hover:bg-blue-100/50'}`}
                    >
                      <img src={user.avatar} className="w-8 h-8 rounded-full" />
                      <span className="text-sm text-slate-700">{user.name}</span>
                      {selectedMembers.includes(user.id) && (
                        <svg className="w-4 h-4 text-blue-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Current Members */}
            <div className="space-y-2">
              {members.map(member => {
                const isMe = member.id === currentUser.id;
                const canRemove = isEditing && !isMe;
                
                return (
                  <div 
                    key={member.id} 
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition"
                  >
                    <div className="relative">
                      <img src={member.avatar} className="w-10 h-10 rounded-full border border-slate-200" />
                      {isMe && (
                        <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white text-[8px] px-1 rounded-full">
                          你
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-700">{member.name}</div>
                      <div className="text-[11px] text-slate-400">{getDeptName(member.department)}</div>
                    </div>
                    {canRemove && (
                      <button 
                        onClick={() => setSelectedMembers(prev => prev.filter(id => id !== member.id))}
                        className="text-red-400 hover:text-red-500 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
          {isEditing ? (
            <div className="flex gap-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition"
              >
                取消
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition"
              >
                儲存
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                編輯群組
              </button>
              <button 
                onClick={handleLeave}
                className="w-full py-2.5 px-4 border border-red-200 text-red-500 rounded-xl font-bold hover:bg-red-50 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                離開群組
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
