import React, { useState, useEffect } from 'react';
import { User } from '../types';

const API_BASE_URL = '/api';

interface RevenueHistoryTabProps {
  currentUser: User;
  users: User[];
}

interface HistoryRecord {
  id: string;
  transaction_id: string;
  action_type: string;
  action_by: string;
  action_by_name: string;
  action_at: string;
  old_data?: string;
  new_data?: string;
  changes_summary: string;
}

export const RevenueHistoryTab: React.FC<RevenueHistoryTabProps> = ({ currentUser, users }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadHistory();
    }
  }, [startDate, endDate, selectedUser, selectedAction]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedUser) params.append('actionBy', selectedUser);
      if (selectedAction) params.append('actionType', selectedAction);

      const response = await fetch(`${API_BASE_URL}/platform-revenue/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Load history error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (historyId: string) => {
    if (!confirm('確定要還原此記錄嗎？')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/platform-revenue/restore/${historyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('還原成功');
        loadHistory();
      } else {
        const error = await response.json();
        alert(error.error || '還原失敗');
      }
    } catch (error) {
      console.error('Restore error:', error);
      alert('還原失敗');
    }
  };

  const canRestore = ['SUPERVISOR', 'MANAGER', 'BOSS'].includes(currentUser.role);

  const actionTypeLabels: Record<string, string> = {
    'CREATE': '新增',
    'UPDATE': '修改',
    'DELETE': '刪除',
    'RESTORE': '還原'
  };

  const actionTypeColors: Record<string, string> = {
    'CREATE': 'bg-green-100 text-green-800',
    'UPDATE': 'bg-blue-100 text-blue-800',
    'DELETE': 'bg-red-100 text-red-800',
    'RESTORE': 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">📜 修改記錄</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">開始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">結束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">操作者</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">全部</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">操作類型</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">全部</option>
              <option value="CREATE">新增</option>
              <option value="UPDATE">修改</option>
              <option value="DELETE">刪除</option>
              <option value="RESTORE">還原</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">載入中...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">時間</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作者</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">類型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">變更摘要</th>
                  {canRestore && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {new Date(record.action_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {record.action_by_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        actionTypeColors[record.action_type] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {actionTypeLabels[record.action_type] || record.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.changes_summary}
                    </td>
                    {canRestore && (
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {(record.action_type === 'UPDATE' || record.action_type === 'DELETE') && record.old_data && (
                          <button
                            onClick={() => handleRestore(record.id)}
                            className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                            title="還原到此版本"
                          >
                            ↩️ 還原
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {history.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                無修改記錄
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
