
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, ChatChannel, ChatMessage, DepartmentDef, Role, ChatRequest } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';
import { ChatMessageReadStatusModal } from './ChatMessageReadStatusModal';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupInfoModal } from './GroupInfoModal';
import { getWebSocketClient, WebSocketClient } from '../utils/websocketClient';

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
  const [inputValue, setInputValue] = useState('');
  
  // View: 'CHAT' or 'CONTACTS'
  const [sidebarMode, setSidebarMode] = useState<'CHAT' | 'CONTACTS'>('CHAT');

  // Loading State for Contact Clicking
  const [processingContactId, setProcessingContactId] = useState<string | null>(null);

  // Read Status Modal State
  const [readStatusMsg, setReadStatusMsg] = useState<ChatMessage | null>(null);
  
  // 建立群組 Modal 狀態
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  
  // 群組資訊 Modal 狀態
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  
  // 圖片預覽狀態
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // 手機版長按選單狀態
  const [longPressMenuId, setLongPressMenuId] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 新建頻道暫存（解決狀態更新延遲問題）
  const [pendingChannel, setPendingChannel] = useState<ChatChannel | null>(null);

  // 分頁和增量更新狀態
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<string | null>(null);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);
  
  // 訊息快取 - 避免每次切換都重新載入
  const messagesCacheRef = useRef<Map<string, { messages: ChatMessage[]; timestamp: string | null; hasMore: boolean }>>(new Map());
  
  // 預載中的頻道 ID
  const prefetchingRef = useRef<Set<string>>(new Set());
  
  // 通訊錄部門展開/收合狀態
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());

  // Ref specifically for the SCROLLABLE CONTAINER, not an element at the bottom
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // 追踪最後一條訊息 ID，用於判斷是否需要滾動到底部
  const lastMessageIdRef = useRef<string | null>(null);

  // WebSocket 狀態
  const [wsConnected, setWsConnected] = useState(false);
  const wsClientRef = useRef<WebSocketClient | null>(null);

  // WebSocket 訊息處理器
  const handleWsMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'AUTH_SUCCESS':
        console.log('[WebSocket] 認證成功');
        setWsConnected(true);
        break;
        
      case 'NEW_MESSAGE':
        // 收到新訊息
        const newMsg = message.message;
        if (newMsg.channelId === activeChannelId) {
          setMessages(prev => {
            // 去重
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setLastMessageTimestamp(newMsg.timestamp);
        }
        // 更新頻道列表
        loadChannels();
        break;
        
      case 'USER_TYPING':
        // 可以顯示 "對方正在輸入..." 提示
        console.log(`[WebSocket] ${message.userName} 正在輸入...`);
        break;
        
      case 'MESSAGES_READ':
        // 訊息已讀更新
        console.log(`[WebSocket] 頻道 ${message.channelId} 訊息已讀`);
        break;
    }
  }, [activeChannelId]);

  // --- Initialization ---
  useEffect(() => {
    loadChannels();
    
    // 嘗試連接 WebSocket
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const wsClient = getWebSocketClient();
        wsClientRef.current = wsClient;
        
        wsClient.addMessageHandler(handleWsMessage);
        wsClient.onConnect = () => setWsConnected(true);
        wsClient.onDisconnect = () => setWsConnected(false);
        
        wsClient.connect(token).catch(err => {
          console.warn('[WebSocket] 連接失敗，使用輪詢模式:', err);
        });
      } catch (err) {
        console.warn('[WebSocket] 初始化失敗:', err);
      }
    }
    
    // 備用輪詢 - 當 WebSocket 未連接時使用（間隔較長）
    let intervalId: NodeJS.Timeout;
    
    const poll = () => {
        // 只在 WebSocket 未連接時輪詢
        if (!wsClientRef.current?.isConnected()) {
            if(activeChannelId && lastMessageTimestamp) {
                loadNewMessages(activeChannelId);
                api.chat.markRead(activeChannelId, currentUser.id).catch(() => {});
            }
            loadChannels();
        }
    };
    
    const startPolling = () => {
        // WebSocket 連接時使用長間隔，未連接時使用短間隔
        const delay = wsClientRef.current?.isConnected() 
            ? 30000 
            : (document.hidden ? 15000 : 5000);
        intervalId = setTimeout(() => {
            poll();
            startPolling();
        }, delay);
    };
    
    startPolling();
    
    // 頁面可見性變化時調整輪詢
    const handleVisibility = () => {
        clearTimeout(intervalId);
        startPolling();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
        clearTimeout(intervalId);
        document.removeEventListener('visibilitychange', handleVisibility);
        // 移除 WebSocket 處理器
        wsClientRef.current?.removeMessageHandler(handleWsMessage);
    };
  }, [currentUser, activeChannelId, lastMessageTimestamp, handleWsMessage]);

  const loadChannels = async () => {
      try {
          const data = await api.chat.getChannels(currentUser.id);
          
          // 處理可能的格式：陣列或 {channels: []} 物件
          let rawChannels: any[] = [];
          if (Array.isArray(data)) {
              rawChannels = data;
          } else if (data && typeof data === 'object' && 'channels' in data) {
              rawChannels = Array.isArray((data as any).channels) ? (data as any).channels : [];
          }
          
          // 映射頻道數據，確保 lastMessage 格式正確
          const newChannels = rawChannels.map((ch: any) => {
              const lastMsg = ch.lastMessage || ch.last_message;
              return {
                  ...ch,
                  lastMessage: lastMsg ? {
                      id: lastMsg.id,
                      channelId: lastMsg.channelId || lastMsg.channel_id,
                      userId: lastMsg.userId || lastMsg.user_id,
                      userName: lastMsg.userName || lastMsg.user_name,
                      avatar: lastMsg.avatar,
                      content: lastMsg.content,
                      timestamp: lastMsg.timestamp,
                      readBy: typeof lastMsg.read_by === 'string' ? JSON.parse(lastMsg.read_by) : (lastMsg.readBy || lastMsg.read_by || [])
                  } : undefined,
                  participantDetails: ch.participantDetails || ch.participant_details,
                  unreadCount: ch.unreadCount || ch.unread_count || 0
              };
          });
          
          console.log('✅ 映射完成，第一個頻道的 lastMessage:', newChannels[0]?.lastMessage);
          
          // 總是更新頻道列表
          setChannels(newChannels);
      } catch (error) {
          console.error('loadChannels error:', error);
      }
  };

  const loadMessages = async (channelId: string, before?: string) => {
      try {
          const { messages: newMessages, hasMore } = await api.chat.getMessages(channelId, {
              limit: 50,
              before
          });
          
          if (before) {
              // 向上滾動載入更早訊息，添加到前面（去重）
              setMessages(prev => {
                  const existingIds = new Set(prev.map(m => m.id));
                  const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
                  return [...uniqueNew, ...prev];
              });
          } else {
              // 初次載入，替換所有訊息
              setMessages(newMessages);
              // 記錄最後一條訊息的時間戳用於增量更新
              if (newMessages.length > 0) {
                  setLastMessageTimestamp(newMessages[newMessages.length - 1].timestamp);
              }
          }
          
          setHasMoreMessages(hasMore);
      } catch (error) {
          console.error('loadMessages error:', error);
      }
  };

  // 載入新訊息（增量更新）
  const loadNewMessages = async (channelId: string) => {
      try {
          if (!lastMessageTimestamp) return;
          
          const { messages: newMessages } = await api.chat.getMessages(channelId, {
              after: lastMessageTimestamp
          });
          
          if (newMessages.length > 0) {
              // 去重後添加到末尾
              setMessages(prev => {
                  const existingIds = new Set(prev.map(m => m.id));
                  const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
                  const updated = [...prev, ...uniqueNew];
                  
                  // 更新快取
                  const newTimestamp = newMessages[newMessages.length - 1].timestamp;
                  messagesCacheRef.current.set(channelId, {
                      messages: updated,
                      timestamp: newTimestamp,
                      hasMore: hasMoreMessages
                  });
                  
                  return updated;
              });
              setLastMessageTimestamp(newMessages[newMessages.length - 1].timestamp);
          }
      } catch (error) {
          console.error('loadNewMessages error:', error);
      }
  };

  // 向上滾動載入更早訊息
  const loadOlderMessages = async () => {
      if (!activeChannelId || !hasMoreMessages || isLoadingMore || messages.length === 0) return;
      
      setIsLoadingMore(true);
      const oldestTimestamp = messages[0].timestamp;
      await loadMessages(activeChannelId, oldestTimestamp);
      setIsLoadingMore(false);
  };

  // --- Handlers ---
  const handleChannelClick = async (channelId: string) => {
      // 先從現有 channels 找到頻道並設為 pendingChannel
      const channelArray = Array.isArray(channels) ? channels : [];
      const channel = channelArray.find(c => c.id === channelId);
      if (channel) {
          setPendingChannel(channel);
      }
      
      setActiveChannelId(channelId);
      setSidebarMode('CHAT');
      
      // WebSocket 訂閱頻道
      if (wsClientRef.current?.isConnected()) {
          wsClientRef.current.subscribe(channelId);
          wsClientRef.current.markRead(channelId);
      }
      
      // 立即顯示快取的訊息（如果有）
      const cached = messagesCacheRef.current.get(channelId);
      if (cached) {
          setMessages(cached.messages);
          setLastMessageTimestamp(cached.timestamp);
          setHasMoreMessages(cached.hasMore);
      } else {
          setMessages([]);
          setIsLoadingChannel(true);
      }
      
      // 背景載入新訊息
      try {
          // 並行執行 markRead 和 loadMessages
          api.chat.markRead(channelId, currentUser.id).catch(() => {});
          
          const { messages: newMessages, hasMore } = await api.chat.getMessages(channelId, { limit: 50 });
          setMessages(newMessages);
          setHasMoreMessages(hasMore);
          
          const newTimestamp = newMessages.length > 0 ? newMessages[newMessages.length - 1].timestamp : null;
          setLastMessageTimestamp(newTimestamp);
          
          // 更新快取
          messagesCacheRef.current.set(channelId, {
              messages: newMessages,
              timestamp: newTimestamp,
              hasMore
          });
          
          // 背景更新頻道列表
          loadChannels();
      } catch (error) {
          // Silent fail
      } finally {
          setIsLoadingChannel(false);
      }
  };
  
  // 預載頻道訊息（滑鼠懸停時觸發）
  const prefetchChannel = async (channelId: string) => {
      // 已有快取或正在預載則跳過
      if (messagesCacheRef.current.has(channelId) || prefetchingRef.current.has(channelId)) return;
      
      prefetchingRef.current.add(channelId);
      try {
          const { messages: newMessages, hasMore } = await api.chat.getMessages(channelId, { limit: 50 });
          const newTimestamp = newMessages.length > 0 ? newMessages[newMessages.length - 1].timestamp : null;
          messagesCacheRef.current.set(channelId, { messages: newMessages, timestamp: newTimestamp, hasMore });
      } catch (error) {
          // Silent fail for prefetch
      } finally {
          prefetchingRef.current.delete(channelId);
      }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || !activeChannelId) return;
      
      const messageContent = inputValue.trim();
      const tempId = `temp-${Date.now()}`;
      
      // 樂觀更新 - 立即顯示訊息
      const optimisticMsg: ChatMessage = {
          id: tempId,
          channelId: activeChannelId,
          userId: currentUser.id,
          userName: currentUser.name,
          avatar: currentUser.avatar,
          content: messageContent,
          timestamp: new Date().toISOString(),
          readBy: [currentUser.id]
      };
      setMessages(prev => [...prev, optimisticMsg]);
      setInputValue('');
      
      try {
          // 優先使用 WebSocket 發送，失敗則使用 REST API
          if (wsClientRef.current?.isConnected()) {
              wsClientRef.current.sendMessage(activeChannelId, messageContent);
              // WebSocket 發送後，訊息會通過 NEW_MESSAGE 事件回來更新
              // 這裡不需要等待，樂觀更新已經顯示了
          } else {
              // 備用：使用 REST API
              const sentMsg = await api.chat.sendMessage(activeChannelId, currentUser.id, messageContent, currentUser);
              // 用真實訊息替換臨時訊息
              setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m));
              // 更新快取
              messagesCacheRef.current.set(activeChannelId, {
                  messages: messages.map(m => m.id === tempId ? sentMsg : m),
                  timestamp: sentMsg.timestamp,
                  hasMore: hasMoreMessages
              });
          }
      } catch (error) {
          // 發送失敗，移除臨時訊息
          setMessages(prev => prev.filter(m => m.id !== tempId));
          toast.error('發送訊息失敗，請重試');
      }
  };

  const handleBackToChannels = () => {
      setActiveChannelId(null);
  };
  
  // 收回訊息
  const handleRecallMessage = async (messageId: string) => {
      if (!activeChannelId) return;
      setLongPressMenuId(null); // 關閉長按選單
      
      // 樂觀更新 - 立即顯示已收回
      setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, content: '[RECALLED]' } : m
      ));
      
      try {
          await api.chat.recallMessage(activeChannelId, messageId);
          // 更新快取
          messagesCacheRef.current.set(activeChannelId, {
              messages: messages.map(m => m.id === messageId ? { ...m, content: '[RECALLED]' } : m),
              timestamp: lastMessageTimestamp,
              hasMore: hasMoreMessages
          });
      } catch (error) {
          // 失敗則恢復原訊息
          loadMessages(activeChannelId);
          toast.error('收回訊息失敗');
      }
  };
  
  // 長按開始（手機版）
  const handleTouchStart = (msgId: string, isMe: boolean, content: string) => {
      if (!isMe || content === '[RECALLED]' || msgId.startsWith('temp-')) return;
      longPressTimerRef.current = setTimeout(() => {
          setLongPressMenuId(msgId);
          // 震動反饋（如果支援）
          if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
  };
  
  // 長按結束
  const handleTouchEnd = () => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };

  // 檔案上傳處理
  const [isUploading, setIsUploading] = useState(false);
  
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
              
              // 圖片發送 Base64，檔案發送名稱
              const content = isImage 
                  ? `[IMG]${base64}`
                  : `[FILE]${file.name}`;
              
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

  // --- Logic: Open Communication (No Hierarchy Restrictions) ---
  
  const isHiddenContact = (targetUser: User) => {
      // Only hide self from contact list
      return targetUser.id === currentUser.id; 
  };

  const handleContactClick = async (targetUser: User) => {
      if (targetUser.id === currentUser.id) return;
      if (processingContactId) return; // Prevent double clicks

      setProcessingContactId(targetUser.id);

      try {
        const channelArray = Array.isArray(channels) ? channels : [];
        const existingChannel = channelArray.find(c => c.type === 'DIRECT' && Array.isArray(c.participants) && c.participants.includes(targetUser.id));
        if (existingChannel) {
            handleChannelClick(existingChannel.id);
            return;
        }

        // Create Direct Channel immediately (No request flow needed)
        const newCh = await api.chat.createDirectChannel(currentUser.id, targetUser.id);
        
        // 確保 newCh 有效
        if (newCh && newCh.id) {
            // 先設置 pendingChannel，確保立即可用
            setPendingChannel(newCh);
            
            // 更新 channels 狀態
            setChannels(prev => {
                const prevArray = Array.isArray(prev) ? prev : [];
                return [...prevArray, newCh];
            });
            
            // 設置 activeChannelId
            setActiveChannelId(newCh.id);
            setSidebarMode('CHAT');
            
            // 載入訊息
            loadMessages(newCh.id);
        }
        
        // Background sync
        loadChannels();
      } catch (error) {
        console.error("Failed to create channel", error);
        toast.error('無法建立聊天室，請稍後再試');
      } finally {
        setProcessingContactId(null);
      }
  };

  // 建立群組
  const handleCreateGroup = async (groupName: string, memberIds: string[]) => {
      try {
          const allParticipants = [currentUser.id, ...memberIds];
          const newChannel = await api.chat.createGroupChannel(groupName, allParticipants);
          
          if (newChannel && newChannel.id) {
              setPendingChannel(newChannel);
              setChannels(prev => [...prev, newChannel]);
              setActiveChannelId(newChannel.id);
              setSidebarMode('CHAT');
              loadMessages(newChannel.id);
          }
          
          loadChannels();
      } catch (error) {
          console.error("Failed to create group", error);
          toast.error('無法建立群組，請稍後再試');
      }
  };

  // 離開群組
  const handleLeaveGroup = async () => {
      if (!activeChannelId) return;
      const leavingChannelId = activeChannelId;
      try {
          await api.chat.leaveChannel(leavingChannelId);
          
          // 清理所有相關狀態
          setChannels(prev => prev.filter(c => c.id !== leavingChannelId));
          setActiveChannelId(null);
          setMessages([]);
          setLastMessageTimestamp(null);
          setHasMoreMessages(false);
          
          // 清理快取
          messagesCacheRef.current.delete(leavingChannelId);
          
          // 關閉群組資訊視窗
          setShowGroupInfoModal(false);
          
          // 重新載入頻道列表
          loadChannels();
          
          toast.success('已成功離開群組');
      } catch (error) {
          console.error("Failed to leave group", error);
          toast.error('無法離開群組，請稍後再試');
      }
  };

  // 編輯群組
  const handleEditGroup = async (newName: string, newMembers: string[]) => {
      if (!activeChannelId) return;
      try {
          // 調用後端 API 保存修改
          await api.chat.editChannel(activeChannelId, newName, newMembers);
          
          // 更新本地狀態
          setChannels(prev => prev.map(c => 
              c.id === activeChannelId 
                  ? { ...c, name: newName, participants: newMembers }
                  : c
          ));
          
          // 重新載入頻道列表以獲取最新資料
          loadChannels();
          
          toast.success('群組已成功更新');
      } catch (error) {
          console.error("Failed to edit group", error);
          toast.error('無法編輯群組，請稍後再試');
      }
  };

  // 使用 ref 追踪 isLoadingMore 狀態，避免閉包問題
  const isLoadingMoreRef = useRef(isLoadingMore);
  isLoadingMoreRef.current = isLoadingMore;
  
  const hasMoreRef = useRef(hasMoreMessages);
  hasMoreRef.current = hasMoreMessages;

  // 向上滾動監聽器 - 載入更早訊息
  useEffect(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const handleScroll = () => {
          // 當滾動到頂部時載入更早訊息
          if (container.scrollTop < 100 && !isLoadingMoreRef.current && hasMoreRef.current) {
              loadOlderMessages();
          }
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
  }, [activeChannelId]);

  // 自動滾動到底部（僅在新訊息時，不在載入更早訊息時）
  useEffect(() => {
      if (!messagesContainerRef.current || messages.length === 0) return;
      
      const currentLastMessageId = messages[messages.length - 1]?.id;
      const previousLastMessageId = lastMessageIdRef.current;
      
      // 只有當最後一條訊息 ID 改變時才滾動（表示有新訊息）
      // 或者切換頻道時（previousLastMessageId 為 null）
      if (currentLastMessageId !== previousLastMessageId) {
          lastMessageIdRef.current = currentLastMessageId;
          
          // 如果是載入更早訊息（isLoadingMore），不滾動
          if (!isLoadingMore) {
              const { scrollHeight, clientHeight } = messagesContainerRef.current;
              if (scrollHeight > clientHeight) {
                  // 直接跳到底部，不使用平滑滾動避免視覺干擾
                  messagesContainerRef.current.scrollTop = scrollHeight;
              }
          }
      }
  }, [messages, isLoadingMore]);
  
  // 切換頻道時重置 lastMessageIdRef
  useEffect(() => {
      lastMessageIdRef.current = null;
  }, [activeChannelId]);

  const getChannelName = (ch: ChatChannel) => {
      if (ch.type === 'DEPARTMENT' || ch.type === 'GROUP') return ch.name;
      
      // 優先使用 participantDetails（後端已經提供完整用戶資料）
      if ((ch as any).participantDetails && Array.isArray((ch as any).participantDetails)) {
          const otherUser = (ch as any).participantDetails.find((p: any) => p.id !== currentUser.id);
          if (otherUser) return otherUser.name;
      }
      
      // Fallback: 從 users 列表查找
      const participants = Array.isArray(ch.participants) ? ch.participants : [];
      const otherId = participants.find(p => p !== currentUser.id);
      const userArray = Array.isArray(users) ? users : [];
      const otherUser = userArray.find(u => u.id === otherId);
      
      return otherUser ? otherUser.name : '未知用戶';
  };

  const getChannelAvatar = (ch: ChatChannel) => {
      if (ch.type === 'DEPARTMENT') return '🏢';
      
      // 優先使用 participantDetails
      if ((ch as any).participantDetails && Array.isArray((ch as any).participantDetails)) {
          const otherUser = (ch as any).participantDetails.find((p: any) => p.id !== currentUser.id);
          if (otherUser?.avatar) return <img src={otherUser.avatar} className="w-full h-full object-cover" />;
      }
      
      // Fallback: 從 users 列表查找
      const participants = Array.isArray(ch.participants) ? ch.participants : [];
      const otherId = participants.find(p => p !== currentUser.id);
      const userArray = Array.isArray(users) ? users : [];
      const otherUser = userArray.find(u => u.id === otherId);
      return <img src={otherUser?.avatar} className="w-full h-full object-cover" />;
  };

  // Find the active channel object safely
  const channelsArray = Array.isArray(channels) ? channels : [];
  
  // 優先使用 pendingChannel（解決新建頻道時狀態更新延遲問題）
  let activeChannel: ChatChannel | null | undefined = null;
  if (pendingChannel && pendingChannel.id === activeChannelId) {
      activeChannel = pendingChannel;
  } else if (activeChannelId) {
      activeChannel = channelsArray.find(c => c.id === activeChannelId);
  }
  
  // 當頻道已在 channels 中時，清除 pendingChannel
  useEffect(() => {
      if (pendingChannel && channelsArray.some(c => c.id === pendingChannel.id)) {
          setPendingChannel(null);
      }
  }, [channelsArray, pendingChannel]);

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in relative">
       
       {/* 
          SIDEBAR (CHANNEL LIST) 
          - Mobile: Hidden if a channel is active
          - Desktop: Always visible (w-80)
       */}
       <div className={`w-full md:w-80 bg-slate-50 border-r border-slate-200 flex-col ${activeChannelId ? 'hidden md:flex' : 'flex'}`}>
           {/* Sidebar Tabs */}
           <div className="flex border-b border-slate-200 flex-shrink-0">
               <button 
                 onClick={() => setSidebarMode('CHAT')}
                 className={`flex-1 py-3 text-sm font-bold transition flex justify-center items-center gap-2 ${sidebarMode === 'CHAT' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:bg-slate-100'}`}
               >
                   <div className="relative">
                       <span>💬</span>
                       {/* Global Unread Dot on Tab */}
                       {channelsArray.some(c => (c.unreadCount || 0) > 0) && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
                   </div>
                   聊天列表
               </button>
               <button 
                 onClick={() => setSidebarMode('CONTACTS')}
                 className={`flex-1 py-3 text-sm font-bold transition flex justify-center items-center gap-2 ${sidebarMode === 'CONTACTS' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:bg-slate-100'}`}
               >
                   <span>👥</span> 通訊錄
               </button>
           </div>

           {/* Content Area */}
           <div className="flex-1 overflow-y-auto">
               
               {/* --- CHAT LIST --- */}
               {sidebarMode === 'CHAT' && (
                   <div className="p-2 space-y-1">
                       {channelsArray.length === 0 && (
                           <div className="p-4 text-center text-slate-400 text-sm mt-4">
                               尚無聊天記錄，<br/>請切換至通訊錄發起對話。
                           </div>
                       )}
                       {channelsArray.map(ch => (
                           <button 
                             key={ch.id}
                             onClick={() => handleChannelClick(ch.id)}
                             onMouseEnter={() => prefetchChannel(ch.id)}
                             className={`w-full p-3 rounded-xl flex items-center gap-3 transition relative border border-transparent ${activeChannelId === ch.id ? 'bg-blue-100' : 'hover:bg-slate-100 hover:border-slate-200'}`}
                           >
                               <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-300">
                                   {getChannelAvatar(ch)}
                               </div>
                               <div className="flex-1 min-w-0 text-left">
                                   <div className="flex justify-between items-center">
                                      <h4 className={`font-bold truncate text-sm ${(ch.unreadCount || 0) > 0 ? 'text-slate-900' : 'text-slate-700'}`}>{getChannelName(ch)}</h4>
                                      <span className="text-[10px] text-slate-400">{ch.lastMessage ? ch.lastMessage.timestamp.split('T')[1].substring(0,5) : ''}</span>
                                   </div>
                                   <p className={`text-xs truncate mt-1 ${(ch.unreadCount || 0) > 0 ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                                      {ch.lastMessage ? `${ch.lastMessage.userName}: ${ch.lastMessage.content}` : '尚無訊息'}
                                   </p>
                               </div>
                               
                               {/* Unread Count Badge */}
                               {(ch.unreadCount || 0) > 0 && (
                                   <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                                       {ch.unreadCount}
                                   </div>
                               )}
                           </button>
                       ))}
                   </div>
               )}

               {/* --- CONTACTS LIST --- */}
               {sidebarMode === 'CONTACTS' && (
                   <div className="p-4 space-y-6">
                       {/* 建立群組按鈕 */}
                       <button 
                           onClick={() => setShowCreateGroupModal(true)}
                           className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition shadow-lg shadow-blue-500/30"
                       >
                           <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                               </svg>
                           </div>
                           <div className="text-left">
                               <div className="font-bold text-sm">建立群組</div>
                               <div className="text-[11px] text-blue-100">選擇成員開始群聊</div>
                           </div>
                       </button>
                       
                       {/* 無部門用戶（如初始設定的老闆帳號） */}
                       {(() => {
                           const userArray = Array.isArray(users) ? users : [];
                           const deptIds = (Array.isArray(departments) ? departments : []).map(d => d.id);
                           const noDeptUsers = userArray.filter(u => (!u.department || !deptIds.includes(u.department)) && !isHiddenContact(u));
                           if (noDeptUsers.length === 0) return null;
                           const isCollapsed = collapsedDepts.has('__no_dept__');
                           const toggleCollapse = () => {
                               setCollapsedDepts(prev => {
                                   const next = new Set(prev);
                                   if (next.has('__no_dept__')) {
                                       next.delete('__no_dept__');
                                   } else {
                                       next.add('__no_dept__');
                                   }
                                   return next;
                               });
                           };
                           return (
                               <div>
                                   <button 
                                       onClick={toggleCollapse}
                                       className="w-full flex items-center justify-between text-xs font-bold text-amber-600 uppercase mb-2 pl-2 pr-1 py-1 border-l-2 border-amber-400 hover:bg-amber-50 rounded-r transition"
                                   >
                                       <span>👑 管理層 ({noDeptUsers.length})</span>
                                       <svg className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                       </svg>
                                   </button>
                                   {!isCollapsed && (
                                       <div className="space-y-2">
                                           {noDeptUsers.map(u => (
                                               <button 
                                                 key={u.id}
                                                 onClick={() => handleContactClick(u)}
                                                 disabled={!!processingContactId}
                                                 className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition border border-transparent hover:border-slate-200 ${processingContactId === u.id ? 'bg-slate-50 cursor-wait' : ''}`}
                                               >
                                                   <div className="relative">
                                                      <img src={u.avatar} className={`w-10 h-10 rounded-full border border-slate-200 ${processingContactId === u.id ? 'opacity-50' : ''}`} />
                                                      {processingContactId === u.id && (
                                                          <div className="absolute inset-0 flex items-center justify-center">
                                                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                          </div>
                                                      )}
                                                   </div>
                                                   <div className="text-left flex-1">
                                                       <div className="text-sm font-bold text-slate-700 flex justify-between items-center">
                                                           {u.name}
                                                           {processingContactId === u.id && <span className="text-[10px] text-blue-500">開啟中...</span>}
                                                       </div>
                                                       <div className="text-[10px] text-amber-500 font-bold">{u.role}</div>
                                                   </div>
                                               </button>
                                           ))}
                                       </div>
                                   )}
                               </div>
                           );
                       })()}

                       {(Array.isArray(departments) ? departments : []).map(dept => {
                           const userArray = Array.isArray(users) ? users : [];
                           // 顯示所有該部門用戶（不需要權限檢查）
                           const deptUsers = userArray.filter(u => u.department === dept.id && !isHiddenContact(u));
                           if (deptUsers.length === 0) return null;
                           const isCollapsed = collapsedDepts.has(dept.id);
                           const toggleCollapse = () => {
                               setCollapsedDepts(prev => {
                                   const next = new Set(prev);
                                   if (next.has(dept.id)) {
                                       next.delete(dept.id);
                                   } else {
                                       next.add(dept.id);
                                   }
                                   return next;
                               });
                           };
                           return (
                               <div key={dept.id}>
                                   <button 
                                       onClick={toggleCollapse}
                                       className="w-full flex items-center justify-between text-xs font-bold text-slate-500 uppercase mb-2 pl-2 pr-1 py-1 border-l-2 border-slate-300 hover:bg-slate-50 rounded-r transition"
                                   >
                                       <span>{dept.name} ({deptUsers.length})</span>
                                       <svg className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                       </svg>
                                   </button>
                                   {!isCollapsed && (
                                       <div className="space-y-2">
                                           {deptUsers.map(u => (
                                               <button 
                                                 key={u.id}
                                                 onClick={() => handleContactClick(u)}
                                                 disabled={!!processingContactId}
                                                 className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition border border-transparent hover:border-slate-200 ${processingContactId === u.id ? 'bg-slate-50 cursor-wait' : ''}`}
                                               >
                                                   <div className="relative">
                                                      <img src={u.avatar} className={`w-10 h-10 rounded-full border border-slate-200 ${processingContactId === u.id ? 'opacity-50' : ''}`} />
                                                      {processingContactId === u.id && (
                                                          <div className="absolute inset-0 flex items-center justify-center">
                                                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                          </div>
                                                      )}
                                                   </div>
                                                   <div className="text-left flex-1">
                                                       <div className="text-sm font-bold text-slate-700 flex justify-between items-center">
                                                           {u.name}
                                                           {processingContactId === u.id && <span className="text-[10px] text-blue-500">開啟中...</span>}
                                                       </div>
                                                       <div className="text-[10px] text-slate-400">{u.role}</div>
                                                   </div>
                                               </button>
                                           ))}
                                       </div>
                                   )}
                               </div>
                           );
                       })}
                   </div>
               )}
           </div>
       </div>

       {/* 
          CHAT WINDOW 
          - Mobile: Hidden if NO channel is active
          - Desktop: Always visible (flex-1)
       */}
       <div className={`flex-1 flex-col min-w-0 bg-slate-50/50 relative ${!activeChannelId ? 'hidden md:flex' : 'flex'}`}>
           {activeChannelId ? (
               activeChannel ? (
                   <>
                       {/* Header */}
                       <div className="p-3 md:p-4 bg-white border-b border-slate-200 flex items-center gap-3 shadow-sm z-10 sticky top-0">
                           {/* Mobile Back Button */}
                           <button 
                             onClick={handleBackToChannels}
                             className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full"
                           >
                               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                           </button>

                           <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                               {getChannelAvatar(activeChannel)}
                           </div>
                           <button 
                               onClick={() => activeChannel.type !== 'DIRECT' && setShowGroupInfoModal(true)}
                               className={`flex-1 min-w-0 text-left ${activeChannel.type !== 'DIRECT' ? 'hover:bg-slate-50 p-1 -m-1 rounded-lg transition' : ''}`}
                           >
                               <h3 className="font-bold text-slate-800 text-sm md:text-base truncate">{getChannelName(activeChannel)}</h3>
                               {activeChannel.type !== 'DIRECT' && (
                                   <p className="text-[10px] text-blue-500 hidden md:block flex items-center gap-1">
                                       點擊查看群組資訊 →
                                   </p>
                               )}
                           </button>
                       </div>

                       {/* Messages - Attach Ref HERE */}
                      <div 
                          ref={messagesContainerRef}
                          className="flex-1 overflow-y-auto p-4 space-y-1"
                      >
                          {/* 載入中提示 */}
                          {isLoadingChannel && messages.length === 0 && (
                              <div className="flex items-center justify-center h-32">
                                  <div className="flex items-center gap-2 text-slate-400">
                                      <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                                      <span className="text-sm">載入訊息中...</span>
                                  </div>
                              </div>
                          )}
                          {messages.map((msg, index) => {
                             // 支援多種欄位名稱格式
                             const msgUserId = msg.userId || (msg as any).user_id;
                             const isMe = msgUserId === currentUser.id;
                             const readByArray = Array.isArray(msg.readBy) ? msg.readBy : [];
                             const readCount = readByArray.filter(id => id !== msg.userId).length;
                             
                             // 判斷是否為連續訊息（同一人、間隔小於2分鐘）
                             const prevMsg = messages[index - 1];
                             const nextMsg = messages[index + 1];
                             const prevMsgUserId = prevMsg ? (prevMsg.userId || (prevMsg as any).user_id) : null;
                             const nextMsgUserId = nextMsg ? (nextMsg.userId || (nextMsg as any).user_id) : null;
                             const isSameAsPrev = prevMsgUserId === msgUserId;
                             const isSameAsNext = nextMsgUserId === msgUserId;
                             const isFirstInGroup = !isSameAsPrev;
                             const isLastInGroup = !isSameAsNext;
                             
                             // 日期分隔線
                             const msgDate = new Date(msg.timestamp).toDateString();
                             const prevMsgDate = prevMsg ? new Date(prevMsg.timestamp).toDateString() : null;
                             const showDateSeparator = !prevMsg || msgDate !== prevMsgDate;
                             
                             // 格式化日期
                             const formatDate = (dateStr: string) => {
                                 const date = new Date(dateStr);
                                 const today = new Date();
                                 const yesterday = new Date(today);
                                 yesterday.setDate(yesterday.getDate() - 1);
                                 
                                 if (date.toDateString() === today.toDateString()) return '今天';
                                 if (date.toDateString() === yesterday.toDateString()) return '昨天';
                                 return date.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' });
                             };

                             return (
                                  <React.Fragment key={msg.id}>
                                      {/* 日期分隔線 */}
                                      {showDateSeparator && (
                                          <div className="flex items-center justify-center my-4">
                                              <div className="bg-slate-200 text-slate-500 text-[11px] px-3 py-1 rounded-full font-medium">
                                                  {formatDate(msg.timestamp)}
                                              </div>
                                          </div>
                                      )}
                                      
                                      {/* 訊息 */}
                                      <div 
                                          className={`group flex gap-2 ${isMe ? 'flex-row-reverse' : ''} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'} animate-fade-in relative`}
                                          onTouchStart={() => handleTouchStart(msg.id, isMe, msg.content)}
                                          onTouchEnd={handleTouchEnd}
                                          onTouchCancel={handleTouchEnd}
                                      >
                                          {/* 長按選單（手機版） */}
                                          {longPressMenuId === msg.id && (
                                              <div 
                                                  className="absolute z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
                                                  style={{ 
                                                      top: '50%', 
                                                      transform: 'translateY(-50%)',
                                                      [isMe ? 'right' : 'left']: '100%',
                                                      marginLeft: isMe ? 0 : '8px',
                                                      marginRight: isMe ? '8px' : 0
                                                  }}
                                              >
                                                  <button
                                                      onClick={() => handleRecallMessage(msg.id)}
                                                      className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors min-w-[120px]"
                                                  >
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                                      </svg>
                                                      <span className="font-medium text-sm">收回訊息</span>
                                                  </button>
                                                  <button
                                                      onClick={() => setLongPressMenuId(null)}
                                                      className="flex items-center gap-2 px-4 py-3 text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-colors border-t border-slate-100"
                                                  >
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                      </svg>
                                                      <span className="font-medium text-sm">取消</span>
                                                  </button>
                                              </div>
                                          )}
                                          
                                          {/* 頭像 - 只在群組最後一條顯示 */}
                                          <div className="w-8 flex-shrink-0">
                                              {isLastInGroup ? (
                                                  <img src={msg.avatar} className="w-8 h-8 rounded-full border border-slate-200 shadow-sm" />
                                              ) : null}
                                          </div>
                                          
                                          {/* 收回按鈕 - 所有裝置都顯示 */}
                                          <div className="self-center flex-shrink-0">
                                              {isMe && msg.content !== '[RECALLED]' && !msg.id.startsWith('temp-') && (
                                                  <button
                                                      onClick={() => {
                                                          if (window.confirm('確定要收回這則訊息嗎？')) {
                                                              handleRecallMessage(msg.id);
                                                          }
                                                      }}
                                                      className="p-2 md:p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-100 active:bg-red-200 transition-colors border border-slate-200"
                                                      title="收回訊息"
                                                  >
                                                      <svg className="w-3.5 h-3.5 md:w-3 md:h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                      </svg>
                                                  </button>
                                              )}
                                          </div>
                                          
                                          <div className={`max-w-[75%] md:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                              {/* 名字 - 只在群組第一條顯示（非自己的訊息） */}
                                              {isFirstInGroup && !isMe && (
                                                  <span className="text-[11px] text-slate-500 mb-1 ml-1 font-medium">{msg.userName}</span>
                                              )}
                                              
                                              {/* 訊息氣泡 */}
                                              {msg.content === '[RECALLED]' ? (
                                                  // 已收回訊息
                                                  <div className={`px-3.5 py-2 text-[13px] italic rounded-2xl
                                                      ${isMe ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                                                      {isMe ? '你已收回訊息' : `${msg.userName} 已收回訊息`}
                                                  </div>
                                              ) : msg.content.startsWith('[IMG]') ? (
                                                  // 圖片訊息
                                                  <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                                                      <img 
                                                          src={msg.content.replace('[IMG]', '')} 
                                                          alt="圖片" 
                                                          className="max-w-[250px] md:max-w-[300px] max-h-[300px] object-contain cursor-pointer hover:opacity-90 transition"
                                                          onClick={() => setPreviewImage(msg.content.replace('[IMG]', ''))}
                                                      />
                                                  </div>
                                              ) : msg.content.startsWith('[FILE]') ? (
                                                  // 檔案訊息
                                                  (() => {
                                                      const fileContent = msg.content.replace('[FILE]', '');
                                                      const [fileName, fileUrl] = fileContent.includes('|') 
                                                          ? fileContent.split('|') 
                                                          : [fileContent, null];
                                                      return (
                                                          <a 
                                                              href={fileUrl || '#'} 
                                                              target="_blank" 
                                                              rel="noopener noreferrer"
                                                              download={fileName}
                                                              className={`px-3.5 py-2 text-[14px] leading-relaxed break-words shadow-sm rounded-2xl flex items-center gap-2 hover:opacity-80 transition
                                                                  ${isMe ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white border border-slate-100 text-slate-800'}`}
                                                          >
                                                              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                              </svg>
                                                              <span>{fileName}</span>
                                                              <svg className="w-4 h-4 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                                              </svg>
                                                          </a>
                                                      );
                                                  })()
                                              ) : (
                                                  // 一般文字訊息
                                                  <div className={`px-3.5 py-2 text-[14px] leading-relaxed break-words shadow-sm
                                                      ${isMe 
                                                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                                                          : 'bg-white border border-slate-100 text-slate-800'}
                                                      ${isFirstInGroup && isLastInGroup 
                                                          ? (isMe ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md')
                                                          : isFirstInGroup 
                                                              ? (isMe ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md')
                                                              : isLastInGroup
                                                                  ? (isMe ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tl-md')
                                                                  : (isMe ? 'rounded-xl rounded-r-md' : 'rounded-xl rounded-l-md')
                                                      }
                                                  `}>
                                                      {msg.content}
                                                  </div>
                                              )}
                                              
                                              {/* 時間和已讀狀態 - 只在群組最後一條顯示 */}
                                              {isLastInGroup && (
                                                  <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                                                      <span className="text-[10px] text-slate-400">
                                                          {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                      </span>
                                                      
                                                      {isMe && (
                                                        <button 
                                                           onClick={() => setReadStatusMsg(msg)}
                                                           disabled={readCount === 0}
                                                           className={`text-[10px] font-medium transition flex items-center gap-0.5 ${readCount > 0 ? 'text-blue-500 hover:text-blue-600' : 'text-slate-400'}`}
                                                        >
                                                           {readCount > 0 ? (
                                                               <>
                                                                   <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                                                                   <svg className="w-3 h-3 -ml-1.5" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                                                               </>
                                                           ) : (
                                                               <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                                                           )}
                                                        </button>
                                                      )}
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  </React.Fragment>
                              );
                          })}
                      </div>

                       {/* Input Area - Fixed at bottom */}
                       <div className="p-2 md:p-4 bg-white/90 backdrop-blur-sm border-t border-slate-100 safe-area-pb">
                           <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 md:gap-2">
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
                                   className={`w-11 h-11 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 active:scale-95
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
                                     value={inputValue}
                                     onChange={(e) => setInputValue(e.target.value)}
                                     onKeyDown={(e) => {
                                         if (e.key === 'Enter' && !e.shiftKey) {
                                             e.preventDefault();
                                             if (inputValue.trim()) {
                                                 handleSendMessage(e as any);
                                             }
                                         }
                                     }}
                                     onFocus={() => setLongPressMenuId(null)}
                                     rows={1}
                                     className="w-full px-4 py-2.5 bg-slate-100/80 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:bg-white outline-none text-slate-800 placeholder-slate-400 text-[15px] md:text-[14px] transition-all resize-none max-h-32 overflow-y-auto"
                                     placeholder="輸入訊息..."
                                     style={{ minHeight: '44px' }}
                                   />
                               </div>
                               <button 
                                  type="submit" 
                                  disabled={!inputValue.trim()}
                                  className={`w-11 h-11 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0
                                      ${inputValue.trim() 
                                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-90' 
                                          : 'bg-slate-200 text-slate-400'}`}
                               >
                                   <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                   </svg>
                               </button>
                           </form>
                       </div>
                   </>
               ) : (
                   <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                        <p className="font-bold">正在建立安全連線...</p>
                   </div>
               )
           ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 text-center">
                   <div className="text-6xl mb-4 grayscale opacity-20">💬</div>
                   <p className="font-bold text-lg text-slate-400">企業通訊</p>
                   <p className="text-sm mt-2">請從左側選擇聊天室或聯絡人</p>
               </div>
           )}
       </div>

       {/* Read Status Modal */}
       {readStatusMsg && activeChannel && (
          <ChatMessageReadStatusModal 
             isOpen={!!readStatusMsg}
             onClose={() => setReadStatusMsg(null)}
             message={readStatusMsg}
             channel={activeChannel}
             users={users}
             departments={departments}
          />
       )}

       {/* Create Group Modal */}
       <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          onCreateGroup={handleCreateGroup}
          users={users}
          currentUser={currentUser}
          departments={departments}
       />

       {/* Group Info Modal */}
       {activeChannel && activeChannel.type !== 'DIRECT' && (
          <GroupInfoModal
             isOpen={showGroupInfoModal}
             onClose={() => setShowGroupInfoModal(false)}
             channel={activeChannel}
             users={users}
             currentUser={currentUser}
             departments={departments}
             onLeaveGroup={handleLeaveGroup}
             onEditGroup={handleEditGroup}
          />
       )}

       {/* 長按選單遮罩（手機版） */}
       {longPressMenuId && (
          <div 
             className="fixed inset-0 z-40 md:hidden"
             onClick={() => setLongPressMenuId(null)}
          />
       )}

       {/* Image Preview Modal */}
       {previewImage && (
          <div 
             className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 animate-fade-in"
             onClick={() => setPreviewImage(null)}
          >
             <button 
                className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
                onClick={() => setPreviewImage(null)}
             >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
             </button>
             <img 
                src={previewImage} 
                alt="預覽圖片" 
                className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
             />
          </div>
       )}

    </div>
  );
};
