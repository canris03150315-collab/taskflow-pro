import React, { useState, useEffect } from 'react';
import { WorkLog, User, DepartmentDef, Role } from '../types';
import { api } from '../services/api';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/dialogService';
import { EmptyState } from './EmptyState';

interface WorkLogTabProps {
  currentUser: User;
  departments: DepartmentDef[];
  users: User[];
}

const WorkLogTab: React.FC<WorkLogTabProps> = ({ currentUser, departments, users }) => {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const getLocalDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDate());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [formData, setFormData] = useState({
    date: getLocalDate(),
    todayTasks: '',
    tomorrowTasks: '',
    notes: '',
  });

  // Permission check
  const canViewAllDepts = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;
  const availableDepts = canViewAllDepts
    ? departments
    : departments.filter((d) => d.id === currentUser.department);

  // Filter users by selected department
  const filteredUsers =
    selectedDept === 'ALL' ? users : users.filter((u) => u.department === selectedDept);

  // Load logs
  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: any = { date: selectedDate };

      if (selectedDept !== 'ALL') {
        params.departmentId = selectedDept;
      }

      if (selectedUser !== 'ALL') {
        params.userId = selectedUser;
      }

      const response = await api.workLogs.getAll(params);
      setLogs(Array.isArray(response) ? response : response.logs || []);
    } catch (error) {
      console.error('Failed to load work logs:', error);
      showError('載入工作日誌失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedDept, selectedUser, selectedDate]);

  // Listen for real-time updates
  useEffect(() => {
    const handleUpdate = () => {
      loadLogs();
    };
    window.addEventListener('worklog-updated', handleUpdate);
    return () => window.removeEventListener('worklog-updated', handleUpdate);
  }, [selectedDept, selectedUser, selectedDate]);

  const handleCreate = () => {
    setEditingLog(null);
    setFormData({
      date: selectedDate,
      todayTasks: '',
      tomorrowTasks: '',
      notes: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEdit = (log: WorkLog) => {
    setEditingLog(log);
    setFormData({
      date: log.date,
      todayTasks: log.todayTasks,
      tomorrowTasks: log.tomorrowTasks,
      notes: log.notes,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setFormError('');
    if (!formData.todayTasks.trim() || !formData.tomorrowTasks.trim()) {
      showWarning('請填寫今日工作事項和明天工作事項');
      return;
    }

    try {
      if (editingLog) {
        await api.workLogs.update(editingLog.id, {
          todayTasks: formData.todayTasks,
          tomorrowTasks: formData.tomorrowTasks,
          notes: formData.notes,
        });
      } else {
        await api.workLogs.create(formData);
      }

      setIsModalOpen(false);
      showSuccess(editingLog ? '工作日誌已更新' : '工作日誌已建立');
      await loadLogs();
    } catch (error: any) {
      console.error('Failed to save work log:', error);
      const msg = error.message || '保存失敗';
      const displayMsg = msg.includes('already exists')
        ? '今天的工作日誌已存在，無法重複建立'
        : msg;
      setFormError(displayMsg);
      showError(displayMsg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await showConfirm('確定要刪除這條工作日誌嗎？'))) return;

    try {
      await api.workLogs.delete(id);
      loadLogs();
    } catch (error) {
      console.error('Failed to delete work log:', error);
      showError('刪除失敗');
    }
  };

  return (
    <div className="work-log-tab">
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        {canViewAllDepts && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">部門</label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedUser('ALL');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">全部部門</option>
              {availableDepts.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">員工</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">全部員工</option>
            {filteredUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="ml-auto">
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 新增日誌
          </button>
        </div>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">載入中...</div>
      ) : !logs || logs.length === 0 ? (
        <EmptyState
          icon="📓"
          title={
            selectedDate === new Date().toISOString().split('T')[0]
              ? '今天還沒有工作日誌'
              : '這天沒有工作日誌'
          }
        />
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">
                    📅 {log.date} - {log.userName} ({log.departmentName})
                  </h3>
                  <p className="text-sm text-gray-500">
                    創建時間: {new Date(log.createdAt).toLocaleString('zh-TW')}
                  </p>
                </div>
                {log.userId === currentUser.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(log)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      刪除
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">📌 今日工作事項:</h4>
                  <div className="pl-4 text-gray-600 whitespace-pre-wrap">{log.todayTasks}</div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-1">📌 明天工作事項:</h4>
                  <div className="pl-4 text-gray-600 whitespace-pre-wrap">{log.tomorrowTasks}</div>
                </div>

                {log.notes && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">📌 特別備註:</h4>
                    <div className="pl-4 text-gray-600 whitespace-pre-wrap">{log.notes}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingLog ? '編輯工作日誌' : '新增工作日誌'}
            </h2>

            <form onSubmit={handleSubmit}>
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-bold flex items-center gap-2">
                  <span>❌</span> {formError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    disabled={!!editingLog}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📌 今日工作事項 *
                  </label>
                  <textarea
                    value={formData.todayTasks}
                    onChange={(e) => setFormData({ ...formData, todayTasks: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={5}
                    placeholder="請輸入今天完成的工作..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📌 明天工作事項 *
                  </label>
                  <textarea
                    value={formData.tomorrowTasks}
                    onChange={(e) => setFormData({ ...formData, tomorrowTasks: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={5}
                    placeholder="請輸入明天計劃的工作..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📌 特別備註
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="其他需要注意的事項..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkLogTab;
