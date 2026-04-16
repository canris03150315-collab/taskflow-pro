import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface MiniChatWindowProps {
  currentUser: User;
  targetUserId: string;
  targetUserName: string;
  channelId: string | null;
  position: number;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
}

export const MiniChatWindow: React.FC<MiniChatWindowProps> = ({
  currentUser,
  targetUserId,
  targetUserName,
  channelId,
  position,
  onClose,
  onMinimize,
  isMinimized
}) => {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(channelId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 計算視窗位置（從右下角開始，每個視窗間隔 20px）
  const windowWidth = 320;
  const windowSpacing = 20;
  const rightOffset = 96 + (position * (windowWidth + windowSpacing));

  useEffect(() => {
    loadMessages();
  }, [targetUserId, activeChannelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      let cid = activeChannelId;
      
      if (!cid) {
        const channels = await api.chat.getChannels(currentUser.id);
        const existingChannel = channels.find((ch: any) => 
          ch.type === 'DIRECT' && 
          ch.participants.includes(currentUser.id) && 
          ch.participants.includes(targetUserId)
        );
        
        if (existingChannel) {
          cid = existingChannel.id;
          setActiveChannelId(cid);
        } else {
          const newChannel = await api.chat.createDirectChannel(currentUser.id, targetUserId);
          cid = newChannel.id;
          setActiveChannelId(cid);
        }
      }
      
      if (cid) {
        const result = await api.chat.getMessages(cid);
        setMessages(result.messages);
      }
    } catch (error) {
      console.error('載入訊息失敗:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannelId || isSending) return;

    setIsSending(true);
    try {
      await api.chat.sendMessage(activeChannelId, currentUser.id, newMessage.trim(), currentUser);
      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('發送訊息失敗:', error);
      toast.error('發送訊息失敗');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  };

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-6 bg-white rounded-t-xl shadow-xl border border-slate-200 overflow-hidden z-30 cursor-pointer hover:shadow-2xl transition"
        style={{ right: `${rightOffset}px`, width: `${windowWidth}px` }}
        onClick={onMinimize}
      >
        <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {targetUserName.charAt(0)}
            </div>
            <span className="font-bold text-sm truncate">{targetUserName}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-6 bg-white rounded-t-xl shadow-2xl border border-slate-200 overflow-hidden z-30"
      style={{ right: `${rightOffset}px`, width: `${windowWidth}px`, height: '480px' }}
    >
      {/* 標題列 */}
      <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {targetUserName.charAt(0)}
          </div>
          <span className="font-bold text-sm truncate">{targetUserName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center"
            title="最小化"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center"
            title="關閉"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 訊息區域 */}
      <div className="h-[360px] overflow-y-auto p-4 bg-slate-50 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">開始對話</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUser.id;
            const isImage = msg.content.startsWith('[IMG]');
            const isFile = msg.content.startsWith('[FILE]');
            const imageUrl = isImage ? msg.content.replace('[IMG]', '') : '';
            
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${isMe ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`${isImage || isFile ? 'p-1' : 'px-3 py-2'} rounded-2xl ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                    }`}
                  >
                    {isImage && imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="圖片訊息"
                        className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition"
                        style={{ maxHeight: '200px' }}
                        onClick={() => window.open(imageUrl, '_blank')}
                      />
                    ) : isFile ? (
                      <div className="px-2 py-1">
                        <p className="text-sm">📎 檔案</p>
                      </div>
                    ) : (
                      <p className="text-sm break-words">{msg.content}</p>
                    )}
                  </div>
                  <p className={`text-xs text-slate-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 輸入區域 */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="輸入訊息..."
            disabled={isSending}
            className="flex-1 px-3 py-2 bg-slate-100 text-slate-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSending ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
