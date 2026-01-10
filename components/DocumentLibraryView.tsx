import React, { useState, useEffect, useMemo } from 'react';
import { User, RoutineTemplate, Role, DepartmentDef } from '../types';
import { api } from '../services/api';

interface DocumentLibraryViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
}

export const DocumentLibraryView: React.FC<DocumentLibraryViewProps> = ({ 
  currentUser, 
  users, 
  departments 
}) => {
  const [documents, setDocuments] = useState<RoutineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>(currentUser.department);
  const [readingDocId, setReadingDocId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingDoc, setEditingDoc] = useState<RoutineTemplate | null>(null);

  const isBoss = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const templates = await api.routines.getTemplates();
      // 只取部門文件（非每日任務）
      const docs = templates.filter(t => !t.isDaily);
      setDocuments(docs);
    } catch (error) {
      console.error('載入文件失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 過濾文件
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // 強制過濾：絕對不顯示每日任務
      if (doc.isDaily === true) return false;
      
      // 部門過濾
      if (doc.departmentId !== selectedDept) return false;
      
      // 搜尋過濾
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return doc.title.toLowerCase().includes(term) ||
               doc.items?.some(item => item.toLowerCase().includes(term));
      }
      
      return true;
    });
  }, [documents, selectedDept, searchTerm]);

  // 計算未讀文件數量
  const unreadCount = useMemo(() => {
    return filteredDocuments.filter(doc => 
      !doc.readBy?.includes(currentUser.id)
    ).length;
  }, [filteredDocuments, currentUser.id]);

  const handleConfirmRead = async (docId: string) => {
    await api.routines.markAsRead(currentUser.id, docId);
    await loadDocuments();
    setReadingDocId(null);
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  // 閱讀模式
  if (readingDocId) {
    const doc = documents.find(d => d.id === readingDocId);
    if (!doc) return null;

    const isRead = doc.readBy?.includes(currentUser.id);

    return (
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto animate-fade-in">
        <div className="max-w-4xl mx-auto p-6">
          {/* 返回按鈕 */}
          <button
            onClick={() => setReadingDocId(null)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 font-bold mb-6 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            返回文件列表
          </button>

          {/* 文件標題 */}
          <div className="mb-6">
            <h1 className="text-3xl font-black text-slate-800 mb-2">{doc.title}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="bg-slate-100 px-3 py-1 rounded-full font-bold">
                {getDeptName(doc.departmentId)}
              </span>
              <span>更新於 {doc.lastUpdated}</span>
            </div>
          </div>

          {/* 文件內容 */}
          <div className="space-y-4 mb-8">
            {doc.items?.map((item, idx) => (
              <div
                key={idx}
                className="flex gap-4 p-5 bg-white rounded-xl border-2 border-slate-200 shadow-sm hover:shadow-md transition"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 border-2 border-blue-200">
                  {idx + 1}
                </span>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line flex-1">
                  {item}
                </p>
              </div>
            ))}
          </div>

          {/* 確認按鈕 */}
          <div className="sticky bottom-0 bg-white border-t-2 border-slate-200 pt-6 pb-4">
            {isRead ? (
              <button
                disabled
                className="w-full px-8 py-4 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>✅</span> 已確認閱讀
              </button>
            ) : (
              <button
                onClick={() => handleConfirmRead(doc.id)}
                className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <span>📝</span> 我已閱讀並充分理解內容
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">載入中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 搜尋和篩選 */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="搜尋文件標題或內容..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {isBoss && (
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}

        {isBoss && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 whitespace-nowrap"
          >
            <span>➕</span> 新增文件
          </button>
        )}
      </div>

      {/* 未讀提示 */}
      {unreadCount > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-orange-800">您有 {unreadCount} 份文件尚未閱讀</p>
            <p className="text-sm text-orange-600 mt-1">請盡快閱讀並確認</p>
          </div>
        </div>
      )}

      {/* 文件卡片列表 */}
      <div className="grid grid-cols-1 gap-4">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <div className="text-4xl mb-2 grayscale opacity-30">📂</div>
            <p>{searchTerm ? '找不到符合的文件' : '目前沒有文件'}</p>
          </div>
        ) : (
          filteredDocuments.map(doc => {
            const isRead = doc.readBy?.includes(currentUser.id);
            const readCount = doc.readBy?.length || 0;
            const totalUsers = users.filter(u => u.department === doc.departmentId && u.role === Role.EMPLOYEE).length;
            const readPercentage = totalUsers > 0 ? Math.round((readCount / totalUsers) * 100) : 0;

            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl border-2 border-slate-200 shadow-sm hover:shadow-lg transition overflow-hidden"
              >
                <div className="p-6">
                  {/* 標題和狀態 */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-800 mb-2">{doc.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded font-bold">
                          {getDeptName(doc.departmentId)}
                        </span>
                        <span>•</span>
                        <span>更新於 {doc.lastUpdated}</span>
                      </div>
                    </div>

                    {isRead ? (
                      <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-emerald-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        已確認
                      </div>
                    ) : (
                      <div className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold border border-red-200 animate-pulse">
                        尚未確認
                      </div>
                    )}
                  </div>

                  {/* 主管視角：閱讀統計 */}
                  {isBoss && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-600">閱讀狀態</span>
                        <span className="text-sm font-bold text-blue-600">{readCount}/{totalUsers} 人已讀 ({readPercentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${readPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 文件資訊 */}
                  <p className="text-sm text-slate-500 mb-4">
                    包含 {doc.items?.length || 0} 個段落 • 預計閱讀時間 {Math.ceil((doc.items?.length || 0) * 0.5)} 分鐘
                  </p>

                  {/* 操作按鈕 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReadingDocId(doc.id)}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <span>📖</span> {isRead ? '重新閱讀' : '立即閱讀'}
                    </button>

                    {isBoss && (
                      <>
                        <button
                          onClick={() => setEditingDoc(doc)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`確定要刪除「${doc.title}」嗎？`)) {
                              await api.routines.deleteTemplate(doc.id);
                              await loadDocuments();
                            }
                          }}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
