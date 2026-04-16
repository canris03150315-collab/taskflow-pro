import React, { useState, useEffect, useMemo } from 'react';
import { WorkLog, User, Role, DepartmentDef } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/dialogService';

interface WorkLogViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
}

export const WorkLogView: React.FC<WorkLogViewProps> = ({ currentUser, users, departments }) => {
  const toast = useToast();
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [todayTasks, setTodayTasks] = useState('');
  const [tomorrowTasks, setTomorrowTasks] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');

  // 篩選器狀態
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const isManager = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;
  const isSupervisor = currentUser.role === Role.SUPERVISOR;

  useEffect(() => {
    loadLogs();
  }, []);

  // 監聽 WebSocket 即時更新
  useEffect(() => {
    const handleWorklogUpdate = () => {
      console.log('[WorkLogView] 收到即時更新通知，重新載入日誌');
      loadLogs();
    };

    window.addEventListener('worklog-updated', handleWorklogUpdate);
    
    return () => {
      window.removeEventListener('worklog-updated', handleWorklogUpdate);
    };
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.workLogs.getAll();
      setLogs(data);
    } catch (error: any) {
      toast.error(error.message || '載入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!todayTasks.trim() || !tomorrowTasks.trim()) {
      toast.warning('請填寫今日和明天的工作事項');
      return;
    }

    try {
      if (editingLog) {
        await api.workLogs.update(editingLog.id, { todayTasks, tomorrowTasks, specialNotes });
        toast.success('工作日誌已更新');
      } else {
        await api.workLogs.create({ date, todayTasks, tomorrowTasks, specialNotes });
        toast.success('工作日誌已創建');
      }
      
      resetForm();
      loadLogs();
    } catch (error: any) {
      toast.error(error.message || '操作失敗');
    }
  };

  const handleEdit = (log: WorkLog) => {
    setEditingLog(log);
    setDate(log.date);
    setTodayTasks(log.today_tasks);
    setTomorrowTasks(log.tomorrow_tasks);
    setSpecialNotes(log.special_notes || '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await showConfirm('確定要刪除此工作日誌嗎？'))) return;
    
    try {
      await api.workLogs.delete(id);
      toast.success('工作日誌已刪除');
      loadLogs();
    } catch (error: any) {
      toast.error(error.message || '刪除失敗');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingLog(null);
    setDate(new Date().toISOString().split('T')[0]);
    setTodayTasks('');
    setTomorrowTasks('');
    setSpecialNotes('');
  };

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || '未知用戶';
  };

  const getUserDept = (userId: string) => {
    return users.find(u => u.id === userId)?.department || '';
  };

  const getDeptName = (deptId: string) => {
    return departments.find(d => d.id === deptId)?.name || deptId;
  };

  // 篩選邏輯
  const displayLogs = useMemo(() => {
    return logs.filter(log => {
      // 部門篩選
      if (filterDept !== 'ALL') {
        const userDept = getUserDept(log.user_id);
        if (userDept !== filterDept) return false;
      }

      // 日期範圍篩選
      if (filterStartDate && log.date < filterStartDate) return false;
      if (filterEndDate && log.date > filterEndDate) return false;

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, filterDept, filterStartDate, filterEndDate]);

  // 初始化主管的部門篩選
  useEffect(() => {
    if (isSupervisor && filterDept === 'ALL') {
      setFilterDept(currentUser.department);
    }
  }, [isSupervisor, currentUser.department]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
      
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>📋</span> 每日工作日誌
          </h2>
          <p className="text-sm text-slate-500 font-bold mt-1">記錄每日工作事項與計劃</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-200 transition transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            新增日誌
          </button>
        )}
      </div>

      {/* 篩選器 */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 部門篩選 */}
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-2">部門篩選</label>
            {isManager ? (
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">🏢 全公司</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            ) : isSupervisor ? (
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-500 cursor-not-allowed flex items-center gap-2">
                <span>🔒</span> {getDeptName(currentUser.department)}
              </div>
            ) : (
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">📋 全部</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* 開始日期 */}
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-2">開始日期</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 結束日期 */}
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-2">結束日期</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 清除篩選 */}
          {(filterDept !== 'ALL' || filterStartDate || filterEndDate) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  if (!isSupervisor) setFilterDept('ALL');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold transition"
              >
                清除篩選
              </button>
            </div>
          )}
        </div>

        {/* 篩選結果統計 */}
        <div className="mt-3 text-xs text-slate-500">
          顯示 <span className="font-bold text-blue-600">{displayLogs.length}</span> 筆記錄
          {filterDept !== 'ALL' && <span> · 部門: {getDeptName(filterDept)}</span>}
          {filterStartDate && <span> · 起: {filterStartDate}</span>}
          {filterEndDate && <span> · 迄: {filterEndDate}</span>}
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">日期</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                disabled={!!editingLog}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">今日工作事項 *</label>
              <textarea
                value={todayTasks}
                onChange={(e) => setTodayTasks(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px]"
                placeholder="記錄今天完成的工作事項..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">明天工作事項 *</label>
              <textarea
                value={tomorrowTasks}
                onChange={(e) => setTomorrowTasks(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px]"
                placeholder="規劃明天要執行的工作事項..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">特別備註</label>
              <textarea
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                placeholder="需要特別注意的事項或問題..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                type="button"
                onClick={resetForm}
                className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition"
              >
                取消
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
              >
                {editingLog ? '更新' : '提交'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {isLoading && (
          <div className="text-center py-10 text-slate-400">載入中...</div>
        )}

        {!isLoading && logs.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
            <div className="text-4xl mb-2 grayscale opacity-50">📋</div>
            <p className="text-slate-400 font-bold">尚無工作日誌記錄</p>
          </div>
        )}

        {!isLoading && displayLogs.map(log => (
          <div key={log.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-800">{getUserName(log.user_id)}</div>
                <div className="text-sm text-slate-500">{log.date}</div>
              </div>
              {(log.user_id === currentUser.id || isManager) && (
                <div className="flex gap-2">
                  {log.user_id === currentUser.id && (
                    <button 
                      onClick={() => handleEdit(log)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 font-bold transition"
                    >
                      編輯
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(log.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-bold transition"
                  >
                    刪除
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-xs font-bold text-slate-500 mb-2">今日工作事項</div>
                <div className="text-sm text-slate-700 bg-blue-50 p-3 rounded-lg border border-blue-100 whitespace-pre-wrap">
                  {log.today_tasks}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 mb-2">明天工作事項</div>
                <div className="text-sm text-slate-700 bg-green-50 p-3 rounded-lg border border-green-100 whitespace-pre-wrap">
                  {log.tomorrow_tasks}
                </div>
              </div>

              {log.special_notes && (
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2">特別備註</div>
                  <div className="text-sm text-slate-700 bg-orange-50 p-3 rounded-lg border border-orange-100 whitespace-pre-wrap">
                    {log.special_notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
