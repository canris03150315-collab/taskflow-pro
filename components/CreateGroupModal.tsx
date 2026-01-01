import React, { useState } from 'react';
import { User, DepartmentDef } from '../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, memberIds: string[]) => void;
  users: User[];
  currentUser: User;
  departments: DepartmentDef[];
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
  users,
  currentUser,
  departments
}) => {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  // 過濾掉當前用戶，並根據搜索詞過濾
  const availableUsers = users.filter(u => 
    u.id !== currentUser.id && 
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     getDeptName(u.department).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = () => {
    if (groupName.trim() && selectedMembers.length >= 1) {
      onCreateGroup(groupName.trim(), selectedMembers);
      setGroupName('');
      setSelectedMembers([]);
      setSearchTerm('');
      onClose();
    }
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedMembers([]);
    setSearchTerm('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">建立群組</h2>
              <p className="text-xs text-blue-100 mt-0.5">選擇成員開始群組聊天</p>
            </div>
            <button onClick={handleClose} className="text-white/80 hover:text-white transition p-1">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
               </svg>
            </button>
          </div>
        </div>

        {/* Group Name Input */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">群組名稱</label>
          <input 
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="輸入群組名稱..."
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 placeholder-slate-400 text-sm"
          />
        </div>

        {/* Selected Members Preview */}
        {selectedMembers.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-100 bg-blue-50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-blue-600">已選擇 {selectedMembers.length} 人：</span>
              {selectedMembers.map(id => {
                const user = users.find(u => u.id === id);
                return user ? (
                  <span 
                    key={id} 
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                  >
                    {user.name}
                    <button 
                      onClick={() => toggleMember(id)}
                      className="hover:text-blue-900"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋成員..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 placeholder-slate-400 text-sm"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-2">
          {departments.map(dept => {
            const deptUsers = availableUsers.filter(u => u.department === dept.id);
            if (deptUsers.length === 0) return null;
            
            return (
              <div key={dept.id} className="mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 px-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  {dept.name}
                </h4>
                <div className="space-y-1">
                  {deptUsers.map(user => {
                    const isSelected = selectedMembers.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleMember(user.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition
                          ${isSelected 
                            ? 'bg-blue-50 border-2 border-blue-500' 
                            : 'hover:bg-slate-50 border-2 border-transparent'}`}
                      >
                        <div className="relative">
                          <img src={user.avatar} className="w-10 h-10 rounded-full border border-slate-200" />
                          {isSelected && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-bold text-slate-700">{user.name}</div>
                          <div className="text-[11px] text-slate-400">{user.role}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button 
            onClick={handleClose}
            className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition"
          >
            取消
          </button>
          <button 
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedMembers.length < 1}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
          >
            建立群組 ({selectedMembers.length + 1}人)
          </button>
        </div>
      </div>
    </div>
  );
};
