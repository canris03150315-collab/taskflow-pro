
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

const chatSystemContent = `
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, DepartmentDef, ChatChannel, ChatMessage, Role } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';
import { WebSocketClient, WebSocketMessage } from '../utils/websocketClient';
import { ChatMessageReadStatusModal } from './ChatMessageReadStatusModal';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupInfoModal } from './GroupInfoModal';

interface ChatSystemProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
}

export const ChatSystem: React.FC<ChatSystemProps> = ({ currentUser, users, departments }) => {
  const toast = useToast();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  
  // Modals
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [readStatusMsg, setReadStatusMsg] = useState<ChatMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Sound
  const notificationSound = useMemo(() => new Audio('/notification.mp3'), []);

  // Initialize WebSocket
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'ws://165.227.147.40:3001';
    
    wsClientRef.current = new WebSocketClient(wsUrl);
    
    const handleMessage = (event: WebSocketMessage) => {
      if (event.type === 'chat_message') {
        const newMsg = event.payload as ChatMessage;
        
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === newMsg.id)) return prev;
          
          // Only add if it belongs to current channel
          if (newMsg.channelId === activeChannelId) {
             return [...prev, newMsg];
          }
          return prev;
        });

        // Update channel preview and unread count
        setChannels(prev => prev.map(ch => {
            if (ch.id === newMsg.channelId) {
                const isCurrentChannel = newMsg.channelId === activeChannelId;
                return {
                    ...ch,
                    lastMessage: newMsg,
                    unreadCount: isCurrentChannel ? 0 : (ch.unreadCount || 0) + 1
                };
            }
            return ch;
        }).sort((a, b) => {
            // Sort by latest message
            const timeA = a.lastMessage?.timestamp || '';
            const timeB = b.lastMessage?.timestamp || '';
            return new Date(timeB).getTime() - new Date(timeA).getTime();
        }));

        // Play sound if not current user
        if (newMsg.userId !== currentUser.id) {
            notificationSound.play().catch(e => console.error("Audio play failed", e));
        }
      }
    };

    wsClientRef.current.addMessageHandler(handleMessage);
    wsClientRef.current.connect(token || undefined).then(() => {
        setIsConnected(true);
    }).catch(err => {
        console.error("WS Connect Error", err);
        setIsConnected(false);
    });

    return () => {
        if (wsClientRef.current) {
            wsClientRef.current.removeMessageHandler(handleMessage);
            wsClientRef.current.disconnect();
        }
    };
  }, [currentUser.id, activeChannelId, notificationSound]);

  // Load Channels
  useEffect(() => {
      loadChannels();
  }, [currentUser.id]);

  const loadChannels = async () => {
      try {
          const data = await api.chat.getChannels(currentUser.id);
          setChannels(data.sort((a, b) => {
              const timeA = a.lastMessage?.timestamp || '';
              const timeB = b.lastMessage?.timestamp || '';
              return new Date(timeB).getTime() - new Date(timeA).getTime();
          }));
      } catch (error) {
          console.error("Failed to load channels", error);
      }
  };

  // Load Messages when active channel changes
  useEffect(() => {
      if (activeChannelId) {
          loadMessages(activeChannelId);
          // Mark read
          api.chat.markRead(activeChannelId, currentUser.id);
          setChannels(prev => prev.map(ch => ch.id === activeChannelId ? { ...ch, unreadCount: 0 } : ch));
      } else {
          setMessages([]);
      }
  }, [activeChannelId]);

  const loadMessages = async (channelId: string) => {
      setIsLoading(true);
      try {
          const res = await api.chat.getMessages(channelId, { limit: 50 });
          // Messages from API are usually newest first or oldest first? 
          // Assuming API returns newest first, we reverse to display oldest at top
          // Adjust based on actual API behavior. Usually chat needs oldest at top.
          // If API returns { messages: [newest, ..., oldest] }, we reverse.
          // If API returns { messages: [oldest, ..., newest] }, we keep.
          // Let's assume standard pagination (newest first) -> reverse
          setMessages(res.messages.reverse()); 
          setHasMoreMessages(res.hasMore);
      } catch (error) {
          console.error("Failed to load messages", error);
          toast.error("載入訊息失敗");
      } finally {
          setIsLoading(false);
          scrollToBottom();
      }
  };

  const scrollToBottom = () => {
      setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!messageInput.trim() || !activeChannelId) return;

      const tempId = \`temp-\${Date.now()}\`;
      const content = messageInput;
      setMessageInput('');

      // Optimistic update
      const tempMsg: ChatMessage = {
          id: tempId,
          channelId: activeChannelId,
          userId: currentUser.id,
          userName: currentUser.name,
          avatar: currentUser.avatar,
          content: content,
          timestamp: new Date().toISOString(),
          readBy: [currentUser.id]
      };
      
      setMessages(prev => [...prev, tempMsg]);
      scrollToBottom();

      try {
          const newMsg = await api.chat.sendMessage(activeChannelId, currentUser.id, content, currentUser);
          // Replace temp message
          setMessages(prev => prev.map(m => m.id === tempId ? newMsg : m));
          
          // Update channel list preview
          setChannels(prev => prev.map(ch => {
              if (ch.id === activeChannelId) {
                  return { ...ch, lastMessage: newMsg };
              }
              return ch;
          }).sort((a, b) => {
              const timeA = a.lastMessage?.timestamp || '';
              const timeB = b.lastMessage?.timestamp || '';
              return new Date(timeB).getTime() - new Date(timeA).getTime();
          }));

      } catch (error) {
          console.error("Send message failed", error);
          toast.error("發送失敗");
          setMessages(prev => prev.filter(m => m.id !== tempId));
          setMessageInput(content); // Restore input
      }
  };

  const handleCreateGroup = async (name: string, userIds: string[]) => {
      try {
          const newChannel = await api.chat.createGroupChannel(name, userIds);
          setChannels(prev => [newChannel, ...prev]);
          setActiveChannelId(newChannel.id);
          setShowCreateGroupModal(false);
          toast.success("群組建立成功");
      } catch (error) {
          console.error("Create group failed", error);
          toast.error("建立失敗");
      }
  };

  const handleLeaveGroup = async () => {
      if (!activeChannelId) return;
      try {
          await api.chat.leaveChannel(activeChannelId);
          setChannels(prev => prev.filter(c => c.id !== activeChannelId));
          setActiveChannelId(null);
          setShowGroupInfoModal(false);
          toast.success("已退出群組");
      } catch (error) {
          console.error("Leave group failed", error);
          toast.error("退出失敗");
      }
  };

  const handleEditGroup = async (newName: string, newMembers: string[]) => {
      if (!activeChannelId) return;
      try {
          const updatedChannel = await api.chat.editChannel(activeChannelId, newName, newMembers);
          setChannels(prev => prev.map(c => c.id === activeChannelId ? updatedChannel : c));
          setShowGroupInfoModal(false);
          toast.success("群組已更新");
      } catch (error) {
          console.error("Edit group failed", error);
          toast.error("更新失敗");
      }
  };

  const getChannelName = (channel: ChatChannel) => {
      if (channel.type === 'GROUP') return channel.name;
      // Direct: find other user
      const otherId = channel.participants.find(id => id !== currentUser.id);
      const otherUser = users.find(u => u.id === otherId);
      return otherUser?.name || 'Unknown User';
  };

  const getChannelAvatar = (channel: ChatChannel) => {
      if (channel.type === 'GROUP') return null; // Or group icon
      const otherId = channel.participants.find(id => id !== currentUser.id);
      const otherUser = users.find(u => u.id === otherId);
      return otherUser?.avatar;
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <h2 className="font-bold text-slate-700">聊天室</h2>
                <button 
                    onClick={() => setShowCreateGroupModal(true)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                >
                    +
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {channels.map(channel => (
                    <div 
                        key={channel.id}
                        onClick={() => setActiveChannelId(channel.id)}
                        className={\`p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-100 transition \${activeChannelId === channel.id ? 'bg-blue-50' : ''}\`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                    {getChannelAvatar(channel) ? (
                                        <img src={getChannelAvatar(channel)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-slate-500 font-bold">{getChannelName(channel).charAt(0)}</span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-slate-700 truncate">{getChannelName(channel)}</div>
                                    <div className="text-xs text-slate-500 truncate">
                                        {channel.lastMessage?.content || '無訊息'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-xs text-slate-400">
                                    {channel.lastMessage?.timestamp ? new Date(channel.lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                </span>
                                {channel.unreadCount > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                                        {channel.unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
            {activeChannel ? (
                <>
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-slate-700 text-lg">{getChannelName(activeChannel)}</h3>
                            {activeChannel.type === 'GROUP' && (
                                <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-600">
                                    {activeChannel.participants.length} 人
                                </span>
                            )}
                        </div>
                        {activeChannel.type === 'GROUP' && (
                            <button 
                                onClick={() => setShowGroupInfoModal(true)}
                                className="text-slate-500 hover:text-blue-600"
                            >
                                ℹ️
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={messagesContainerRef}>
                        {messages.map((msg, index) => {
                            const isMe = msg.userId === currentUser.id;
                            return (
                                <div key={msg.id} className={\`flex \${isMe ? 'justify-end' : 'justify-start'}\`}>
                                    {!isMe && (
                                        <div className="w-8 h-8 rounded-full bg-slate-300 flex-shrink-0 mr-2 overflow-hidden">
                                            {msg.avatar ? <img src={msg.avatar} alt="" /> : null}
                                        </div>
                                    )}
                                    <div className={\`max-w-[70%] \${isMe ? 'items-end' : 'items-start'} flex flex-col\`}>
                                        {!isMe && <span className="text-xs text-slate-500 mb-1">{msg.userName}</span>}
                                        <div 
                                            className={\`p-3 rounded-2xl text-sm break-words \${
                                                isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                                            }\`}
                                            onClick={() => isMe && setReadStatusMsg(msg)}
                                        >
                                            {msg.content}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1">
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            {isMe && msg.readBy && (
                                                <span className="ml-1">
                                                    {msg.readBy.length > 1 ? \`已讀 \${msg.readBy.length - 1}\` : '送達'}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={messageInput}
                                onChange={e => setMessageInput(e.target.value)}
                                placeholder="輸入訊息..."
                                className="flex-1 p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button 
                                type="submit"
                                disabled={!messageInput.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                發送
                            </button>
                        </div>
                    </form>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4">
                    <div className="text-4xl">💬</div>
                    <p>選擇一個聊天室開始對話</p>
                </div>
            )}
        </div>

        {/* Modals */}
        {readStatusMsg && activeChannel && (
            <ChatMessageReadStatusModal 
                isOpen={!!readStatusMsg}
                message={readStatusMsg} 
                channel={activeChannel}
                users={users} 
                departments={departments}
                onClose={() => setReadStatusMsg(null)} 
            />
        )}

        {showCreateGroupModal && (
            <CreateGroupModal
                isOpen={showCreateGroupModal}
                users={users.filter(u => u.id !== currentUser.id)}
                currentUser={currentUser}
                departments={departments}
                onClose={() => setShowCreateGroupModal(false)}
                onCreateGroup={handleCreateGroup}
            />
        )}

        {showGroupInfoModal && activeChannel && (
            <GroupInfoModal
                isOpen={showGroupInfoModal}
                channel={activeChannel}
                users={users}
                currentUser={currentUser}
                departments={departments}
                onClose={() => setShowGroupInfoModal(false)}
                onLeaveGroup={handleLeaveGroup}
                onEditGroup={handleEditGroup}
            />
        )}
    </div>
  );
};
`;

