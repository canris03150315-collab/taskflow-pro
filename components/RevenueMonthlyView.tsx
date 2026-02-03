import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { Download, Upload, Save, X } from 'lucide-react';

const API_BASE_URL = '/api';

interface RevenueMonthlyViewProps {
  currentUser: User;
}

interface DailyRecord {
  date: string;
  lottery_wage: number;
  lottery_rebate: number;
  game_ag: number;
  game_chess: number;
  game_rebate: number;
  game_private: number;
  lottery_dividend_receive: number;
  lottery_dividend_send: number;
  external_dividend_receive: number;
  external_dividend_send: number;
  private_return: number;
  deposit_amount: number;
  withdrawal_amount: number;
  loan_amount: number;
  profit: number;
  balance: number;
}

export default function RevenueMonthlyView({ currentUser }: RevenueMonthlyViewProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [monthlyData, setMonthlyData] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{ day: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Check if user has edit permission (SUPERVISOR, MANAGER, or BOSS)
  const canEdit = currentUser.role === Role.SUPERVISOR || 
                  currentUser.role === Role.MANAGER || 
                  currentUser.role === Role.BOSS;

  useEffect(() => {
    loadPlatforms();
    // Set default month to current month
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(defaultMonth);
  }, []);

  useEffect(() => {
    if (selectedPlatform && selectedMonth) {
      loadMonthlyData();
    }
  }, [selectedPlatform, selectedMonth]);

  const loadPlatforms = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/platform-revenue/platforms`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPlatforms(data.platforms || []);
        if (data.platforms && data.platforms.length > 0) {
          setSelectedPlatform(data.platforms[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load platforms:', error);
    }
  };

  const loadMonthlyData = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const response = await fetch(
        `${API_BASE_URL}/platform-revenue?startDate=${startDate}&endDate=${endDate}&platform=${selectedPlatform}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setMonthlyData(data.records || []);
      }
    } catch (error) {
      console.error('Failed to load monthly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayData = (day: number): DailyRecord | null => {
    const [year, month] = selectedMonth.split('-');
    const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
    return monthlyData.find(r => r.date === dateStr) || null;
  };

  const handleCellClick = (day: number, field: string) => {
    if (!canEdit) return;
    
    const data = getDayData(day);
    const value = data ? data[field as keyof DailyRecord] : 0;
    setEditingCell({ day, field });
    setEditValue(String(value));
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    const [year, month] = selectedMonth.split('-');
    const dateStr = `${year}-${month}-${String(editingCell.day).padStart(2, '0')}`;
    
    try {
      const response = await fetch(`${API_BASE_URL}/platform-revenue/update-cell`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          date: dateStr,
          field: editingCell.field,
          value: parseFloat(editValue) || 0
        })
      });

      if (response.ok) {
        await loadMonthlyData();
        setEditingCell(null);
      }
    } catch (error) {
      console.error('Failed to update cell:', error);
    }
  };

  const calculateTotal = (field: string): number => {
    return monthlyData.reduce((sum, record) => sum + (record[field as keyof DailyRecord] as number || 0), 0);
  };

  const getDaysInMonth = (): number => {
    if (!selectedMonth) return 31;
    const [year, month] = selectedMonth.split('-');
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };

  const columns = [
    { key: 'lottery_wage', label: '彩票工資' },
    { key: 'lottery_rebate', label: '彩票反點' },
    { key: 'game_ag', label: '真人AG' },
    { key: 'game_chess', label: '棋牌' },
    { key: 'game_rebate', label: '外接返點' },
    { key: 'game_private', label: '真人私返' },
    { key: 'lottery_dividend_receive', label: '彩票領取分紅' },
    { key: 'lottery_dividend_send', label: '彩票下發分紅' },
    { key: 'external_dividend_receive', label: '外接領取分紅' },
    { key: 'external_dividend_send', label: '外接下發分紅' },
    { key: 'private_return', label: '私返' },
    { key: 'deposit_amount', label: '充值' },
    { key: 'withdrawal_amount', label: '提款' },
    { key: 'loan_amount', label: '借款' },
    { key: 'profit', label: '營利' },
    { key: 'balance', label: '餘額' }
  ];

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">平台</label>
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {platforms.map(platform => (
              <option key={platform} value={platform}>{platform}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">月份</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-2 items-end">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            匯出 Excel
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            上傳 Excel
          </button>
        </div>
      </div>

      {/* Permission Notice */}
      {!canEdit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          ⚠️ 您沒有編輯權限。只有主管以上職級可以編輯數據。
        </div>
      )}

      {/* Monthly Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">載入中...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                    日期
                  </th>
                  {columns.map(col => (
                    <th key={col.key} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map(day => {
                  const data = getDayData(day);
                  return (
                    <tr key={day} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900 sticky left-0 bg-white">
                        {day}
                      </td>
                      {columns.map(col => {
                        const value = data ? data[col.key as keyof DailyRecord] : 0;
                        const isEditing = editingCell?.day === day && editingCell?.field === col.key;
                        
                        return (
                          <td
                            key={col.key}
                            className={`px-4 py-2 text-right whitespace-nowrap ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                            onClick={() => handleCellClick(day, col.key)}
                          >
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-24 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCellSave();
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCellSave(); }}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingCell(null); }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className={value === 0 ? 'text-gray-400' : ''}>
                                {typeof value === 'number' ? value.toLocaleString() : value}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {/* Total Row */}
                <tr className="bg-blue-50 font-bold">
                  <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-blue-50">
                    合計
                  </td>
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-right whitespace-nowrap text-blue-900">
                      {calculateTotal(col.key).toLocaleString()}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
