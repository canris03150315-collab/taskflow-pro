
import React, { useState, useEffect, useRef } from 'react';
import { DepartmentDef, User, UNASSIGNED_DEPT_ID } from '../types';

interface DepartmentManagerProps {
  departments: DepartmentDef[];
  users: User[];
  onAdd: (dept: DepartmentDef) => void;
  onUpdate?: (dept: DepartmentDef) => void;
  onDelete: (id: string) => void;
}

interface FlatDepartment extends DepartmentDef {
  level: number;
  parentName?: string;
}

export const DepartmentManager: React.FC<DepartmentManagerProps> = ({ departments, users, onAdd, onUpdate, onDelete }) => {
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptTheme, setNewDeptTheme] = useState<DepartmentDef['theme']>('blue');
  const [newDeptIcon, setNewDeptIcon] = useState('📁');
  const [newDeptParentId, setNewDeptParentId] = useState<string>('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const iconPickerRef = useRef<HTMLDivElement>(null);

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
        onUpdate({
            id: editingId,
            name: newDeptName,
            theme: newDeptTheme,
            icon: newDeptIcon,
            parent_department_id: newDeptParentId || null
        });
        setEditingId(null);
    } else {
        const id = Math.random().toString(36).substr(2, 9);
        onAdd({
            id,
            name: newDeptName,
            theme: newDeptTheme,
            icon: newDeptIcon,
            parent_department_id: newDeptParentId || null
        });
    }
    
    setNewDeptName('');
    setNewDeptIcon('📁');
    setNewDeptTheme('blue');
    setNewDeptParentId('');
  };

  const handleEditClick = (dept: DepartmentDef) => {
      setEditingId(dept.id);
      setNewDeptName(dept.name);
      setNewDeptTheme(dept.theme);
      setNewDeptIcon(dept.icon);
      setNewDeptParentId(dept.parent_department_id || '');
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setNewDeptName('');
      setNewDeptIcon('📁');
      setNewDeptTheme('blue');
      setNewDeptParentId('');
  };

  const getMemberCount = (deptId: string) => users.filter(u => u.department === deptId).length;

  const flattenDepartments = (depts: DepartmentDef[], level = 0, parentName?: string): FlatDepartment[] => {
    const result: FlatDepartment[] = [];
    depts.forEach(dept => {
      result.push({ ...dept, level, parentName });
      if (dept.subdepartments && dept.subdepartments.length > 0) {
        result.push(...flattenDepartments(dept.subdepartments, level + 1, dept.name));
      }
    });
    return result;
  };

  const flatDepartments = flattenDepartments(departments);

  const getAvailableParentDepts = () => {
    if (!editingId) return flatDepartments;
    return flatDepartments.filter(d => d.id !== editingId && d.id !== UNASSIGNED_DEPT_ID);
  };

  const DepartmentTreeNode: React.FC<{ dept: DepartmentDef; level: number; isLast: boolean; parentLines: boolean[] }> = ({ dept, level, isLast, parentLines }) => {
    const memberCount = getMemberCount(dept.id);
    const isUnassigned = dept.id === UNASSIGNED_DEPT_ID;
    const isEditing = editingId === dept.id;
    const hasChildren = dept.subdepartments && dept.subdepartments.length > 0;

    return (
      <div className="relative">
        <div className={`bg-white rounded-xl border p-4 shadow-sm group transition ${isEditing ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'} ${level > 0 ? 'ml-8' : ''}`}>
          {/* 樹狀連接線 */}
          {level > 0 && (
            <>
              {/* 垂直線 */}
              {parentLines.map((showLine, idx) => (
                showLine && (
                  <div
                    key={idx}
                    className="absolute w-0.5 bg-slate-300"
                    style={{
                      left: `${-32 + idx * 32}px`,
                      top: 0,
                      bottom: 0
                    }}
                  />
                )
              ))}
              {/* 水平連接線 */}
              <div
                className="absolute w-6 h-0.5 bg-slate-300"
                style={{
                  left: '-24px',
                  top: '50%'
                }}
              />
              {/* 轉角 */}
              <div
                className={`absolute w-0.5 bg-slate-300`}
                style={{
                  left: `${-32 + (level - 1) * 32}px`,
                  top: 0,
                  height: isLast ? '50%' : '100%'
                }}
              />
            </>
          )}

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl shadow-sm bg-${dept.theme}-50 text-${dept.theme}-600 flex-shrink-0`}>
                {dept.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 truncate">{dept.name}</h3>
                  {hasChildren && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                      {dept.subdepartments!.length} 個子部門
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400 font-bold uppercase">{memberCount} 位成員</span>
                  {level > 0 && <span className="text-xs text-slate-400">• 第 {level + 1} 層</span>}
                </div>
              </div>
            </div>
            
            {!isUnassigned && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button 
                  onClick={() => handleEditClick(dept)}
                  className="text-blue-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition"
                  title="編輯"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
                {memberCount === 0 && !hasChildren && (
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
          
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
            <div className={`h-full bg-${dept.theme}-500 w-full opacity-50`}></div>
          </div>
          
          {isUnassigned && (
            <div className="absolute top-2 right-2 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200 pointer-events-none">
              系統預設
            </div>
          )}
        </div>

        {/* 遞迴渲染子部門 */}
        {hasChildren && (
          <div className="mt-3 space-y-3">
            {dept.subdepartments!.map((subDept, idx) => {
              const newParentLines = [...parentLines];
              if (level > 0) {
                newParentLines[level - 1] = !isLast;
              }
              return (
                <DepartmentTreeNode
                  key={subDept.id}
                  dept={subDept}
                  level={level + 1}
                  isLast={idx === dept.subdepartments!.length - 1}
                  parentLines={newParentLines}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
       {/* 樹狀圖顯示部門 */}
       <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h2 className="text-lg font-bold text-slate-700">部門組織架構</h2>
          </div>
          <div className="space-y-3">
            {departments.map((dept, idx) => (
              <DepartmentTreeNode
                key={dept.id}
                dept={dept}
                level={0}
                isLast={idx === departments.length - 1}
                parentLines={[]}
              />
            ))}
          </div>
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
                  placeholder="例如：客服部、會計部"
                />
             </div>
             
             <div className="flex-1 w-full">
                <label className="block text-sm font-bold text-slate-500 mb-1">父部門（選填）</label>
                <select
                  value={newDeptParentId}
                  onChange={(e) => setNewDeptParentId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">無（頂層部門）</option>
                  {getAvailableParentDepts().filter(d => d.id !== UNASSIGNED_DEPT_ID).map(d => (
                    <option key={d.id} value={d.id}>
                      {d.level > 0 ? '　'.repeat(d.level) + '└─ ' : ''}{d.name}
                    </option>
                  ))}
                </select>
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
