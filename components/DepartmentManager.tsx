
import React, { useState, useEffect, useRef } from 'react';
import { DepartmentDef, User, UNASSIGNED_DEPT_ID } from '../types';

interface DepartmentManagerProps {
  departments: DepartmentDef[];
  users: User[];
  onAdd: (dept: DepartmentDef) => void;
  onUpdate?: (dept: DepartmentDef) => void; // New prop
  onDelete: (id: string) => void;
}

export const DepartmentManager: React.FC<DepartmentManagerProps> = ({ departments, users, onAdd, onUpdate, onDelete }) => {
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptTheme, setNewDeptTheme] = useState<DepartmentDef['theme']>('blue');
  const [newDeptIcon, setNewDeptIcon] = useState('📁');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const iconPickerRef = useRef<HTMLDivElement>(null);

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Close icon picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
        setShowIconPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const themes: { value: DepartmentDef['theme'], label: string, color: string }[] = [
    { value: 'slate', label: '灰黑 (營運)', color: 'bg-slate-500' },
    { value: 'blue', label: '藍色 (技術)', color: 'bg-blue-500' },
    { value: 'purple', label: '紫色 (行銷)', color: 'bg-purple-500' },
    { value: 'rose', label: '粉紅 (人資)', color: 'bg-rose-500' },
    { value: 'emerald', label: '綠色 (其他)', color: 'bg-emerald-500' },
    { value: 'orange', label: '橘色 (業務)', color: 'bg-orange-500' },
    { value: 'cyan', label: '青色 (研發)', color: 'bg-cyan-500' },
  ];

  const commonIcons = [
    '📂', '💼', '🔧', '📢', '👥', '📊', '💻', '🎨', 
    '🔰', '🛒', '🚚', '💊', '🏠', '🎓', '💰', '📅',
    '📝', '🔍', '🔒', '🚀', '💡', '🔥', '⭐', '🏆'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    if (editingId && onUpdate) {
        // Update existing
        onUpdate({
            id: editingId,
            name: newDeptName,
            theme: newDeptTheme,
            icon: newDeptIcon
        });
        setEditingId(null);
    } else {
        // Create new
        const id = Math.random().toString(36).substr(2, 9);
        onAdd({
            id,
            name: newDeptName,
            theme: newDeptTheme,
            icon: newDeptIcon
        });
    }
    
    // Reset
    setNewDeptName('');
    setNewDeptIcon('📁');
    setNewDeptTheme('blue');
  };

  const handleEditClick = (dept: DepartmentDef) => {
      setEditingId(dept.id);
      setNewDeptName(dept.name);
      setNewDeptTheme(dept.theme);
      setNewDeptIcon(dept.icon);
      // Scroll to form (optional, simplified)
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setNewDeptName('');
      setNewDeptIcon('📁');
      setNewDeptTheme('blue');
  };

  const getMemberCount = (deptId: string) => users.filter(u => u.department === deptId).length;

  return (
    <div className="space-y-8 animate-fade-in">
       {/* List Existing Departments */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map(dept => {
            const memberCount = getMemberCount(dept.id);
            const isUnassigned = dept.id === UNASSIGNED_DEPT_ID;
            const isEditing = editingId === dept.id;

            return (
              <div key={dept.id} className={`bg-white rounded-xl border p-5 shadow-sm relative group transition ${isEditing ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'}`}>
                 <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl shadow-sm bg-${dept.theme}-50 text-${dept.theme}-600`}>
                          {dept.icon}
                       </div>
                       <div>
                          <h3 className="font-bold text-slate-800">{dept.name}</h3>
                          <span className="text-xs text-slate-400 font-bold uppercase">{memberCount} 位成員</span>
                       </div>
                    </div>
                    
                    {!isUnassigned && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => handleEditClick(dept)}
                                className="text-blue-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition"
                                title="編輯"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            {memberCount === 0 && (
                                <button 
                                    onClick={() => { if(window.confirm(`確定要刪除「${dept.name}」嗎？`)) onDelete(dept.id); }}
                                    className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition"
                                    title="刪除"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            )}
                        </div>
                    )}
                 </div>
                 
                 <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full bg-${dept.theme}-500 w-full opacity-50`}></div>
                 </div>
                 
                 {isUnassigned && (
                    <div className="absolute top-2 right-2 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200 pointer-events-none">
                       系統預設
                    </div>
                 )}
              </div>
            );
          })}
       </div>

       {/* Add/Edit Form */}
       <div className={`border rounded-xl p-6 transition-all ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
          <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${editingId ? 'text-blue-800' : 'text-slate-800'}`}>
             <span>{editingId ? '✏️' : '✨'}</span> {editingId ? '編輯部門資訊' : '建立新部門'}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-1 w-full">
                <label className="block text-sm font-bold text-slate-500 mb-1">部門名稱</label>
                <input 
                  type="text" 
                  required
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例如：業務推廣部"
                />
             </div>
             
             <div className="relative" ref={iconPickerRef}>
                <label className="block text-sm font-bold text-slate-500 mb-1">代表圖示</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-16 text-center px-2 py-2.5 bg-white border border-slate-300 rounded-lg hover:border-blue-400 transition text-2xl"
                  >
                    {newDeptIcon}
                  </button>
                  {showIconPicker && (
                    <div className="absolute z-50 mt-12 p-3 bg-white border border-slate-200 rounded-lg shadow-xl" style={{ minWidth: '280px' }}>
                      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                        {commonIcons.map((icon, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setNewDeptIcon(icon);
                              setShowIconPicker(false);
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded transition text-lg"
                            title={icon}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500">
                        點擊選擇圖示，或自行輸入自訂圖示
                      </div>
                    </div>
                  )}
                </div>
             </div>

             <div className="flex-1 w-full">
                <label className="block text-sm font-bold text-slate-500 mb-1">顏色主題</label>
                <div className="flex gap-2">
                   {themes.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setNewDeptTheme(t.value)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${newDeptTheme === t.value ? 'border-slate-600 scale-110' : 'border-transparent hover:scale-105'}`}
                        title={t.label}
                      >
                         <div className={`w-8 h-8 rounded-full ${t.color}`}></div>
                      </button>
                   ))}
                </div>
             </div>

             <div className="flex gap-2 w-full md:w-auto">
                 {editingId && (
                     <button 
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2.5 text-slate-500 font-bold hover:bg-slate-200 rounded-lg transition"
                     >
                        取消
                     </button>
                 )}
                 <button 
                   type="submit"
                   className={`px-6 py-2.5 text-white font-bold rounded-lg shadow-md transition ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-700'}`}
                 >
                   {editingId ? '儲存變更' : '新增部門'}
                 </button>
             </div>
          </form>
       </div>
    </div>
  );
};
