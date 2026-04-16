import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, RefreshCw, Sparkles, Zap, Check, X, AlertTriangle, Download, Brain, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { api } from '../services/api';
import { showError, showConfirm } from '../utils/dialogService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  intent?: string;
  action_taken?: string;
  action_result?: string;
  created_at: string;
}

interface AIAction {
  action: string;
  params: Record<string, any>;
  description: string;
}

interface ActionResult {
  action: string;
  description: string;
  success: boolean;
  message: string;
  reportUrl?: string;
}

interface Alert {
  type: 'warning' | 'info' | 'action';
  icon: string;
  title: string;
  detail: string;
}

interface AIAssistantViewProps {
  currentUser: any;
}

// Action level badges
const ACTION_LEVELS: Record<string, { label: string; color: string; }> = {
  CREATE_TASK: { label: '建立任務', color: 'blue' },
  UPDATE_TASK_STATUS: { label: '更新狀態', color: 'green' },
  CREATE_ANNOUNCEMENT: { label: '發布公告', color: 'blue' },
  CREATE_MEMO: { label: '新增備忘錄', color: 'green' },
  CREATE_WORK_LOG: { label: '建立日誌', color: 'green' },
  SEND_CHAT_MESSAGE: { label: '發送訊息', color: 'blue' },
  CREATE_FORUM_POST: { label: '新增提案', color: 'blue' },
  ADD_FORUM_COMMENT: { label: '提案留言', color: 'green' },
  CREATE_FINANCE_RECORD: { label: '財務紀錄', color: 'blue' },
  CREATE_LEAVE_REQUEST: { label: '申請請假', color: 'blue' },
  MARK_ANNOUNCEMENT_READ: { label: '標記已讀', color: 'green' },
  APPROVE_LEAVE: { label: '批准請假', color: 'blue' },
  REJECT_LEAVE: { label: '駁回請假', color: 'blue' },
  ASSIGN_TASK: { label: '指派任務', color: 'blue' },
  COMPLETE_TASK: { label: '完成任務', color: 'blue' },
  UPDATE_ANNOUNCEMENT: { label: '修改公告', color: 'blue' },
  DELETE_TASK: { label: '刪除任務', color: 'red' },
  DELETE_ANNOUNCEMENT: { label: '刪除公告', color: 'red' },
  MANUAL_ATTENDANCE: { label: '補出勤', color: 'blue' },
  AUTO_ASSIGN_TASK: { label: '智慧指派', color: 'purple' },
  REMIND_MISSING_WORKLOGS: { label: '提醒日誌', color: 'blue' },
  GENERATE_REPORT: { label: '生成報表', color: 'purple' },
  FLAG_OVERDUE_TASKS: { label: '標記逾期', color: 'blue' },
  ATTENDANCE_ANOMALY_ALERT: { label: '出勤異常', color: 'blue' },
};

const DANGER_ACTIONS = ['DELETE_TASK', 'DELETE_ANNOUNCEMENT'];

