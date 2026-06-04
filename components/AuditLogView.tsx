import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from './Toast';
import { EmptyState } from './EmptyState';
import { User } from '../types';

interface AuditLog {
  id: string;
  authorization_id: string;
  action: string;
  user_id: string;
  user_name: string;
  user_role: string;
  user_dept: string;
  target_user_id: string;
  target_user_name: string;
  reason: string;
  created_at: string;
  metadata: string;
}

interface AuditLogViewProps {
  currentUser: User;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ currentUser }) => {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const pageSize = 20;

  useEffect(() => {
    loadAuditLogs();
  }, [currentPage, actionFilter, startDate, endDate]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await api.reports.approval.getAuditLog({
        action: actionFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      });

      setLogs(response.logs);
      setTotal(response.total);
    } catch (error: any) {
      console.error('Failed to load audit logs:', error);
      toast.error(error.message || '載入審核記錄失敗');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      REQUEST: { bg: 'bg-blue-100', text: 'text-blue-800', label: '📤 申請' },
      APPROVE: { bg: 'bg-green-100', text: 'text-green-800', label: '✅ 批准' },
      REJECT: { bg: 'bg-red-100', text: 'text-red-800', label: '❌ 拒絕' },
      REVOKE: { bg: 'bg-stone-100', text: 'text-slate-800', label: '🔄 撤銷' },
    };

    const badge = badges[action] || { bg: 'bg-stone-100', text: 'text-slate-800', label: action };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-slate-700" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5 4a3 3 0 013-3h4a3 3 0 013 3h2a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h2zm3-1.5a1.5 1.5 0 00-1.5 1.5h7A1.5 1.5 0 0012 2.5H8zm-.061 7.97a.75.75 0 011.06.011L9 11.475l1.97-1.96a.75.75 0 011.06 1.07l-2.5 2.5a.75.75 0 01-1.06 0l-1.5-1.5a.75.75 0 01.029-1.05z"
                clipRule="evenodd"
              />
            </svg>
            審核歷史記錄
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            查看所有報表審核操作記錄 · 共 {total} 條記錄
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">操作類型</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">全部</option>
              <option value="REQUEST">📤 申請</option>
              <option value="APPROVE">✅ 批准</option>
              <option value="REJECT">❌ 拒絕</option>
              <option value="REVOKE">🔄 撤銷</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">開始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">結束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setActionFilter('ALL');
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-stone-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
            >
              🔄 清除篩選
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-500">
            <svg className="w-6 h-6 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path
                d="M22 12a10 10 0 0 1-10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-sm">載入中...</p>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon="🔍" title="沒有找到審核記錄" />
        ) : (
          <div className="overflow-x-auto scroll-hint-x">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    操作類型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    操作者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    目標用戶
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    原因
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getActionBadge(log.action)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-slate-900">{log.user_name}</div>
                        <div className="text-slate-500">
                          {log.user_dept} · {log.user_role}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {log.target_user_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 max-w-md truncate">
                      {log.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-4">
          <div className="text-sm text-slate-700">
            顯示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, total)}{' '}
            條，共 {total} 條記錄
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-stone-100 text-slate-700 rounded-lg hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一頁
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 rounded-lg transition ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-stone-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-stone-100 text-slate-700 rounded-lg hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一頁
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
