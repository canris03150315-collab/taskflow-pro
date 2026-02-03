import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, DepartmentDef, ChatChannel, ChatMessage, Role } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';
import { WebSocketClient } from '../utils/websocketClient';
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
  
  // Sidebar mode: 'CHAT' or 'CONTACTS'
  const [sidebarMode, setSidebarMode] = useState<'CHAT' | 'CONTACTS'>('CHAT');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Sound
  const notificationSound = useMemo(() => new Audio('/notification.mp3'), []);

  // Polling for new messages (temporary solution until WebSocket is fully integrated)
  useEffect(() => {
    if (!activeChannelId) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.chat.getMessages(activeChannelId, { limit: 50 });
        const newMessages = res.messages;
        
        // Only update if there are new messages
        if (newMessages.length > messages.length || 
            (newMessages.length > 0 && messages.length > 0 && 
             newMessages[newMessages.length - 1].id !== messages[messages.length - 1].id)) {
          setMessages(newMessages);
          
          // Play notification sound for new messages from others
          const lastNewMsg = newMessages[newMessages.length - 1];
          if (lastNewMsg && lastNewMsg.userId !== currentUser.id) {
            notificationSound.play().catch(() => {});
          }
        }
      } catch (error) {
        console.error('輪詢訊息失敗:', error);
      }
    }, 2000); // Poll every 2 seconds for better real-time experience
    
    return () => clearInterval(pollInterval);
  }, [activeChannelId, messages.length, currentUser.id]);

  // Initialize WebSocket
  useEffect(() => {
    if (!currentUser) return;
    
    const token = localStorage.getItem('auth_token');
    const isProduction = window.location.protocol === 'https:';
    
    if (!isProduction) { // Enable WebSocket for HTTP connections
      const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'wss://incorporate-ruth-matters-dental.trycloudflare.com/ws';
      wsClientRef.current = new WebSocketClient(wsUrl);
      
      const handleMessage = (event: any) => {
        if (event.type === 'chat_message') {
          const newMsg = event.payload as ChatMessage;
          
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            if (newMsg.channelId === activeChannelId) {
               return [...prev, newMsg];
            }
            return prev;
          });

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
              const timeA = a.lastMessage?.timestamp || '';
              const timeB = b.lastMessage?.timestamp || '';
              return new Date(timeB).getTime() - new Date(timeA).getTime();
          }));

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
    } else {
      console.log('HTTPS 環境，WebSocket 已禁用');
    }
  }, [currentUser, activeChannelId, notificationSound]);

  // Load Channels with polling for real-time updates
  useEffect(() => {
      loadChannels();
      
      // Poll channels every 5 seconds to get new messages and unread counts
      const channelPollInterval = setInterval(() => {
          loadChannels();
      }, 5000);
      
      return () => clearInterval(channelPollInterval);
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
          // 後端已經返回正確順序（最舊在前，最新在後）
          setMessages(res.messages); 
          setHasMoreMessages(res.hasMore);
          // 載入完成後自動滾動到最下方
          scrollToBottom();
      } catch (error) {
          console.error("Failed to load messages", error);
          toast.error("載入訊息失敗");
      } finally {
          setIsLoading(false);
      }
  };

  const scrollToBottom = () => {
      setTimeout(() => {
          if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
      }, 100);
  };

  // 檔案上傳處理
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChannelId || isUploading) return;
    
    // 檢查檔案大小（限制 5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast.warning('檔案大小不能超過 5MB');
      return;
    }
    
    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const isImage = file.type.startsWith('image/');
        
        // 圖片和檔案都發送 Base64，但格式不同
        const content = isImage 
          ? `[IMG]${base64}`
          : `[FILE]${file.name}|${base64}`;  // 檔案格式：檔名|Base64
        
        await api.chat.sendMessage(activeChannelId, currentUser.id, content, currentUser);
        loadMessages(activeChannelId);
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast.error('檔案讀取失敗');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      toast.error('檔案上傳失敗，請重試');
      setIsUploading(false);
    }
    
    // 清除 input
    e.target.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChannelId) return;

      console.log('[DEBUG] 發送訊息 - 當前用戶:', currentUser.id, currentUser.name, currentUser.role);
      
      const tempId = `temp-${Date.now()}`;
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
          console.log('[DEBUG] 收到後端回應 - 訊息:', newMsg.id, 'userId:', newMsg.userId, 'userName:', newMsg.userName);
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
          if (activeChannelId === activeChannelId) setActiveChannelId(null);
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

  const handleStartDirectChat = async (userId: string) => {
      try {
          // Check if a direct chat with this user already exists
          const existingChannel = channels.find(ch => 
              ch.type === 'DIRECT' && 
              ch.participants.includes(userId) && 
              ch.participants.includes(currentUser.id)
          );

          if (existingChannel) {
              // If channel exists, just switch to it
              setActiveChannelId(existingChannel.id);
              setSidebarMode('CHAT');
              return;
          }

          // If no existing channel, create a new one
          const newChannel = await api.chat.createDirectChannel(currentUser.id, userId);
          setChannels(prev => [newChannel, ...prev]);
          setActiveChannelId(newChannel.id);
          setSidebarMode('CHAT');
          toast.success("已開始對話");
      } catch (error) {
          console.error("Start direct chat failed", error);
          toast.error("開始對話失敗");
      }
  };

  const handleDeleteChannel = async (channelId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm('確定要刪除此聊天室嗎？所有訊息將被永久刪除。')) {
          return;
      }
      try {
          await api.chat.deleteChannel(channelId);
          setChannels(prev => prev.filter(ch => ch.id !== channelId));
          if (activeChannelId === channelId) {
              setActiveChannelId(null);
          }
          toast.success("聊天室已刪除");
      } catch (error) {
          console.error("Delete channel failed", error);
          toast.error("刪除聊天室失敗");
      }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Sidebar */}
        <div className={`${activeChannelId ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-slate-200 flex-col bg-white`}>
            {/* Search Bar */}
            <div className="p-3 border-b border-slate-200">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜尋聊天室或聯絡人..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>
            
            {/* Sidebar Tabs */}
            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => setSidebarMode('CHAT')}
                    className={`flex-1 py-3 text-sm font-medium transition relative ${sidebarMode === 'CHAT' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>聊天</span>
                    </div>
                    {sidebarMode === 'CHAT' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
                </button>
                <button 
                    onClick={() => setSidebarMode('CONTACTS')}
                    className={`flex-1 py-3 text-sm font-medium transition relative ${sidebarMode === 'CONTACTS' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>通訊錄</span>
                    </div>
                    {sidebarMode === 'CONTACTS' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {sidebarMode === 'CHAT' ? (
                    <>
                        {channels.length === 0 && (
                            <div className="p-4 text-center text-slate-400 text-sm">
                                尚無聊天記錄<br/>請切換至通訊錄發起對話
                            </div>
                        )}
                        {channels.filter(ch => 
                            searchQuery === '' || 
                            getChannelName(ch).toLowerCase().includes(searchQuery.toLowerCase()) ||
                            ch.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
                        ).map(channel => (
                    <div 
                        key={channel.id}
                        onClick={() => setActiveChannelId(channel.id)}
                        className={`p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 transition-all duration-200 ${activeChannelId === channel.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'} group relative`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                                    {getChannelAvatar(channel) ? (
                                        <img src={getChannelAvatar(channel)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-slate-500 font-bold text-lg">{getChannelName(channel).charAt(0)}</span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="font-semibold text-slate-800 truncate text-sm">{getChannelName(channel)}</div>
                                        {channel.type === 'GROUP' && (
                                            <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">{channel.participants.length}</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate mt-0.5">
                                        {channel.lastMessage?.content || '開始對話...'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
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
                                <button
                                    onClick={(e) => handleDeleteChannel(channel.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition text-red-500"
                                    title="刪除聊天室"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                        ))}
                    </>
                ) : (
                    <div className="p-4 space-y-4">
                        <button 
                            onClick={() => setShowCreateGroupModal(true)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
                        >
                            <span className="text-xl">➕</span>
                            <div className="text-left">
                                <div className="font-bold text-sm">建立群組</div>
                                <div className="text-xs opacity-80">選擇成員開始群聊</div>
                            </div>
                        </button>
                        
                        {/* 群組列表 */}
                        {channels.filter(ch => ch.type === 'GROUP').length > 0 && (
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase mb-2 px-2">群組</div>
                                <div className="space-y-1">
                                    {channels.filter(ch => ch.type === 'GROUP').map(channel => (
                                        <button 
                                            key={channel.id}
                                            onClick={() => {
                                                setActiveChannelId(channel.id);
                                                setSidebarMode('CHAT');
                                            }}
                                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0 flex items-center justify-center">
                                                <span className="text-white font-bold text-xs">群組</span>
                                            </div>
                                            <div className="text-left flex-1">
                                                <div className="text-sm font-bold text-slate-700">{channel.name}</div>
                                                <div className="text-xs text-slate-500">{channel.participants.length} 位成員</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* 聯絡人列表 - 按部門分組顯示 */}
                        <div className="space-y-4">
                            {departments
                                .filter(dept => users.some(u => u.department === dept.id && u.id !== currentUser.id))
                                .map(dept => {
                                    const deptUsers = users.filter(u => u.department === dept.id && u.id !== currentUser.id);
                                    if (deptUsers.length === 0) return null;
                                    
                                    return (
                                        <div key={dept.id}>
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2 px-2 flex items-center gap-2">
                                                <span>{dept.name}</span>
                                                <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">{deptUsers.length}</span>
                                            </div>
                                            <div className="space-y-1">
                                                {deptUsers
                                                    .filter(user => 
                                                        searchQuery === '' || 
                                                        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        user.role.toLowerCase().includes(searchQuery.toLowerCase())
                                                    )
                                                    .map(user => (
                                                        <button 
                                                            key={user.id}
                                                            onClick={() => handleStartDirectChat(user.id)}
                                                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition"
                                                        >
                                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                                                                {user.avatar ? (
                                                                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <span className="text-slate-500 font-bold">{user.name.charAt(0)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-left flex-1 min-w-0">
                                                                <div className="text-sm font-bold text-slate-700 truncate">{user.name}</div>
                                                                <div className="text-xs text-slate-500 truncate">{user.role}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Chat Area */}
        <div className={`${activeChannelId ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
            {activeChannel ? (
                <>
                    <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setActiveChannelId(null)}
                                className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 active:scale-95 transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                                {activeChannel.type === 'GROUP' ? '群' : getChannelName(activeChannel).charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800 text-base">{getChannelName(activeChannel)}</h3>
                                {activeChannel.type === 'GROUP' && (
                                    <span className="text-xs text-slate-500">
                                        {activeChannel.participants.length} 位成員
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {activeChannel.type === 'GROUP' && (
                                <button 
                                    onClick={() => setShowGroupInfoModal(true)}
                                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    title="群組資訊"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white" ref={messagesContainerRef}>
                        {messages.map((msg, index) => {
                            const isMe = msg.userId === currentUser.id;
                            if (index === 0) {
                                console.log('[DEBUG] 顯示訊息 - msg.userId:', msg.userId, 'msg.userName:', msg.userName, 'currentUser.id:', currentUser.id, 'isMe:', isMe);
                            }
                            const showAvatar = !isMe && (index === 0 || messages[index - 1].userId !== msg.userId);
                            const showName = !isMe && (index === 0 || messages[index - 1].userId !== msg.userId);
                            
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                    {!isMe && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex-shrink-0 mr-2 overflow-hidden flex items-center justify-center">
                                            {msg.avatar ? (
                                                <img src={msg.avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-white text-xs font-semibold">{msg.userName?.charAt(0)}</span>
                                            )}
                                        </div>
                                    )}
                                    <div className={`max-w-[65%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                        {showName && <span className="text-xs text-slate-600 mb-1 font-medium px-1">{msg.userName}</span>}
                                        <div className="relative group/msg">
                                            <div 
                                                className={`${
                                                    msg.content.startsWith('[IMG]') || msg.content.startsWith('[FILE]')
                                                        ? '' 
                                                        : `px-4 py-2.5 rounded-2xl shadow-sm max-w-md break-words ${
                                                            isMe 
                                                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                                                                : 'bg-white text-slate-800 border border-slate-100'
                                                        }`
                                                }`}
                                                onClick={() => isMe && !msg.content.startsWith('[IMG]') && !msg.content.startsWith('[FILE]') && setReadStatusMsg(msg)}
                                            >
                                                {msg.content.startsWith('[IMG]') ? (
                                                    // 圖片訊息
                                                    <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                                                        <img 
                                                            src={msg.content.replace('[IMG]', '')} 
                                                            alt="圖片" 
                                                            className="max-w-[250px] md:max-w-[300px] max-h-[300px] object-contain cursor-pointer hover:opacity-90 transition"
                                                        />
                                                    </div>
                                                ) : msg.content.startsWith('[FILE]') ? (
                                                    // 檔案訊息
                                                    (() => {
                                                        const fileContent = msg.content.replace('[FILE]', '');
                                                        const [fileName, fileData] = fileContent.includes('|') 
                                                            ? fileContent.split('|') 
                                                            : [fileContent, null];
                                                        
                                                        const handleDownload = () => {
                                                            if (fileData) {
                                                                const link = document.createElement('a');
                                                                link.href = fileData;
                                                                link.download = fileName;
                                                                link.click();
                                                            }
                                                        };
                                                        
                                                        return (
                                                            <div 
                                                                onClick={fileData ? handleDownload : undefined}
                                                                className={`px-3.5 py-2 text-[14px] leading-relaxed break-words shadow-sm rounded-2xl flex items-center gap-2 transition
                                                                    ${fileData ? 'cursor-pointer hover:opacity-80' : ''}
                                                                    ${isMe ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white border border-slate-100 text-slate-800'}`}
                                                                title={fileData ? '點擊下載' : ''}
                                                            >
                                                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                                </svg>
                                                                <span>{fileName}</span>
                                                                {fileData && (
                                                                    <svg className="w-4 h-4 flex-shrink-0 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    // 一般文字訊息
                                                    msg.content
                                                )}
                                            </div>
                                            {/* Quick Actions */}
                                            <div className={`absolute top-0 ${isMe ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-1`}>
                                                <button 
                                                    className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
                                                    title="回覆"
                                                    onClick={() => setReplyToMessage(msg)}
                                                >
                                                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 px-1">
                                            <span className="text-[10px] text-slate-400">
                                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                            {isMe && msg.readBy && (
                                                <span className="text-[10px] text-slate-400">
                                                    · {msg.readBy.length > 1 ? `${msg.readBy.length - 1}人已讀` : '已送達'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {isMe && <div className="w-8"></div>}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 pb-20 md:pb-4 border-t border-slate-200 bg-white">
                        {replyToMessage && (
                            <div className="mb-2 p-2 bg-blue-50 border-l-4 border-blue-500 rounded flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="text-xs text-blue-600 font-medium mb-0.5">回覆 {replyToMessage.userName}</div>
                                    <div className="text-xs text-slate-600 truncate">{replyToMessage.content}</div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setReplyToMessage(null)}
                                    className="text-slate-400 hover:text-slate-600 ml-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        <div className="flex gap-2 items-end">
                            {/* 檔案上傳按鈕 */}
                            <input 
                                type="file" 
                                id="file-upload" 
                                className="hidden" 
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                                onChange={handleFileUpload}
                            />
                            <label 
                                htmlFor="file-upload"
                                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 active:scale-95
                                    ${isUploading 
                                        ? 'bg-blue-100 text-blue-500 cursor-wait' 
                                        : 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 hover:text-slate-700 cursor-pointer'}`}
                            >
                                {isUploading ? (
                                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                                    </svg>
                                )}
                            </label>
                            
                            <div className="flex-1 relative">
                                <textarea
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e as any);
                                        }
                                    }}
                                    placeholder="輸入訊息... (Shift+Enter 換行)"
                                    rows={1}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    style={{ minHeight: '44px', maxHeight: '120px' }}
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={!messageInput.trim()}
                                className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center gap-2 font-medium"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                發送
                            </button>
                        </div>
                    </form>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4">
                    <div className="text-4xl"></div>
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
