import React, { useState, useMemo } from 'react';
import { User, ChatChannel } from '../types';

interface FloatingChatListProps {
  currentUser: User;
  users: User[];
  channels: ChatChannel[];
  onSelectChat: (userId: string, userName: string) => void;
  onClose: () => void;
}

export const FloatingChatList: React.FC<FloatingChatListProps> = ({
  currentUser,
  users,
  channels,
  onSelectChat,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'contacts'>('recent');

  // 獲取部門名稱的輔助函數
  const getDepartmentName = (deptId: string) => {
    const deptMap: Record<string, string> = {
      'Management': '營運管理部',
      'Engineering': '技術工程部',
      'Marketing': '市場行銷部',
      'HR': '人力資源部',
      'UNASSIGNED': '待分配 / 新人'
    };
    return deptMap[deptId] || deptId;
  };

  // 獲取最近聊天列表
  const recentChats = useMemo(() => {
    return channels
      .filter(ch => ch.type === 'DIRECT' && ch.participants.includes(currentUser.id))
      .map(ch => {
        const otherUserId = ch.participants.find(id => id !== currentUser.id);
        const otherUser = users.find(u => u.id === otherUserId);
        return {
          channel: ch,
          user: otherUser,
          unreadCount: ch.unreadCount || 0
        };
      })
      .filter(item => item.user)
      .sort((a, b) => {
        if (!a.channel.lastMessage || !b.channel.lastMessage) return 0;
        return new Date(b.channel.lastMessage.timestamp).getTime() - 
               new Date(a.channel.lastMessage.timestamp).getTime();
      });
  }, [channels, users, currentUser]);

  // 獲取所有聯絡人（排除自己）
  const allContacts = useMemo(() => {
    return users
      .filter(u => u.id !== currentUser.id)
      .filter(u => 
        searchQuery === '' || 
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, currentUser, searchQuery]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes < 1 ? '剛剛' : `${minutes}分鐘前`;
    } else if (hours < 24) {
      return `${hours}小時前`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}天前`;
    }
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      ></div>

      {/* 聊天列表彈窗 */}
      <div className="fixed bottom-24 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up">
        {/* 標題列 */}
        <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg">企業通訊</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 搜尋框 */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋聯絡人..."
              className="w-full px-4 py-2 pl-10 bg-white/20 backdrop-blur-sm text-white placeholder-white/70 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <svg 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* 標籤切換 */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 px-4 py-3 font-bold text-sm transition ${
              activeTab === 'recent'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            最近聊天 ({recentChats.length})
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 px-4 py-3 font-bold text-sm transition ${
              activeTab === 'contacts'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            所有聯絡人 ({allContacts.length})
          </button>
        </div>

        {/* 聊天列表 */}
        <div className="max-h-96 overflow-y-auto">
          {activeTab === 'recent' && (
            <>
              {recentChats.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <svg className="w-16 h-16 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm font-medium">尚無聊天記錄</p>
                  <p className="text-xs mt-1">點擊「所有聯絡人」開始聊天</p>
                </div>
              ) : (
                recentChats.map(({ user, channel, unreadCount }) => user && (
                  <button
                    key={channel.id}
                    onClick={() => {
                      onSelectChat(user.id, user.name);
                      onClose();
                    }}
                    className="w-full p-4 hover:bg-blue-50 transition text-left border-b border-slate-100 group"
                  >
                    <div className="flex items-start gap-3">
                      {/* 頭像 */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                          {user.name.charAt(0)}
                        </div>
                        {unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </div>
                        )}
                      </div>

                      {/* 訊息內容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold text-slate-800 truncate">{user.name}</p>
                          {channel.lastMessage && (
                            <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                              {formatTime(channel.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>
                        {channel.lastMessage && (
                          <p className={`text-sm truncate ${unreadCount > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                            {channel.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </>
          )}

          {activeTab === 'contacts' && (
            <>
              {allContacts.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-sm">找不到符合的聯絡人</p>
                </div>
              ) : (
                allContacts.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      onSelectChat(user.id, user.name);
                      onClose();
                    }}
                    className="w-full p-4 hover:bg-blue-50 transition text-left border-b border-slate-100 group"
                  >
                    <div className="flex items-center gap-3">
                      {/* 頭像 */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold">
                        {user.name.charAt(0)}
                      </div>

                      {/* 用戶資訊 */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500">{getDepartmentName(user.department)}</p>
                      </div>

                      {/* 聊天圖標 */}
                      <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </>
  );
};
