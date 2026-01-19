import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, RefreshCw, Sparkles, MessageSquare } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 載入對話歷史
  useEffect(() => {
    loadConversations();
  }, []);

  // 自動滾動到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await api.aiAssistant.getConversations();
      setMessages(response.conversations.reverse());
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
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* 標題列 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">AI 智能助理</h1>
            <p className="text-sm text-gray-500">您的專屬企業管理顧問</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadConversations}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="重新載入"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleClearAll}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="清空所有對話"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 對話區域 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-gray-500">載入對話歷史...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">開始對話</h3>
              <p className="text-gray-500 mb-4">
                您可以詢問我任何關於公司管理的問題，例如：
              </p>
              <div className="text-left space-y-2 text-sm text-gray-600">
                <p>• 「本月的出勤狀況如何？」</p>
                <p>• 「幫我創建一個任務給 Se7en」</p>
                <p>• 「財務報表摘要」</p>
                <p>• 「哪些任務逾期了？」</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    {msg.intent && (
                      <div className="mt-2 text-xs opacity-75">
                        意圖: {msg.intent}
                      </div>
                    )}
                    {msg.action_taken && (
                      <div className="mt-1 text-xs opacity-75">
                        動作: {msg.action_taken}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/20 rounded transition-all"
                      title="刪除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleString('zh-TW')}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 輸入區域 */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="輸入您的問題或指令... (Shift+Enter 換行)"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                處理中...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                發送
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 提示：AI 助理會從對話歷史中學習，記住您的偏好和公司業務規則
        </p>
      </div>
    </div>
  );
}
