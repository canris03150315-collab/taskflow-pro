
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DepartmentDef, RoutineTemplate, User, Role } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface SOPManagementProps {
  departments: DepartmentDef[];
  currentUser: User;
}

export const SOPManagement: React.FC<SOPManagementProps> = ({ departments, currentUser }) => {
  const toast = useToast();
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  
  // View State (Filters)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDeptId, setEditDeptId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editItems, setEditItems] = useState<string[]>(['']);
  const [editIsDaily, setEditIsDaily] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBoss = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
      const data = await api.routines.getTemplates();
      setTemplates(data);
  };

  // --- Filtering Logic ---
  const visibleTemplates = useMemo(() => {
      return templates.filter(t => {
          // 1. Role Filter
          if (!isBoss && t.departmentId !== currentUser.department) return false;
          
          // 2. Department Filter (Dropdown)
          if (filterDept !== 'ALL' && t.departmentId !== filterDept) return false;

          // 3. Search Term
          if (searchTerm) {
              const lowerQ = searchTerm.toLowerCase();
              return t.title.toLowerCase().includes(lowerQ) || 
                     (t.items || []).some(i => i.toLowerCase().includes(lowerQ));
          }

          return true;
      });
  }, [templates, isBoss, currentUser.department, filterDept, searchTerm]);

  const handleEdit = (tpl: RoutineTemplate) => {
      setEditingId(tpl.id);
      setEditDeptId(tpl.departmentId);
      setEditTitle(tpl.title);
      setEditItems([...(tpl.items || [''])]);
      setEditIsDaily(tpl.isDaily || false);
  };

  const handleNew = () => {
      setEditingId('NEW');
      // If boss selected a filter, default to that department, otherwise first available
      const defaultDept = (isBoss && filterDept !== 'ALL') ? filterDept : (departments[0]?.id || '');
      
      setEditDeptId(isBoss ? defaultDept : currentUser.department);
      setEditTitle('');
      setEditItems(['']);
      setEditIsDaily(false);
  };

  const handleDuplicate = async (tpl: RoutineTemplate) => {
      if(!confirm(`確定要複製文件「${tpl.title}」嗎？`)) return;
      
      const newDoc: RoutineTemplate = {
          ...tpl,
          id: `doc-${Date.now()}`,
          title: `${tpl.title} (複製)`,
          lastUpdated: new Date().toISOString().split('T')[0],
          readBy: [] // Reset read status
      };
      
      await api.routines.saveTemplate(newDoc, currentUser);
      loadTemplates();
  };

  const handleItemChange = (index: number, val: string) => {
      const newItems = [...editItems];
      newItems[index] = val;
      setEditItems(newItems);
  };

  const addItem = () => {
      setEditItems([...editItems, '']);
  };

  const removeItem = (index: number) => {
      setEditItems(editItems.filter((_, i) => i !== index));
  };

  // --- File Upload Handler ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
          const text = await file.text();
          
          // Parse content into paragraphs
          let paragraphs: string[] = [];
          
          // Split by double newlines or numbered lists
          const lines = text.split(/\n\n+|\r\n\r\n+/);
          
          for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) {
                  // Remove common list prefixes like "1." "•" "-" etc.
                  const cleaned = trimmed.replace(/^[\d]+[.)\s]+|^[•\-\*]\s+/gm, '').trim();
                  if (cleaned) paragraphs.push(cleaned);
              }
          }
          
          // If no paragraphs found, split by single newlines
          if (paragraphs.length === 0) {
              paragraphs = text.split(/\n|\r\n/).map(l => l.trim()).filter(l => l);
          }
          
          if (paragraphs.length > 0) {
              // Auto-fill title from filename if empty
              if (!editTitle) {
                  const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
                  setEditTitle(nameWithoutExt);
              }
              setEditItems(paragraphs);
              toast.success(`成功匯入 ${paragraphs.length} 個段落`);
          } else {
              toast.error('無法解析文件內容，請確認文件格式');
          }
      } catch (error) {
          console.error('文件讀取失敗:', error);
          toast.error('文件讀取失敗，請確認文件格式');
      } finally {
          setUploading(false);
          // Reset input to allow re-upload same file
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const cleanItems = editItems.filter(i => i.trim() !== '');
      if (cleanItems.length === 0) {
          toast.warning('請至少輸入一段內容');
          return;
      }

      const id = editingId === 'NEW' ? `doc-${Date.now()}` : editingId!;
      
      const newTemplate: RoutineTemplate = {
          id,
          departmentId: editDeptId,
          title: editTitle,
          items: cleanItems,
          lastUpdated: new Date().toISOString().split('T')[0],
          isDaily: editIsDaily,
      };

      await api.routines.saveTemplate(newTemplate);
      loadTemplates();
      setEditingId(null);
  };

  const handleDelete = async (id: string) => {
      if (confirm('確定要刪除此文件嗎？')) {
          await api.routines.deleteTemplate(id);
          loadTemplates();
      }
  };

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-fade-in">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span>📄</span> 文件內容管理
                </h3>
                <p className="text-sm text-slate-500">在此建立、編輯或刪除部門規範文件</p>
            </div>
            
            {!editingId && (
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 md:w-48">
                        <input 
                            type="text" 
                            placeholder="搜尋文件標題..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>

                    {/* Department Filter (Boss Only) */}
                    {isBoss && (
                        <select 
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="ALL">🏢 所有部門</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    )}

                    <button 
                        onClick={handleNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition shadow-sm flex items-center gap-2 whitespace-nowrap"
                    >
                        <span>＋</span> 新增
                    </button>
                </div>
            )}
        </div>

        {/* Edit Form */}
        {editingId && (
            <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-xl shadow-inner animate-fade-in">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    {editingId === 'NEW' ? '📝 撰寫新文件' : '✏️ 編輯文件'}
                </h4>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">適用部門</label>
                            <select 
                                value={editDeptId}
                                onChange={(e) => setEditDeptId(e.target.value)}
                                disabled={!isBoss}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                            >
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">文件標題</label>
                            <input 
                                type="text" required
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="例如：新人報到懶人包"
                            />
                        </div>
                    </div>

                    {/* 每日任務開關 */}
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={editIsDaily}
                                onChange={(e) => setEditIsDaily(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        <div>
                            <span className="font-bold text-slate-700">
                                {editIsDaily ? '✅ 每日任務模式' : '📄 文件閱讀模式'}
                            </span>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {editIsDaily 
                                    ? '員工每天需要勾選完成各項任務' 
                                    : '員工只需閱讀並確認已讀'}
                            </p>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-slate-500">
                                {editIsDaily ? '任務項目 (每日需完成)' : '內容段落 (支援多段文字)'}
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept=".txt,.md,.csv"
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1.5 ${
                                        uploading 
                                            ? 'bg-slate-200 text-slate-400 cursor-wait' 
                                            : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                                    }`}
                                >
                                    {uploading ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                            </svg>
                                            處理中...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                                            </svg>
                                            上傳文件
                                        </>
                                    )}
                                </label>
                                <span className="text-[10px] text-slate-400">支援 .txt .md</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {editItems.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-start">
                                    <span className="text-slate-400 py-2 text-sm font-mono w-6 text-right">{idx + 1}.</span>
                                    <textarea 
                                        value={item}
                                        onChange={(e) => handleItemChange(idx, e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 min-h-[80px]"
                                        placeholder="請輸入段落內容..."
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => removeItem(idx)}
                                        className="text-slate-400 hover:text-red-500 px-2 mt-2 transition"
                                        title="移除此段落"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button 
                            type="button"
                            onClick={addItem}
                            className="mt-3 ml-8 text-sm text-blue-600 font-bold hover:bg-blue-50 px-3 py-1.5 rounded transition flex items-center gap-1"
                        >
                            <span>＋</span> 新增段落
                        </button>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                        <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg transition">取消</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition">儲存文件</button>
                    </div>
                </form>
            </div>
        )}

        {/* List */}
        <div className="space-y-4">
            {visibleTemplates.length === 0 ? (
                <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <div className="text-4xl mb-2 grayscale opacity-30">📂</div>
                    <p>{searchTerm ? '找不到符合的文件' : '目前沒有文件，請點擊上方按鈕建立。'}</p>
                </div>
            ) : (
                visibleTemplates.map(tpl => (
                    <div key={tpl.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition group gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-slate-800 text-lg truncate">{tpl.title}</h4>
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 border border-slate-200 whitespace-nowrap">{getDeptName(tpl.departmentId)}</span>
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                                <span>最後更新：{tpl.lastUpdated}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span>{(tpl.items || []).length} 個段落</span>
                            </p>
                        </div>
                        <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button onClick={() => handleDuplicate(tpl)} className="text-slate-500 font-bold text-xs hover:bg-slate-100 px-3 py-1.5 rounded transition border border-slate-200 flex items-center gap-1" title="複製文件">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                <span className="hidden md:inline">複製</span>
                            </button>
                            <button onClick={() => handleEdit(tpl)} className="text-blue-600 font-bold text-xs hover:bg-blue-50 px-3 py-1.5 rounded transition border border-blue-100 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                編輯
                            </button>
                            <button onClick={() => handleDelete(tpl.id)} className="text-red-500 font-bold text-xs hover:bg-red-50 px-3 py-1.5 rounded transition border border-red-100 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                刪除
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};