export default function AIAssistantView({ currentUser }: AIAssistantViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlerts, setShowAlerts] = useState(true);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<AIAction[] | null>(null);
  const [actionResults, setActionResults] = useState<ActionResult[] | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    loadAlerts();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingActions, actionResults]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const { scrollHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
    }
  };

  const loadConversations = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await api.aiAssistant.getConversations();
      setMessages(response.conversations || []);
    } catch (error) {
      console.error('載入對話歷史失敗:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await api.aiAssistant.getAlerts();
      setAlerts(response.alerts || []);
    } catch (error) {
      console.error('載入提醒失敗:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setPendingActions(null);
    setPendingActionId(null);
    setActionResults(null);

    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      message: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await api.aiAssistant.sendQuery(userMessage);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: response.response,
        intent: response.intent,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMsg]);

      // Handle pending actions (needs confirmation)
      if (response.pendingActionId && response.actions) {
        setPendingActionId(response.pendingActionId);
        setPendingActions(response.actions);
      }

      // Handle direct action results
      if (response.actionResults) {
        setActionResults(response.actionResults);
      }

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

  const handleConfirmActions = async () => {
    if (!pendingActionId || isConfirming) return;
    setIsConfirming(true);

    try {
      const response = await api.aiAssistant.confirmAction(pendingActionId);
      setActionResults(response.results);
      setPendingActions(null);
      setPendingActionId(null);

      // Reload conversations to get the result message
      await loadConversations();
    } catch (error: any) {
      console.error('確認操作失敗:', error);
      showError(error.message || '操作執行失敗');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelActions = async () => {
    if (!pendingActionId) return;

    try {
      await api.aiAssistant.cancelAction(pendingActionId);
      setPendingActions(null);
      setPendingActionId(null);

      const cancelMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        message: '已取消操作。',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, cancelMsg]);
    } catch (error) {
      console.error('取消操作失敗:', error);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!(await showConfirm('確定要刪除這條對話嗎？'))) return;
    try {
      await api.aiAssistant.deleteConversation(id);
      setMessages(prev => prev.filter(msg => msg.id !== id));
    } catch (error) {
      console.error('刪除對話失敗:', error);
      showError('刪除失敗');
    }
  };

  const handleClearAll = async () => {
    if (!(await showConfirm('確定要清空所有對話記錄嗎？此操作無法撤銷。'))) return;
    try {
      await api.aiAssistant.clearConversations();
      setMessages([]);
    } catch (error) {
      console.error('清空對話失敗:', error);
      showError('清空失敗');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const allowedRoles = ['BOSS', 'MANAGER', 'SUPERVISOR'];
  if (!allowedRoles.includes(currentUser.role)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">AI 助理</h2>
          <p className="text-gray-500">此功能僅限主管以上使用</p>
        </div>
      </div>
    );
  }

  const getActionColor = (action: string) => {
    const def = ACTION_LEVELS[action];
    if (!def) return 'gray';
    return def.color;
  };

  const getActionLabel = (action: string) => {
    const def = ACTION_LEVELS[action];
    return def?.label || action;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">AI 智能助理</h1>
            <div className="flex items-center gap-2 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="uppercase tracking-wide">Consultant v4.0</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAlerts} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="重新載入提醒">
            <Brain className="w-5 h-5" />
          </button>
          <button onClick={loadConversations} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="重新載入">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={handleClearAll} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="清空所有對話">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
              <p className="text-gray-500">載入對話歷史...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Welcome card */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 text-center mb-4">
              <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full mb-4 uppercase tracking-wide">
                Consultant V4.0 — Enhanced AI
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                您好，{currentUser.name}
              </h2>
              <p className="text-gray-600 text-sm mb-3">
                我是您的專屬企業管理顧問。我可以查詢資料、執行操作、生成報表，並記住您的偏好。
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">建立任務</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">發布公告</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">生成報表</span>
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full">審核請假</span>
                <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full">智慧指派</span>
                <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full">出勤分析</span>
              </div>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setShowAlerts(!showAlerts)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2 hover:text-indigo-600 transition"
                >
                  <Shield className="w-4 h-4" />
                  智慧提醒 ({alerts.length})
                  {showAlerts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showAlerts && (
                  <div className="space-y-2">
                    {alerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-sm flex items-start gap-3 ${
                          alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                          alert.type === 'action' ? 'bg-blue-50 border-blue-200' :
                          'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <span className="text-lg flex-shrink-0">{alert.icon}</span>
                        <div>
                          <div className="font-semibold text-gray-800">{alert.title}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{alert.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                開始對話，詢問我任何關於公司管理的問題，或要求我執行操作
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="max-w-[85%]">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">AI Assistant</span>
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm group relative">
                        <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {formatMessage(msg.message)}
                        </div>

                        {/* Action result badges */}
                        {msg.action_result && (() => {
                          try {
                            const results = JSON.parse(msg.action_result);
                            if (Array.isArray(results)) {
                              return (
                                <div className="mt-3 space-y-1">
                                  {results.map((r: any, i: number) => (
                                    <div key={i} className={`flex items-center gap-2 text-xs p-1.5 rounded-lg ${r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                      {r.success ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                      <span>{r.description || r.action}: {r.message}</span>
                                      {r.reportUrl && (
                                        <a href={r.reportUrl} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-indigo-600 hover:text-indigo-800">
                                          <Download className="w-3 h-3" /> PDF
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                          } catch {}
                          return null;
                        })()}

                        <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                          <span>{new Date(msg.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[85%]">
                      <div className="bg-gray-200 rounded-2xl rounded-tr-sm px-4 py-3 group relative">
                        <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                        <div className="text-xs text-gray-500 mt-2 text-right flex items-center justify-end gap-2">
                          <span>{new Date(msg.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Pending actions confirmation card */}
            {pendingActions && pendingActions.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-200 p-4 mx-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-gray-800">確認執行以下操作</span>
                </div>

                <div className="space-y-2 mb-4">
                  {pendingActions.map((action, idx) => {
                    const isDanger = DANGER_ACTIONS.includes(action.action);
                    const color = getActionColor(action.action);
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border ${isDanger ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            color === 'red' ? 'bg-red-100 text-red-700' :
                            color === 'purple' ? 'bg-purple-100 text-purple-700' :
                            color === 'green' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {getActionLabel(action.action)}
                          </span>
                          <span className="text-sm text-gray-700">{action.description}</span>
                        </div>
                        {isDanger && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span>此為危險操作，執行後無法撤銷</span>
                          </div>
                        )}
                        {/* Show params */}
                        <div className="mt-1.5 text-xs text-gray-500">
                          {Object.entries(action.params).map(([key, val]) => (
                            <span key={key} className="mr-3">{key}: <span className="text-gray-700 font-medium">{String(val)}</span></span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancelActions}
                    className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-bold"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmActions}
                    disabled={isConfirming}
                    className={`px-4 py-2 text-sm text-white rounded-lg transition font-bold flex items-center gap-2 ${
                      pendingActions.some(a => DANGER_ACTIONS.includes(a.action))
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    } disabled:opacity-50`}
                  >
                    {isConfirming ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> 執行中...</>
                    ) : (
                      <><Check className="w-4 h-4" /> 確認執行 ({pendingActions.length} 個操作)</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Direct action results */}
            {actionResults && !pendingActions && (
              <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-4 mx-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-gray-800 text-sm">操作已執行</span>
                </div>
                <div className="space-y-1">
                  {actionResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm p-2 rounded-lg ${r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {r.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      <span>{r.message}</span>
                      {r.reportUrl && (
                        <a href={r.reportUrl} target="_blank" rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition text-xs font-bold"
                        >
                          <Download className="w-3 h-3" /> 下載 PDF
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">AI Assistant</span>
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs text-gray-400">思考中...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="輸入指令或問題... (例：「幫我建一個任務給王小明」「給我這週報表分析」)"
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
          AI 助理可以執行操作（建立任務、發公告等）、生成 PDF 報表、並記住您的偏好
        </p>
      </div>
    </div>
  );
}

// Helper: format message with basic markdown-like styling
function formatMessage(text: string): React.ReactNode {
  if (!text) return null;

  // Split into lines and process
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    // Bold: **text**
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const lineElements = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<div key={i} className="font-bold text-base mt-3 mb-1">{line.slice(4)}</div>);
    } else if (line.startsWith('## ')) {
      elements.push(<div key={i} className="font-bold text-lg mt-3 mb-1">{line.slice(3)}</div>);
    } else if (line.startsWith('# ')) {
      elements.push(<div key={i} className="font-bold text-xl mt-3 mb-1">{line.slice(2)}</div>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(<div key={i} className="pl-3 flex gap-1"><span>•</span><span>{lineElements}</span></div>);
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(<div key={i} className="pl-3">{lineElements}</div>);
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<div key={i}>{lineElements}</div>);
    }
  });

  return <>{elements}</>;
}
