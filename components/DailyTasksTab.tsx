import React, { useState, useEffect } from 'react';
import { User, RoutineTemplate, DepartmentDef, Role } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';
import { showConfirm } from '../utils/dialogService';

interface DailyTasksTabProps {
  templates: RoutineTemplate[];
  departments: DepartmentDef[];
  currentUser: User;
  onRefresh: () => void;
}

export const DailyTasksTab: React.FC<DailyTasksTabProps> = ({ 
  templates, 
  departments, 
  currentUser,
  onRefresh 
}) => {
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDeptId, setEditDeptId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editItems, setEditItems] = useState<string[]>(['']);
  const [allTemplates, setAllTemplates] = useState<RoutineTemplate[]>([]);

  const isBoss = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await api.routines.getTemplates();
      setAllTemplates(data || []);
    } catch (error) {
      console.error('載入每日任務失敗:', error);
      setAllTemplates([]);
    }
  };

  // 只顯示每日任務
  const dailyTasks = allTemplates.filter(t => 
    t.isDaily && 
    (isBoss || t.departmentId === currentUser.department)
  );

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  const handleNew = () => {
    setEditingId('NEW');
    setEditDeptId(isBoss ? (departments[0]?.id || '') : currentUser.department);
    setEditTitle('');
    setEditItems(['']);
  };

  const handleEdit = (task: RoutineTemplate) => {
    setEditingId(task.id);
    setEditDeptId(task.departmentId);
    setEditTitle(task.title);
    setEditItems([...(task.items || [''])]);
  };

  const handleDelete = async (id: string) => {
    if (!(await showConfirm('確定要刪除此每日任務嗎？'))) return;
    await api.routines.deleteTemplate(id);
    toast.success('已刪除');
    loadTemplates();
    onRefresh();
  };

  const handleSave = async () => {
    const cleanItems = editItems.filter(i => i.trim() !== '');
    if (cleanItems.length === 0) {
      toast.warning('請至少輸入一項任務');
      return;
    }
    if (!editTitle.trim()) {
      toast.warning('請輸入任務標題');
      return;
    }

    const id = editingId === 'NEW' ? `daily-${Date.now()}` : editingId!;
    
    const newTemplate: RoutineTemplate = {
      id,
      departmentId: editDeptId,
      title: editTitle,
      items: cleanItems,
      lastUpdated: new Date().toISOString().split('T')[0],
      isDaily: true, // 強制設為每日任務
    };

    try {
      await api.routines.saveTemplate(newTemplate);
      toast.success(editingId === 'NEW' ? '已新增每日任務' : '已儲存');
      setEditingId(null);
      // 等待一下再重新載入
      setTimeout(() => {
        loadTemplates();
        onRefresh();
      }, 300);
    } catch (error) {
      console.error('Failed to save daily task:', error);
      toast.error('儲存失敗，請重試');
    }
  };

  const addItem = () => setEditItems([...editItems, '']);
  const removeItem = (idx: number) => {
    if (editItems.length > 1) {
      setEditItems(editItems.filter((_, i) => i !== idx));
    }
  };
  const handleItemChange = (idx: number, value: string) => {
    const newItems = [...editItems];
    newItems[idx] = value;
    setEditItems(newItems);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>✅</span> 每日任務管理
          </h3>
          <p className="text-sm text-slate-500">設定部門員工每天需要完成的任務項目</p>
        </div>
        
        {!editingId && (
          <button 
            onClick={handleNew}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition shadow-sm flex items-center gap-2"
          >
            <span>＋</span> 新增每日任務
          </button>
        )}
      </div>

      {/* Edit Form */}
      {editingId && (
        <div className="mb-8 p-6 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in">
          <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
            {editingId === 'NEW' ? '➕ 新增每日任務' : '✏️ 編輯每日任務'}
          </h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">適用部門</label>
                <select 
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  disabled={!isBoss}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-100"
                >
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">任務名稱</label>
                <input 
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="例如：業務部每日任務"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">任務項目（員工每天需完成）</label>
              <div className="space-y-2">
                {editItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="text-emerald-600 font-bold w-6 text-right">{idx + 1}.</span>
                    <input 
                      value={item}
                      onChange={(e) => handleItemChange(idx, e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="例如：開晨會、整理報表..."
                    />
                    <button 
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-slate-400 hover:text-red-500 px-2 transition"
                      title="移除"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button 
                type="button"
                onClick={addItem}
                className="mt-2 text-emerald-600 hover:text-emerald-700 text-sm font-bold flex items-center gap-1"
              >
                <span>＋</span> 新增項目
              </button>
            </div>

            <div className="flex gap-2 pt-4 border-t border-emerald-200">
              <button 
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition"
              >
                💾 儲存
              </button>
              <button 
                onClick={() => setEditingId(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2 rounded-lg font-bold text-sm transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      {!editingId && (
        <div className="space-y-4">
          {dailyTasks.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-5xl mb-4">📋</div>
              <p className="font-medium text-lg">尚無每日任務</p>
              <p className="text-sm mt-1">點擊「新增每日任務」開始設定</p>
            </div>
          ) : (
            dailyTasks.map(task => (
              <div 
                key={task.id} 
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-300 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-white bg-emerald-500 px-2 py-0.5 rounded">
                        {getDeptName(task.departmentId)}
                      </span>
                      <h4 className="font-bold text-slate-800">{task.title}</h4>
                    </div>
                    <div className="space-y-1">
                      {(task.items || []).map((item, idx) => (
                        <div key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                          <span className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center text-xs text-slate-400">
                            {idx + 1}
                          </span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(task)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-bold px-3 py-1.5 bg-blue-50 rounded-lg transition"
                    >
                      編輯
                    </button>
                    <button 
                      onClick={() => handleDelete(task.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-bold px-3 py-1.5 bg-red-50 rounded-lg transition"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DailyTasksTab;
