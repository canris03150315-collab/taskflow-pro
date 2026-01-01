import React, { useState, useEffect } from 'react';
import { User, RoutineTemplate, DepartmentDef } from '../types';
import { api } from '../services/api';

interface DocumentReaderPageProps {
  currentUser: User;
  documentId: string;
  departments: DepartmentDef[];
  onClose: () => void;
  onConfirmRead: (docId: string) => Promise<void>;
  isMobile?: boolean;
}

export const DocumentReaderPage: React.FC<DocumentReaderPageProps> = ({
  currentUser,
  documentId,
  departments,
  onClose,
  onConfirmRead,
  isMobile = false
}) => {
  const [document, setDocument] = useState<RoutineTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    setIsLoading(true);
    const templates = await api.routines.getTemplates();
    const doc = templates.find(t => t.id === documentId);
    setDocument(doc || null);
    setIsLoading(false);
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  const isRead = document?.readBy?.includes(currentUser.id);

  const handleConfirm = async () => {
    if (!document || isConfirming) return;
    setIsConfirming(true);
    await onConfirmRead(document.id);
    await loadDocument(); // Reload to update read status
    setIsConfirming(false);
  };

  // 手機版才顯示
  if (!isMobile) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-500 font-bold">載入中...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        <div className="p-4 border-b border-slate-200 flex items-center">
          <button onClick={onClose} className="flex items-center gap-2 text-blue-600 font-bold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            返回
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <div className="text-6xl mb-4">❌</div>
            <p className="font-bold">找不到此文件</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* 頂部導航 */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-white safe-area-top">
        <div className="flex items-center justify-between gap-3">
          <button 
            onClick={onClose} 
            className="flex items-center gap-1 text-blue-600 font-bold text-base"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            返回
          </button>
          {isRead ? (
            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">
              ✓ 已閱讀
            </span>
          ) : (
            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
              未閱讀
            </span>
          )}
        </div>
      </div>

      {/* 文件標題區 */}
      <div className="flex-shrink-0 p-4 bg-slate-50 border-b border-slate-200">
        <h1 className="text-xl font-black text-slate-800 mb-2">{document.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-bold">
          <span className="bg-white px-2 py-1 rounded border border-slate-200">
            📁 {getDeptName(document.departmentId)}
          </span>
          <span className="bg-white px-2 py-1 rounded border border-slate-200">
            🕐 更新: {document.lastUpdated}
          </span>
        </div>
      </div>

      {/* 內容區域 - 可滾動 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-8">
          <p className="text-slate-600 font-bold mb-5 text-base">
            📋 請詳閱以下內容：
          </p>
          
          <div className="space-y-4">
            {(document.items || []).map((item, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shadow-md">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 text-base leading-relaxed whitespace-pre-line">
                      {item}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(document.items || []).length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <div className="text-4xl mb-2">📭</div>
              <p>此文件暫無內容</p>
            </div>
          )}
        </div>
      </div>

      {/* 底部確認按鈕 - 固定 */}
      <div className="flex-shrink-0 p-4 border-t border-slate-200 bg-white safe-area-bottom">
        {isRead ? (
          <button 
            disabled 
            className="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl flex items-center justify-center gap-2 text-lg"
          >
            ✅ 已確認閱讀完成
          </button>
        ) : (
          <button 
            onClick={handleConfirm}
            disabled={isConfirming}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-lg active:scale-[0.98] transition disabled:opacity-50"
          >
            {isConfirming ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                確認中...
              </>
            ) : (
              <>
                📝 我已閱讀完畢，確認送出
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
