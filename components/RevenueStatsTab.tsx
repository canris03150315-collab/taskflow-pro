import React, { useState, useEffect } from 'react';
import { User, DepartmentDef } from '../types';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/dialogService';

const API_BASE_URL = '/api';

interface RevenueStatsTabProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
}

interface PlatformStats {
  platform_name: string;
  record_count: number;
  total_deposit: number;
  total_withdrawal: number;
  total_profit: number;
  avg_profit: number;
  max_profit: number;
  min_profit: number;
  // 詳細欄位
  total_lottery_wage?: number;
  total_lottery_rebate?: number;
  total_game_ag?: number;
  total_game_chess?: number;
  total_game_rebate?: number;
  total_game_private?: number;
  total_lottery_dividend_receive?: number;
  total_lottery_dividend_send?: number;
  total_external_dividend_receive?: number;
  total_external_dividend_send?: number;
}

interface TransactionRecord {
  id: string;
  platform_name: string;
  date: string;
  lottery_amount: number;
  external_game_amount: number;
  lottery_dividend: number;
  external_dividend: number;
  private_return: number;
  deposit_amount: number;
  withdrawal_amount: number;
  loan_amount: number;
  profit: number;
  balance: number;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_at: string;
  last_modified_by?: string;
  last_modified_by_name?: string;
  last_modified_at?: string;
  // 詳細欄位
  lottery_wage?: number;
  lottery_rebate?: number;
  game_ag?: number;
  game_chess?: number;
  game_rebate?: number;
  game_private?: number;
  lottery_dividend_receive?: number;
  lottery_dividend_send?: number;
  external_dividend_receive?: number;
  external_dividend_send?: number;
}

export const RevenueStatsTab: React.FC<RevenueStatsTabProps> = ({ currentUser, users, departments }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [stats, setStats] = useState<PlatformStats[]>([]);
  const [records, setRecords] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'stats' | 'details'>('stats');
  const [detailView, setDetailView] = useState<'summary' | 'detailed'>('summary');

  useEffect(() => {
    loadPlatforms();
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      if (viewMode === 'stats') {
        loadStats();
      } else {
        loadRecords();
      }
    }
  }, [startDate, endDate, selectedPlatform, viewMode]);

  const loadPlatforms = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/platform-revenue/platforms`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPlatforms(data.platforms || []);
      }
    } catch (error) {
      console.error('Load platforms error:', error);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`${API_BASE_URL}/platform-revenue/stats/platform?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || []);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedPlatform) params.append('platform', selectedPlatform);

      const response = await fetch(`${API_BASE_URL}/platform-revenue?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Load records error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedPlatform) params.append('platform', selectedPlatform);
      params.append('format', 'xlsx');

      const response = await fetch(`${API_BASE_URL}/platform-revenue/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `platform-revenue-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
      showError('匯出失敗');
    }
  };

  const canEdit = ['SUPERVISOR', 'MANAGER', 'BOSS'].includes(currentUser.role);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">📊 平台統計</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('stats')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'stats'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              統計視圖
            </button>
            <button
              onClick={() => setViewMode('details')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'details'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              詳細資料
            </button>
          </div>
        </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-2">平台</label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">全部平台</option>
              {platforms.map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleExport}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📥 匯出 Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">載入中...</p>
          </div>
        ) : viewMode === 'stats' ? (
          <>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setDetailView('summary')}
                className={`px-4 py-2 rounded-lg ${
                  detailView === 'summary'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                簡要視圖
              </button>
              <button
                onClick={() => setDetailView('detailed')}
                className={`px-4 py-2 rounded-lg ${
                  detailView === 'detailed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                詳細視圖
              </button>
            </div>

            {detailView === 'summary' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平台</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">記錄數</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">總充值</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">總提款</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">總營利</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">平均營利</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.map((stat, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{stat.platform_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">{stat.record_count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">{stat.total_deposit.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">{stat.total_withdrawal.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-green-600">
                          {stat.total_profit.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">{stat.avg_profit?.toFixed(2) || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">平台</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">記錄數</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">總充值</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">總提款</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">總營利</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">彩票工資</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">彩票反點</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">真人AG</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">棋牌</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">外接返點</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">真人私返</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">彩票領取分紅</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">彩票下發分紅</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">外接領取分紅</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">外接下發分紅</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.map((stat, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap font-medium">{stat.platform_name}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">{stat.record_count}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">{stat.total_deposit.toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">{stat.total_withdrawal.toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right font-semibold text-green-600">
                          {stat.total_profit.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">{(stat.total_lottery_wage || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">{(stat.total_lottery_rebate || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">{(stat.total_game_ag || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">{(stat.total_game_chess || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">{(stat.total_game_rebate || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">{(stat.total_game_private || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">{(stat.total_lottery_dividend_receive || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">{(stat.total_lottery_dividend_send || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">{(stat.total_external_dividend_receive || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">{(stat.total_external_dividend_send || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">平台</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">充值</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">提款</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">營利</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">上傳者</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最後修改</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap font-medium">{record.platform_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{record.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{record.deposit_amount.toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{record.withdrawal_amount.toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-green-600">
                      {record.profit.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div>{record.uploaded_by_name}</div>
                      <div className="text-gray-500 text-xs">{new Date(record.uploaded_at).toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {record.last_modified_by_name ? (
                        <>
                          <div>{record.last_modified_by_name}</div>
                          <div className="text-gray-500 text-xs">{new Date(record.last_modified_at!).toLocaleString()}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
