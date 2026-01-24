import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, RefreshCw, Sparkles, MessageSquare, Zap, Paperclip } from 'lucide-react';
import { api } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  intent?: string;
  action_taken?: string;
  action_result?: string;
  created_at: string;
}

interface AIAssistantViewProps {
  currentUser: any;
}

export default function AIAssistantView({ currentUser }: AIAssistantViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 載入對話歷史
  useEffect(() => {
    loadConversations();
  }, []);

  // 自動滾動到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTo({
        top: scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const loadConversations = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await api.aiAssistant.getConversations();
      setMessages(response.conversations);
    } catch (error) {
      console.error('載入對話歷史失敗:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // 立即顯示用戶訊息
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      message: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await api.aiAssistant.sendQuery(userMessage);
      
      // 添加 AI 回應
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: response.response,
        intent: response.intent,
        action_taken: response.actionTaken,
        action_result: response.actionResult ? JSON.stringify(response.actionResult) : undefined,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.error('發送訊息失敗:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: `抱歉，發生錯誤：${error.message || '無法連接到 AI 助理'}`,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('確定要刪除這條對話嗎？')) return;

    try {
      await api.aiAssistant.deleteConversation(id);
      setMessages(prev => prev.filter(msg => msg.id !== id));
    } catch (error) {
      console.error('刪除對話失敗:', error);
      alert('刪除失敗，請稍後再試');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('確定要清空所有對話記錄嗎？此操作無法撤銷。')) return;

    try {
      await api.aiAssistant.clearConversations();
      setMessages([]);
    } catch (error) {
      console.error('清空對話失敗:', error);
      alert('清空失敗，請稍後再試');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (currentUser.role !== 'BOSS') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">AI 助理</h2>
          <p className="text-gray-500">此功能僅限老闆使用</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 簡潔的頂部標題 */}
      <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">AI 智能助理</h1>
            <div className="flex items-center gap-2 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="uppercase tracking-wide">Connected</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadConversations}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="重新載入"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleClearAll}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="清空所有對話"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 對話區域 */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
              <p className="text-gray-500">載入對話歷史...</p>
            </div>
          </div>
        ) : (
          <>
            {/* 歡迎卡片 */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 text-center mb-6">
              <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full mb-4 uppercase tracking-wide">
                Consultant V3.9.0
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                您好，{currentUser.name}
              </h2>
              <p className="text-gray-600 text-sm">
                我是您的專屬企業管理顧問，隨時為您效勞。
              </p>
            </div>

            {/* 對話訊息 */}
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                開始對話，詢問我任何關於公司管理的問題
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="max-w-[85%]">
                      {/* AI 標籤 */}
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          AI Assistant
                        </span>
                      </div>
                      {/* AI 訊息氣泡 */}
                      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                        {/* 快捷按鈕（如果有 action_taken） */}
                        {msg.action_taken && (
                          <div className="flex gap-2 mt-3">
                            <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition-colors">
                              查看儀表板
                            </button>
                            <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition-colors">
                              任務列表
                            </button>
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                          {new Date(msg.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[85%]">
                      {/* 用戶訊息氣泡 */}
                      <div className="bg-gray-200 rounded-2xl rounded-tr-sm px-4 py-3">
                        <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                        <div className="text-xs text-gray-500 mt-2 text-right">
                          {new Date(msg.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* 輸入區域 */}
      <div className="bg-white border-t border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="附件"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="輸入您的問題或指令..."
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          提示：AI 助理會從對話歷史中學習，記住您的偏好和公司業務規則
        </p>
      </div>
    </div>
  );
}
