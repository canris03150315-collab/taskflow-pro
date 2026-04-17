import React, { useState, useEffect, useRef } from 'react';
import { User, Memo, MemoTodo } from '../types';
import { EmptyState } from './EmptyState';
import { api } from '../services/api';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/dialogService';

interface MemoViewProps {
  currentUser: User;
}

export const MemoView: React.FC<MemoViewProps> = ({ currentUser }) => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [createType, setCreateType] = useState<'TEXT' | 'CHECKLIST'>('TEXT');
  const [textContent, setTextContent] = useState('');
  const [selectedColor, setSelectedColor] = useState<Memo['color']>('yellow');

  // Checklist Form State - 快速新增模式
  const [quickTodoInput, setQuickTodoInput] = useState('');

  // 編輯狀態
  const [editingTodo, setEditingTodo] = useState<{ memoId: string; todoId: string } | null>(null);
  const [editingText, setEditingText] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // 文字筆記編輯狀態
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editingMemoContent, setEditingMemoContent] = useState('');
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 便條內新增項目的輸入狀態
  const [memoInputs, setMemoInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    loadMemos();
  }, [currentUser]);

  useEffect(() => {
    if (editingTodo && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTodo]);

  useEffect(() => {
    if (editingMemoId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.select();
    }
  }, [editingMemoId]);

  const loadMemos = async () => {
    setIsLoading(true);
    const data = await api.memos.getAll(currentUser.id);
    setMemos(data);
    setIsLoading(false);
  };

  // 快速新增待辦 - 直接建立新便條
  const handleQuickAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTodoInput.trim()) return;

    const newMemo: Memo = {
      id: `memo-${Date.now()}`,
      userId: currentUser.id,
      type: 'CHECKLIST',
      todos: [{ id: `t-${Date.now()}`, text: quickTodoInput.trim(), isCompleted: false }],
      color: selectedColor,
      createdAt: new Date().toISOString(),
    };

    try {
      const createdMemo = await api.memos.create(newMemo);
      setMemos([createdMemo, ...memos]);
      setQuickTodoInput('');
    } catch (error) {
      console.error('新增備忘錄失敗:', error);
      showError('新增失敗，請稍後再試');
    }
  };

  // 建立文字筆記
  const handleCreateText = async () => {
    if (!textContent.trim()) return;

    const newMemo: Memo = {
      id: `memo-${Date.now()}`,
      userId: currentUser.id,
      type: 'TEXT',
      content: textContent,
      color: selectedColor,
      createdAt: new Date().toISOString(),
    };

    try {
      const createdMemo = await api.memos.create(newMemo);
      setMemos([createdMemo, ...memos]);
      setTextContent('');
    } catch (error) {
      console.error('新增備忘錄失敗:', error);
      showError('新增失敗，請稍後再試');
    }
  };

  // 在現有便條上追加項目
  const handleAddTodoToMemo = async (memoId: string) => {
    const inputText = memoInputs[memoId]?.trim();
    if (!inputText) return;

    const updatedMemos = memos.map((m) => {
      if (m.id === memoId && m.todos) {
        return {
          ...m,
          todos: [...m.todos, { id: `t-${Date.now()}`, text: inputText, isCompleted: false }],
        };
      }
      return m;
    });
    setMemos(updatedMemos);
    setMemoInputs({ ...memoInputs, [memoId]: '' });

    const targetMemo = updatedMemos.find((m) => m.id === memoId);
    if (targetMemo) {
      await api.memos.update(targetMemo);
    }
  };

  const handleDelete = async (id: string) => {
    if (await showConfirm('確定要刪除這張便條嗎？')) {
      try {
        await api.memos.delete(id);
        setMemos(memos.filter((m) => m.id !== id));
      } catch (error) {
        console.error('刪除備忘錄失敗:', error);
        showError('刪除失敗，請稍後再試');
      }
    }
  };

  // 刪除單一待辦項目
  const handleDeleteTodo = async (memoId: string, todoId: string) => {
    const memo = memos.find((m) => m.id === memoId);
    if (!memo || !memo.todos) return;

    // 如果只剩一個項目，詢問是否刪除整張便條
    if (memo.todos.length === 1) {
      if (await showConfirm('這是最後一個項目，要刪除整張便條嗎？')) {
        await api.memos.delete(memoId);
        setMemos(memos.filter((m) => m.id !== memoId));
      }
      return;
    }

    const updatedMemos = memos.map((m) => {
      if (m.id === memoId && m.todos) {
        return { ...m, todos: m.todos.filter((t) => t.id !== todoId) };
      }
      return m;
    });
    setMemos(updatedMemos);

    const targetMemo = updatedMemos.find((m) => m.id === memoId);
    if (targetMemo) {
      await api.memos.update(targetMemo);
    }
  };

  const handleToggleTodo = async (memoId: string, todoId: string) => {
    if (editingTodo) return; // 編輯中不切換狀態

    const updatedMemos = memos.map((m) => {
      if (m.id === memoId && m.todos) {
        return {
          ...m,
          todos: m.todos.map((t) => (t.id === todoId ? { ...t, isCompleted: !t.isCompleted } : t)),
        };
      }
      return m;
    });
    setMemos(updatedMemos);

    const targetMemo = updatedMemos.find((m) => m.id === memoId);
    if (targetMemo) {
      await api.memos.update(targetMemo);
    }
  };

  // 開始編輯待辦項目
  const startEditTodo = (memoId: string, todoId: string, currentText: string) => {
    setEditingTodo({ memoId, todoId });
    setEditingText(currentText);
  };

  // 儲存編輯
  const saveEditTodo = async () => {
    if (!editingTodo || !editingText.trim()) {
      setEditingTodo(null);
      return;
    }

    const updatedMemos = memos.map((m) => {
      if (m.id === editingTodo.memoId && m.todos) {
        return {
          ...m,
          todos: m.todos.map((t) =>
            t.id === editingTodo.todoId ? { ...t, text: editingText.trim() } : t
          ),
        };
      }
      return m;
    });
    setMemos(updatedMemos);
    setEditingTodo(null);

    const targetMemo = updatedMemos.find((m) => m.id === editingTodo.memoId);
    if (targetMemo) {
      await api.memos.update(targetMemo);
    }
  };

  // 開始編輯文字筆記
  const startEditMemo = (memoId: string, currentContent: string) => {
    setEditingMemoId(memoId);
    setEditingMemoContent(currentContent);
  };

  // 儲存文字筆記編輯
  const saveEditMemo = async () => {
    if (!editingMemoId || !editingMemoContent.trim()) {
      setEditingMemoId(null);
      return;
    }

    const updatedMemos = memos.map((m) => {
      if (m.id === editingMemoId) {
        return { ...m, content: editingMemoContent.trim() };
      }
      return m;
    });
    setMemos(updatedMemos);
    setEditingMemoId(null);

    const targetMemo = updatedMemos.find((m) => m.id === editingMemoId);
    if (targetMemo) {
      await api.memos.update(targetMemo);
    }
  };

  // 取消編輯文字筆記
  const cancelEditMemo = () => {
    setEditingMemoId(null);
    setEditingMemoContent('');
  };

  const colors: { id: Memo['color']; class: string; border: string; ring: string }[] = [
    {
      id: 'yellow',
      class: 'bg-yellow-100',
      border: 'border-yellow-200',
      ring: 'focus:ring-yellow-400',
    },
    { id: 'blue', class: 'bg-blue-100', border: 'border-blue-200', ring: 'focus:ring-blue-400' },
    {
      id: 'green',
      class: 'bg-emerald-100',
      border: 'border-emerald-200',
      ring: 'focus:ring-emerald-400',
    },
    { id: 'rose', class: 'bg-rose-100', border: 'border-rose-200', ring: 'focus:ring-rose-400' },
    {
      id: 'purple',
      class: 'bg-purple-100',
      border: 'border-purple-200',
      ring: 'focus:ring-purple-400',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>📝</span> 個人備忘錄
          </h2>
          <p className="text-sm text-slate-500 font-bold mt-1">隨手記錄想法、待辦事項與會議筆記</p>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all">
        <div className="flex gap-4 mb-4 border-b border-slate-100 pb-2">
          <button
            onClick={() => setCreateType('TEXT')}
            className={`text-sm font-bold pb-1 px-2 border-b-2 transition ${createType === 'TEXT' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
          >
            文字筆記
          </button>
          <button
            onClick={() => setCreateType('CHECKLIST')}
            className={`text-sm font-bold pb-1 px-2 border-b-2 transition ${createType === 'CHECKLIST' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
          >
            待辦清單
          </button>
        </div>

        {createType === 'TEXT' ? (
          <div className="mb-3">
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[80px]"
              placeholder="輸入記事內容..."
            />
            <div className="flex justify-between items-center mt-3">
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id)}
                    className={`w-6 h-6 rounded-full border-2 ${c.class} ${selectedColor === c.id ? 'border-slate-500 scale-110' : 'border-transparent hover:scale-110'} transition shadow-sm`}
                  />
                ))}
              </div>
              <button
                onClick={handleCreateText}
                disabled={!textContent.trim()}
                className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-700 transition disabled:opacity-50"
              >
                新增筆記
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <form onSubmit={handleQuickAddTodo} className="flex gap-2">
              <input
                type="text"
                value={quickTodoInput}
                onChange={(e) => setQuickTodoInput(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="輸入待辦事項，按 Enter 立即新增..."
              />
              <button
                type="submit"
                disabled={!quickTodoInput.trim()}
                className="px-5 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 disabled:opacity-50 transition"
              >
                新增
              </button>
            </form>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">便條顏色:</span>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id)}
                    className={`w-5 h-5 rounded-full border-2 ${c.class} ${selectedColor === c.id ? 'border-slate-500 scale-110' : 'border-transparent hover:scale-110'} transition shadow-sm`}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-400 ml-auto">
                💡 提示：可在下方便條卡片內繼續追加項目
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Memo Grid */}
      {isLoading ? (
        <div className="text-center py-10 text-slate-400">載入中...</div>
      ) : memos.length === 0 ? (
        <EmptyState icon="📝" title="目前沒有備忘錄" description="新增一張吧！" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memos.map((memo) => {
            const colorTheme = colors.find((c) => c.id === memo.color) || colors[0];
            const isChecklist = memo.type === 'CHECKLIST';
            const completedCount = isChecklist
              ? memo.todos?.filter((t) => t.isCompleted).length || 0
              : 0;
            const totalCount = isChecklist ? memo.todos?.length || 0 : 0;
            const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return (
              <div
                key={memo.id}
                className={`${colorTheme.class} ${colorTheme.border} border p-5 rounded-xl shadow-sm relative group hover:shadow-md transition duration-300 min-h-[200px] flex flex-col`}
              >
                <div className="flex-1">
                  {isChecklist ? (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase">待辦清單</h4>
                        <span className="text-xs font-bold text-slate-600 bg-white/50 px-2 py-0.5 rounded-full border border-black/5">
                          {completedCount}/{totalCount}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-black/5 rounded-full mb-3 overflow-hidden">
                        <div
                          className="h-full bg-slate-600/50 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <ul className="space-y-1.5">
                        {memo.todos?.map((todo) => (
                          <li
                            key={todo.id}
                            className="flex items-start gap-2 group/item rounded-lg hover:bg-white/30 px-1 py-1 -mx-1 transition"
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => handleToggleTodo(memo.id, todo.id)}
                              className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition ${todo.isCompleted ? 'bg-slate-600 border-slate-600' : 'bg-white border-slate-400 hover:border-slate-600'}`}
                            >
                              {todo.isCompleted && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="3"
                                    d="M5 13l4 4L19 7"
                                  ></path>
                                </svg>
                              )}
                            </button>

                            {/* Text - 可編輯 */}
                            {editingTodo?.memoId === memo.id && editingTodo?.todoId === todo.id ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onBlur={saveEditTodo}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditTodo();
                                  if (e.key === 'Escape') setEditingTodo(null);
                                }}
                                className="flex-1 text-sm bg-white px-2 py-0.5 rounded border border-slate-300 outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            ) : (
                              <span
                                onClick={() => startEditTodo(memo.id, todo.id, todo.text)}
                                className={`flex-1 text-sm font-medium cursor-text transition ${todo.isCompleted ? 'text-slate-400 line-through decoration-slate-400' : 'text-slate-800 hover:text-blue-600'}`}
                                title="點擊編輯"
                              >
                                {todo.text}
                              </span>
                            )}

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTodo(memo.id, todo.id);
                              }}
                              className="text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition p-0.5"
                              title="刪除此項"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M6 18L18 6M6 6l12 12"
                                ></path>
                              </svg>
                            </button>
                          </li>
                        ))}
                      </ul>

                      {/* 在便條內新增項目 */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAddTodoToMemo(memo.id);
                        }}
                        className="mt-3 pt-3 border-t border-black/5"
                      >
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={memoInputs[memo.id] || ''}
                            onChange={(e) =>
                              setMemoInputs({ ...memoInputs, [memo.id]: e.target.value })
                            }
                            placeholder="新增項目..."
                            className="flex-1 text-xs px-2 py-1.5 bg-white/60 border border-black/10 rounded outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400"
                          />
                          <button
                            type="submit"
                            disabled={!memoInputs[memo.id]?.trim()}
                            className="text-xs px-2 py-1 bg-white/60 border border-black/10 rounded text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-40 transition font-medium"
                          >
                            ＋
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div>
                      {editingMemoId === memo.id ? (
                        <div className="space-y-2">
                          <textarea
                            ref={editTextareaRef}
                            value={editingMemoContent}
                            onChange={(e) => setEditingMemoContent(e.target.value)}
                            className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 resize-none min-h-[120px] text-sm font-medium"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={cancelEditMemo}
                              className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition font-medium"
                            >
                              取消
                            </button>
                            <button
                              onClick={saveEditMemo}
                              disabled={!editingMemoContent.trim()}
                              className="text-xs px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition font-medium"
                            >
                              儲存
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap leading-relaxed text-slate-800 font-medium">
                          {memo.content}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-end mt-4 pt-3 border-t border-black/5">
                  <span className="text-[10px] font-bold text-slate-500/70">
                    {new Date(memo.createdAt).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    {!isChecklist && (
                      <button
                        onClick={() => startEditMemo(memo.id, memo.content || '')}
                        className="text-slate-400 hover:text-blue-600 bg-white/50 p-1.5 rounded-lg hover:bg-white transition"
                        title="編輯筆記"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          ></path>
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(memo.id)}
                      className="text-slate-400 hover:text-red-500 bg-white/50 p-1.5 rounded-lg hover:bg-white transition"
                      title="刪除整張便條"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