const performanceViewContent = `
import React, { useState, useEffect } from 'react';
import { User, DepartmentDef, PerformanceReview, ReviewMetrics } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface PerformanceViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ currentUser, users, departments }) => {
  const toast = useToast();
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null);

  useEffect(() => {
    loadReviews();
  }, [selectedPeriod, currentUser.id]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      // Supervisor sees their department or all if boss
      // Employee sees only their own
      // API handles filtering based on caller, but we can also filter here or pass params
      const data = await api.performance.getReviews(selectedPeriod);
      setReviews(data);
    } catch (error) {
      console.error('Failed to load reviews', error);
      toast.error('載入績效考核失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReview = async (targetUserId: string) => {
      // Get stats for this user
      try {
          const stats = await api.performance.getUserStats(targetUserId, selectedPeriod);
          
          const newReview: PerformanceReview = {
              id: \`rev-\${Date.now()}\`,
              targetUserId,
              period: selectedPeriod,
              reviewerId: currentUser.id,
              updatedAt: new Date().toISOString(),
              metrics: (stats as any) || ({ taskCompletionRate: 100, sopCompletionRate: 100, attendanceRate: 100 } as ReviewMetrics),
              ratingWorkAttitude: 5,
              ratingProfessionalism: 5,
              ratingTeamwork: 5,
              managerComment: '',
              totalScore: 90,
              grade: 'A',
              status: 'DRAFT'
          };
          setEditingReview(newReview);
      } catch (error) {
          console.error('Failed to init review', error);
          toast.error('初始化失敗');
      }
  };

  const handleSaveReview = async () => {
      if (!editingReview) return;
      try {
          // Calculate score
          const metricsScore = (editingReview.metrics.taskCompletionRate + editingReview.metrics.sopCompletionRate + editingReview.metrics.attendanceRate) / 3 * 0.6;
          const managerScore = ((editingReview.ratingWorkAttitude + editingReview.ratingProfessionalism + editingReview.ratingTeamwork) / 15) * 100 * 0.4;
          const total = Math.round(metricsScore + managerScore);
          
          let grade: 'S'|'A'|'B'|'C'|'D' = 'C';
          if (total >= 95) grade = 'S';
          else if (total >= 85) grade = 'A';
          else if (total >= 75) grade = 'B';
          else if (total >= 60) grade = 'C';
          else grade = 'D';

          const toSave = { ...editingReview, totalScore: total, grade, status: 'PUBLISHED' as const };
          await api.performance.saveReview(toSave);
          
          setReviews(prev => {
              const idx = prev.findIndex(r => r.id === toSave.id);
              if (idx !== -1) return prev.map(r => r.id === toSave.id ? toSave : r);
              return [...prev, toSave];
          });
          setEditingReview(null);
          toast.success('考核已儲存');
      } catch (error) {
          console.error('Failed to save review', error);
          toast.error('儲存失敗');
      }
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  // Filter users to review:
  // If BOSS: All users
  // If SUPERVISOR: Users in same dept
  // If EMPLOYEE: Self only (view only)
  
  const reviewableUsers = users.filter(u => {
      if (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') return true;
      if (currentUser.role === 'SUPERVISOR') return u.department === currentUser.department;
      return u.id === currentUser.id;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
        <div className="flex justify-between items-end border-b border-slate-200 pb-4">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span>🏆</span> 績效考核
                </h2>
                <p className="text-slate-500 text-sm mt-1">KPI 指標與主管評分</p>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-600">考核月份:</span>
                <input 
                    type="month" 
                    value={selectedPeriod}
                    onChange={e => setSelectedPeriod(e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg text-sm"
                />
            </div>
        </div>

        {editingReview ? (
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-700">
                        正在評核: {getUserName(editingReview.targetUserId)}
                        <span className="ml-2 text-sm font-normal text-slate-500">({editingReview.period})</span>
                    </h3>
                    <button onClick={() => setEditingReview(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Metrics */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-600 border-b pb-2">客觀數據 (60%)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <div className="text-xs text-blue-600 mb-1">任務達成率</div>
                                <div className="text-2xl font-black text-blue-700">{editingReview.metrics.taskCompletionRate}%</div>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                                <div className="text-xs text-green-600 mb-1">SOP 執行率</div>
                                <div className="text-2xl font-black text-green-700">{editingReview.metrics.sopCompletionRate}%</div>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <div className="text-xs text-purple-600 mb-1">出勤率</div>
                                <div className="text-2xl font-black text-purple-700">{editingReview.metrics.attendanceRate}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Manager Rating */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-600 border-b pb-2">主管評分 (40%)</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">工作態度 (1-5)</label>
                                <input 
                                    type="range" min="1" max="5" step="1"
                                    value={editingReview.ratingWorkAttitude}
                                    onChange={e => setEditingReview({...editingReview, ratingWorkAttitude: Number(e.target.value)})}
                                    className="w-full"
                                />
                                <div className="text-right text-sm font-bold text-blue-600">{editingReview.ratingWorkAttitude} 分</div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">專業能力 (1-5)</label>
                                <input 
                                    type="range" min="1" max="5" step="1"
                                    value={editingReview.ratingProfessionalism}
                                    onChange={e => setEditingReview({...editingReview, ratingProfessionalism: Number(e.target.value)})}
                                    className="w-full"
                                />
                                <div className="text-right text-sm font-bold text-blue-600">{editingReview.ratingProfessionalism} 分</div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">團隊合作 (1-5)</label>
                                <input 
                                    type="range" min="1" max="5" step="1"
                                    value={editingReview.ratingTeamwork}
                                    onChange={e => setEditingReview({...editingReview, ratingTeamwork: Number(e.target.value)})}
                                    className="w-full"
                                />
                                <div className="text-right text-sm font-bold text-blue-600">{editingReview.ratingTeamwork} 分</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-2">主管評語</label>
                    <textarea 
                        value={editingReview.managerComment}
                        onChange={e => setEditingReview({...editingReview, managerComment: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="請輸入評語..."
                    />
                </div>

                <div className="p-6 bg-slate-50 flex justify-end gap-3">
                    <button 
                        onClick={() => setEditingReview(null)}
                        className="px-6 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-bold"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleSaveReview}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-200"
                    >
                        完成並發布
                    </button>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reviewableUsers.map(user => {
                    const review = reviews.find(r => r.targetUserId === user.id);
                    const canEdit = currentUser.role === 'BOSS' || (currentUser.role === 'SUPERVISOR' && user.id !== currentUser.id);

                    return (
                        <div key={user.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl overflow-hidden">
                                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : '👤'}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800">{user.name}</div>
                                    <div className="text-xs text-slate-500">{user.role}</div>
                                </div>
                            </div>

                            {review ? (
                                <div className="text-right">
                                    <div className="text-2xl font-black text-blue-600">{review.grade}</div>
                                    <div className="text-xs text-slate-400">{review.totalScore} 分</div>
                                    {canEdit && (
                                        <button 
                                            onClick={() => setEditingReview(review)}
                                            className="text-xs text-blue-500 hover:underline mt-1"
                                        >
                                            修改
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    {canEdit ? (
                                        <button 
                                            onClick={() => handleCreateReview(user.id)}
                                            className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 font-bold"
                                        >
                                            開始評核
                                        </button>
                                    ) : (
                                        <span className="text-sm text-slate-400 italic">尚未評核</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
};
`;

