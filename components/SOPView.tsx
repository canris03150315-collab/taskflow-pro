
import React, { useState, useEffect } from 'react';
import { User, RoutineTemplate, Role, DepartmentDef } from '../types';
import { api } from '../services/api';
import { SOPManagement } from './SOPManagement';
import { DocumentReaderPage } from './DocumentReaderPage';
import { DailyTasksTab } from './DailyTasksTab';

interface SOPViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
}

export const SOPView: React.FC<SOPViewProps> = ({ currentUser, users, departments }) => {
  const isSupervisor = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER || currentUser.role === Role.SUPERVISOR;
  
  const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'DAILY_TASKS' | 'TEAM_STATUS' | 'MANAGEMENT'>('DOCUMENTS');
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileReaderDocId, setMobileReaderDocId] = useState<string | null>(null); // 手機版開新頁面閱讀

  useEffect(() => {
    if (activeTab === 'DOCUMENTS' || activeTab === 'TEAM_STATUS') {
        loadData();
    }
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    const tpls = await api.routines.getTemplates();
    setTemplates(tpls);
    
    // Auto select first doc if available
    if (tpls.length > 0 && !selectedDocId) {
        // Filter for user's department first
        const myDeptDocs = tpls.filter(t => t.departmentId === currentUser.department);
        if (myDeptDocs.length > 0) {
            setSelectedDocId(myDeptDocs[0].id);
        } else {
            setSelectedDocId(tpls[0].id);
        }
    }
    setIsLoading(false);
  };

  const handleConfirmRead = async (docId: string) => {
      await api.routines.markAsRead(currentUser.id, docId);
      // Reload to update UI
      loadData();
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  const visibleDocs = templates.filter(t => {
      // Only own department documents are visible (no exceptions)
      return t.departmentId === currentUser.department;
  });

  const selectedDoc = templates.find(t => t.id === selectedDocId);
  const isRead = selectedDoc?.readBy?.includes(currentUser.id);

  // --- Team Status Logic ---
  const teamMembers = users.filter(u => 
      u.role === Role.EMPLOYEE && 
      (currentUser.role === Role.BOSS || u.department === currentUser.department)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-4">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span>📑</span> 部門文件與規範
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">新人報到須知、工作手冊與標準作業程序 <span className="text-xs text-slate-300">v2.3</span></p>
            </div>

            {isSupervisor && (
                <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg gap-1">
                    <button 
                        onClick={() => setActiveTab('DOCUMENTS')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'DOCUMENTS' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        📄 閱讀文件
                    </button>
                    <button 
                        onClick={() => setActiveTab('DAILY_TASKS')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'DAILY_TASKS' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        ✅ 每日任務
                    </button>
                    <button 
                        onClick={() => setActiveTab('TEAM_STATUS')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'TEAM_STATUS' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        📊 閱讀統計
                    </button>
                    <button 
                        onClick={() => setActiveTab('MANAGEMENT')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'MANAGEMENT' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        ⚙️ 管理文件
                    </button>
                </div>
            )}
        </div>

        {/* --- Tab: Daily Tasks Management --- */}
        {activeTab === 'DAILY_TASKS' && (
            <DailyTasksTab templates={templates} departments={departments} currentUser={currentUser} onRefresh={loadData} />
        )}

        {/* --- Tab 3: Document Management (New) --- */}
        {activeTab === 'MANAGEMENT' && (
            <SOPManagement departments={departments} currentUser={currentUser} />
        )}

        {/* --- Tab 1: Document Reader --- */}
        {activeTab === 'DOCUMENTS' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 md:h-[calc(100vh-250px)]">
                
                {/* Left Sidebar: Doc List */}
                <div className="md:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-3 md:p-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-bold text-slate-700 text-sm">文件列表 ({visibleDocs.length})</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[40vh] md:max-h-none">
                        {visibleDocs.length === 0 ? (
                            <div className="text-center py-10 text-xs text-slate-400">尚無文件</div>
                        ) : (
                            visibleDocs.map(doc => {
                                const read = doc.readBy?.includes(currentUser.id);
                                return (
                                    <button 
                                        key={doc.id}
                                        onClick={() => {
                                            setSelectedDocId(doc.id);
                                            // 簡化：總是設定 mobileReaderDocId，用 CSS 控制顯示
                                            setMobileReaderDocId(doc.id);
                                        }}
                                        className={`w-full text-left p-3 rounded-lg text-sm transition flex items-center justify-between group
                                            ${selectedDocId === doc.id 
                                                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200' 
                                                : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                                            }
                                        `}
                                    >
                                        <div className="truncate pr-2">{doc.title}</div>
                                        {read ? (
                                            <span className="text-emerald-500 flex-shrink-0" title="已讀">✔</span>
                                        ) : (
                                            <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" title="未讀"></span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Area: Content Reader - 只在桌面版顯示 */}
                <div className="hidden md:flex md:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm flex-col overflow-hidden">
                    {selectedDoc ? (
                        <>
                            {/* 桌面版標題 */}
                            <div className="p-6 border-b border-slate-100">
                                <div className="flex justify-between items-start gap-3">
                                    <div>
                                        <h1 className="text-2xl font-black text-slate-800 mb-1">{selectedDoc.title}</h1>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{getDeptName(selectedDoc.departmentId)}</span>
                                            <span>•</span>
                                            <span>更新: {selectedDoc.lastUpdated}</span>
                                        </div>
                                    </div>
                                    {isRead ? (
                                        <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-emerald-200">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                            已確認
                                        </div>
                                    ) : (
                                        <div className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 animate-pulse">
                                            尚未確認
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 內容區 */}
                            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                                <p className="font-bold text-slate-600 mb-6">
                                    請詳閱以下內容：
                                </p>
                                <ul className="space-y-4 list-none pl-0">
                                    {(selectedDoc.items || []).map((item, idx) => (
                                        <li key={idx} className="flex gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 border border-blue-200">{idx + 1}</span>
                                            <span className="text-slate-800 font-medium leading-relaxed whitespace-pre-line">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* 確認按鈕 */}
                            <div className="p-6 border-t border-slate-200 bg-white flex justify-center">
                                {isRead ? (
                                    <button disabled className="px-8 py-3 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed flex items-center gap-2">
                                        <span>✅</span> 閱讀確認完成
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleConfirmRead(selectedDoc.id)}
                                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition transform hover:-translate-y-0.5 flex items-center gap-2"
                                    >
                                        <span>📝</span> 我已閱讀並充分理解內容
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                            <div className="text-6xl mb-4 grayscale opacity-20">📄</div>
                            <p className="font-bold">請從左側選擇要閱讀的文件</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- Tab 2: Team Oversight (Table) --- */}
        {activeTab === 'TEAM_STATUS' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                <th className="p-4 w-48 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">員工姓名</th>
                                {visibleDocs.map(doc => (
                                    <th key={doc.id} className="p-4 min-w-[150px] border-l border-slate-100">
                                        <div className="truncate w-32" title={doc.title}>{doc.title}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {teamMembers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white border-r border-slate-200 z-10 flex items-center gap-3">
                                        <img src={user.avatar} className="w-8 h-8 rounded-full border border-slate-200" />
                                        {user.name}
                                    </td>
                                    {visibleDocs.map(doc => {
                                        const hasRead = doc.readBy?.includes(user.id);
                                        return (
                                            <td key={doc.id} className="p-4 text-center border-l border-slate-100">
                                                {hasRead ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 font-bold text-xs border border-emerald-200">
                                                        ✓
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-300 font-bold text-xs">
                                                        -
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {teamMembers.length === 0 && (
                                <tr>
                                    <td colSpan={visibleDocs.length + 1} className="p-8 text-center text-slate-400">
                                        無員工資料
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      {/* 手機版全螢幕文件閱讀器 */}
      {mobileReaderDocId && (
        <DocumentReaderPage
          currentUser={currentUser}
          documentId={mobileReaderDocId}
          departments={departments}
          onClose={() => {
            setMobileReaderDocId(null);
            loadData();
          }}
          onConfirmRead={handleConfirmRead}
          isMobile={true}
        />
      )}
    </div>
  );
};
