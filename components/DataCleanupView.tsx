import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle, Calendar, Database } from 'lucide-react';

interface DataCleanupViewProps {
  onClose: () => void;
}

interface DataCategory {
  id: string;
  name: string;
  table: string;
  icon: string;
  description: string;
}

const dataCategories: DataCategory[] = [
  { id: 'tasks', name: '任務記錄', table: 'tasks', icon: '📋', description: '已完成或取消的任務' },
  { id: 'leave_requests', name: '請假記錄', table: 'leave_requests', icon: '📅', description: '已處理的請假申請' },
  { id: 'schedules', name: '排班記錄', table: 'schedules', icon: '📊', description: '過期的排班資料' },
  { id: 'attendance', name: '打卡記錄', table: 'attendance_records', icon: '⏰', description: '歷史打卡資料' },
  { id: 'routines', name: '每日任務記錄', table: 'routine_records', icon: '📝', description: '過期的每日任務執行記錄' },
  { id: 'finance', name: '財務記錄', table: 'finance', icon: '💰', description: '歷史財務交易記錄' },
  { id: 'announcements', name: '公告記錄', table: 'announcements', icon: '📢', description: '過期的公告' },
  { id: 'suggestions', name: '提案記錄', table: 'suggestions', icon: '💡', description: '已處理的提案' },
  { id: 'reports', name: '報表記錄', table: 'reports', icon: '📈', description: '歷史營運報表' },
  { id: 'memos', name: '備忘錄', table: 'memos', icon: '📝', description: '過期的備忘錄' }
];

const timeRanges = [
  { value: 1, label: '一個月以前' },
  { value: 2, label: '兩個月以前' },
  { value: 3, label: '三個月以前' },
  { value: 6, label: '六個月以前' }
];

export default function DataCleanupView({ onClose }: DataCleanupViewProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previewCounts, setPreviewCounts] = useState<Record<string, number>>({});
  const [showPreview, setShowPreview] = useState(false);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === dataCategories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(dataCategories.map(c => c.id));
    }
  };

  const handlePreview = async () => {
    if (selectedCategories.length === 0) {
      alert('請至少選擇一個資料分類');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/data-cleanup/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          months: selectedTimeRange,
          categories: selectedCategories
        })
      });

      if (!response.ok) throw new Error('預覽失敗');

      const data = await response.json();
      setPreviewCounts(data.counts);
      setShowPreview(true);
    } catch (error) {
      console.error('預覽錯誤:', error);
      alert('預覽失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/data-cleanup/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          months: selectedTimeRange,
          categories: selectedCategories
        })
      });

      if (!response.ok) throw new Error('刪除失敗');

      const data = await response.json();
      alert(`✅ 刪除成功！\n共刪除 ${data.totalDeleted} 筆資料`);
      setShowConfirmDialog(false);
      setShowPreview(false);
      setSelectedCategories([]);
      setPreviewCounts({});
    } catch (error) {
      console.error('刪除錯誤:', error);
      alert('刪除失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const totalPreviewCount = Object.values(previewCounts).reduce((sum: number, count) => sum + (count as number), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-500 to-orange-500 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">資料清理工具</h2>
                <p className="text-red-100 text-sm mt-1">⚠️ 僅限 BOSS 使用 - 刪除後無法恢復</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: 選擇時間範圍 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-blue-900">步驟 1：選擇時間範圍</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {timeRanges.map(range => (
                <button
                  key={range.value}
                  onClick={() => setSelectedTimeRange(range.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedTimeRange === range.value
                      ? 'border-blue-500 bg-blue-100 text-blue-900 font-bold'
                      : 'border-gray-300 bg-white hover:border-blue-300'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: 選擇資料分類 */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-900">步驟 2：選擇要刪除的資料分類</h3>
              </div>
              <button
                onClick={handleSelectAll}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                {selectedCategories.length === dataCategories.length ? '取消全選' : '全選'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dataCategories.map(category => (
                <label
                  key={category.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedCategories.includes(category.id)
                      ? 'border-purple-500 bg-purple-100'
                      : 'border-gray-300 bg-white hover:border-purple-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="mt-1 w-5 h-5 text-purple-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{category.icon}</span>
                      <span className="font-bold text-gray-900">{category.name}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    {showPreview && previewCounts[category.id] !== undefined && (
                      <p className="text-sm font-bold text-red-600 mt-1">
                        將刪除 {previewCounts[category.id]} 筆
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Preview Results */}
          {showPreview && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <h3 className="font-bold text-yellow-900">預覽結果</h3>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-lg font-bold text-gray-900 mb-2">
                  共找到 <span className="text-red-600">{totalPreviewCount}</span> 筆資料將被刪除
                </p>
                <p className="text-sm text-gray-600">
                  時間範圍：{timeRanges.find(r => r.value === selectedTimeRange)?.label}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={isLoading || selectedCategories.length === 0}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? '處理中...' : '預覽將刪除的資料'}
            </button>
            
            {showPreview && (totalPreviewCount as number) > 0 && (
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={isLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                確認刪除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">確認刪除</h3>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-900 font-bold mb-2">⚠️ 警告：此操作無法復原！</p>
              <p className="text-gray-700 mb-2">
                您即將刪除 <span className="font-bold text-red-600">{totalPreviewCount}</span> 筆資料
              </p>
              <p className="text-sm text-gray-600">
                時間範圍：{timeRanges.find(r => r.value === selectedTimeRange)?.label}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isLoading}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                {isLoading ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