const settingsContent = \`
import React, { useState } from 'react';
import { User, MenuItemId, DEFAULT_MENU_GROUPS, MENU_LABELS } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface SystemSettingsViewProps {
  currentUser: User;
  onLogout: () => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({ currentUser, onLogout }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'about'>('profile');
  const [menuGroups, setMenuGroups] = useState(DEFAULT_MENU_GROUPS);

  const handleResetSystem = async () => {
      if (confirm('⚠️ 危險操作：確定要重置系統嗎？所有資料將被清空！')) {
          const doubleCheck = prompt('請輸入 "RESET" 以確認重置');
          if (doubleCheck === 'RESET') {
              try {
                  await api.system.resetFactoryDefault();
                  alert('系統已重置，將重新載入');
                  window.location.reload();
              } catch (e) {
                  toast.error('重置失敗');
              }
          }
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>⚙️</span> 系統設定
        </h2>

        <div className="flex gap-2 border-b border-slate-200 pb-1">
            <button 
                onClick={() => setActiveTab('profile')}
                className={\`px-4 py-2 text-sm font-bold rounded-t-lg transition \${activeTab === 'profile' ? 'bg-white text-blue-600 border border-b-0 border-slate-200' : 'text-slate-500 hover:text-slate-700'}\`}
            >
                個人資料
            </button>
            {currentUser.role === 'BOSS' && (
                <button 
                    onClick={() => setActiveTab('system')}
                    className={\`px-4 py-2 text-sm font-bold rounded-t-lg transition \${activeTab === 'system' ? 'bg-white text-blue-600 border border-b-0 border-slate-200' : 'text-slate-500 hover:text-slate-700'}\`}
                >
                    系統管理
                </button>
            )}
            <button 
                onClick={() => setActiveTab('about')}
                className={\`px-4 py-2 text-sm font-bold rounded-t-lg transition \${activeTab === 'about' ? 'bg-white text-blue-600 border border-b-0 border-slate-200' : 'text-slate-500 hover:text-slate-700'}\`}
            >
                關於
            </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {activeTab === 'profile' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl overflow-hidden">
                            {currentUser.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover" /> : '👤'}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{currentUser.name}</h3>
                            <p className="text-slate-500">{currentUser.role} @ {currentUser.department}</p>
                        </div>
                    </div>
                    
                    <div className="pt-6 border-t border-slate-100">
                        <button 
                            onClick={onLogout}
                            className="px-6 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition"
                        >
                            登出系統
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'system' && currentUser.role === 'BOSS' && (
                <div className="space-y-8">
                    <div>
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <span>📱</span> 選單排序設定
                        </h3>
                        <div className="space-y-4">
                            {menuGroups.map((group, groupIndex) => (
                                <div key={group.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                    <div className="p-3 bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                                        {group.label}
                                    </div>
                                    <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {group.items.map(itemId => (
                                            <div key={itemId} className="p-2 bg-white border border-slate-100 rounded text-sm text-slate-600 flex items-center gap-2">
                                                <span>{MENU_LABELS[itemId]?.icon}</span>
                                                <span>{MENU_LABELS[itemId]?.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <p className="text-xs text-slate-400 mt-2">* 目前僅支援檢視，排序功能開發中</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2">
                            <span>🚨</span> 危險區域
                        </h3>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-100 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-red-700">恢復原廠設定</div>
                                <div className="text-xs text-red-500">清除所有資料庫內容，包含使用者與任務</div>
                            </div>
                            <button 
                                onClick={handleResetSystem}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200"
                            >
                                執行重置
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'about' && (
                <div className="text-center py-10">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl font-black mx-auto mb-4 transform rotate-3">
                        T
                    </div>
                    <h3 className="text-xl font-black text-slate-800">TaskFlow Pro</h3>
                    <p className="text-slate-500 mb-6">企業級協作管理系統</p>
                    <div className="text-xs text-slate-400 space-y-1">
                        <p>Version 2.5.0 (Build 20240101)</p>
                        <p>© 2024 TaskFlow Inc. All rights reserved.</p>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
`;

try {
    fs.writeFileSync(path.join(rootDir, 'components', 'ChatSystem.tsx'), chatSystemContent);
    console.log('Successfully wrote components/ChatSystem.tsx');
} catch (err) {
    console.error('Error writing components/ChatSystem.tsx:', err);
}

try {
    fs.writeFileSync(path.join(rootDir, 'components', 'PerformanceView.tsx'), performanceContent);
    console.log('Successfully wrote components/PerformanceView.tsx');
} catch (err) {
    console.error('Error writing components/PerformanceView.tsx:', err);
}

try {
    fs.writeFileSync(path.join(rootDir, 'components', 'SystemSettingsView.tsx'), settingsContent);
    console.log('Successfully wrote components/SystemSettingsView.tsx');
} catch (err) {
    console.error('Error writing components/SystemSettingsView.tsx:', err);
}
