
import React, { useState, useMemo, useEffect } from 'react';
import { DepartmentDef, Urgency, User, Role, Task } from '../types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: any) => void;
  users: User[];
  currentUser: User;
  departments: DepartmentDef[];
  editingTask?: Task | null; // 編輯模式時傳入的任務
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onSubmit, users, currentUser, departments, editingTask }) => {
  const isEditMode = !!editingTask;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<Urgency>(Urgency.MEDIUM);
  
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  
  const [assignType, setAssignType] = useState<'open' | 'department' | 'individual'>('open');
  
  const isHighLevel = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;
  
  const [targetDepartment, setTargetDepartment] = useState<string>(
    isHighLevel ? (departments[0]?.id || '') : currentUser.department
  );
  const [assignedToUserId, setAssignedToUserId] = useState<string>('');

  useEffect(() => {
      if (isOpen) {
          if (editingTask) {
              // 編輯模式：填入現有任務資料
              setTitle(editingTask.title);
              setDescription(editingTask.description);
              setUrgency(editingTask.urgency as Urgency);
              if (editingTask.deadline) {
                  const [date, time] = editingTask.deadline.split('T');
                  setDeadlineDate(date || '');
                  setDeadlineTime(time || '');
              } else {
                  setDeadlineDate('');
                  setDeadlineTime('');
              }
              // 判斷指派類型
              if (editingTask.assignedToUserId) {
                  setAssignType('individual');
                  setAssignedToUserId(editingTask.assignedToUserId);
              } else if (editingTask.targetDepartment) {
                  setAssignType('department');
                  setTargetDepartment(editingTask.targetDepartment);
              } else {
                  setAssignType('open');
              }
          } else {
              // 新建模式：重置所有欄位
              setTitle('');
              setDescription('');
              setUrgency(Urgency.MEDIUM);
              setDeadlineDate('');
              setDeadlineTime('');
              setAssignType('open');
              setTargetDepartment(isHighLevel ? (departments[0]?.id || '') : currentUser.department);
              setAssignedToUserId('');
          }
      }
  }, [isOpen, isHighLevel, currentUser.department, departments, editingTask]);

  const availableEmployees = useMemo(() => {
      let list = users.filter(u => u.role !== Role.BOSS);
      if (!isHighLevel) {
          list = list.filter(u => u.department === currentUser.department);
      }
      return list;
  }, [users, isHighLevel, currentUser.department]);

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  const isValid = useMemo(() => {
      if (!title.trim() || !description.trim()) return false;
      if (assignType === 'department' && !targetDepartment) return false;
      if (assignType === 'individual' && !assignedToUserId) return false;
      return true;
  }, [title, description, assignType, targetDepartment, assignedToUserId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    let finalTargetDept = undefined;
    let finalAssignedUser = undefined;

    if (assignType === 'department') {
        finalTargetDept = targetDepartment;
    } else if (assignType === 'individual') {
        finalAssignedUser = assignedToUserId;
        const assignee = users.find(u => u.id === assignedToUserId);
        if (assignee) {
            finalTargetDept = assignee.department;
        }
    } else {
        if (!isHighLevel) {
            finalTargetDept = currentUser.department;
        }
    }

    let finalDeadline = undefined;
    if (deadlineDate) {
        const timeStr = deadlineTime || '18:00';
        finalDeadline = `${deadlineDate}T${timeStr}`;
    }

    onSubmit({
      id: editingTask?.id, // 編輯模式時傳入 ID
      title,
      description,
      urgency,
      deadline: finalDeadline,
      targetDepartment: finalTargetDept,
      assignedToUserId: finalAssignedUser,
      createdBy: editingTask?.createdBy || currentUser.id
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-[95%] md:w-full max-w-2xl max-h-[90vh] overflow-y-auto text-slate-800">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
             <span className="text-2xl drop-shadow-sm">{isEditMode ? '✏️' : '📝'}</span>
             <h2 className="text-xl font-bold text-slate-800 tracking-wide">{isEditMode ? '編輯任務' : '建立新任務'}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">任務標題 <span className="text-red-500">*</span></label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900 placeholder-slate-400 text-base"
              placeholder="例如：製作 Q3 財務報表..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">任務內容 <span className="text-red-500">*</span></label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none text-slate-800 placeholder-slate-400 text-base"
              placeholder="請輸入任務詳細執行項目..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-1">優先級</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as Urgency)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 text-base"
              >
                <option value={Urgency.LOW}>低 (Low)</option>
                <option value={Urgency.MEDIUM}>中 (Medium)</option>
                <option value={Urgency.HIGH}>高 (High)</option>
                <option value={Urgency.URGENT}>緊急 (Urgent)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-500 mb-1">截止期限 (選填)</label>
              <div className="flex gap-2">
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="flex-1 px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 text-base"
                  />
                  <input
                    type="time"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    className="w-1/3 px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 text-base"
                  />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-sm font-bold text-slate-700 mb-3">指派與分發</label>
            <div className="flex flex-wrap gap-4 mb-4">
              <label className="flex items-center cursor-pointer group">
                <div className={`w-5 h-5 rounded-full border mr-2 flex items-center justify-center transition ${assignType === 'open' ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'}`}>
                   {assignType === 'open' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
                </div>
                <input type="radio" checked={assignType === 'open'} onChange={() => setAssignType('open')} className="hidden" />
                <span className={`text-sm font-bold ${assignType === 'open' ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-700'}`}>
                    公開任務 <span className="text-xs font-normal opacity-70">(自由領取)</span>
                </span>
              </label>
              
              <label className="flex items-center cursor-pointer group">
                <div className={`w-5 h-5 rounded-full border mr-2 flex items-center justify-center transition ${assignType === 'department' ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'}`}>
                   {assignType === 'department' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
                </div>
                <input type="radio" checked={assignType === 'department'} onChange={() => setAssignType('department')} className="hidden" />
                <span className={`text-sm font-bold ${assignType === 'department' ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-700'}`}>
                    指定部門 <span className="text-xs font-normal opacity-70">(放入部門池)</span>
                </span>
              </label>

              <label className="flex items-center cursor-pointer group">
                <div className={`w-5 h-5 rounded-full border mr-2 flex items-center justify-center transition ${assignType === 'individual' ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'}`}>
                   {assignType === 'individual' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
                </div>
                <input type="radio" checked={assignType === 'individual'} onChange={() => setAssignType('individual')} className="hidden" />
                <span className={`text-sm font-bold ${assignType === 'individual' ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-700'}`}>
                    指定員工 <span className="text-xs font-normal opacity-70">(直接指派)</span>
                </span>
              </label>
            </div>

            {assignType === 'department' && (
              <div className="animate-fade-in">
                  <select
                    value={targetDepartment}
                    onChange={(e) => setTargetDepartment(e.target.value)}
                    disabled={!isHighLevel}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 text-base"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {!isHighLevel && (
                      <p className="text-xs text-slate-400 mt-1 pl-1">
                          * 您的權限僅能指派給所屬部門 ({getDeptName(currentUser.department)})
                      </p>
                  )}
              </div>
            )}

            {assignType === 'individual' && (
              <div className="animate-fade-in">
                  <select
                    value={assignedToUserId}
                    onChange={(e) => setAssignedToUserId(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 text-base"
                  >
                    <option value="">請選擇負責員工...</option>
                    {availableEmployees.map(u => (
                      <option key={u.id} value={u.id}>{u.name} - {getDeptName(u.department)}</option>
                    ))}
                  </select>
                  {!isHighLevel && (
                      <p className="text-xs text-slate-400 mt-1 pl-1">
                          * 僅顯示您部門內的成員
                      </p>
                  )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 mr-3 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition font-bold"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditMode ? '儲存變更' : '建立任務'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
