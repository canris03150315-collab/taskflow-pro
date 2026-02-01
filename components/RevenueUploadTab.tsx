import React, { useState, useCallback } from 'react';
import { User } from '../types';

const API_BASE_URL = '/api';

interface RevenueUploadTabProps {
  currentUser: User;
}

interface DuplicateRecord {
  platform: string;
  date: string;
  existing: any;
  new: any;
  differences: Record<string, { old: number; new: number; change: number }>;
}

interface ParseResult {
  hasConflicts: boolean;
  duplicates: DuplicateRecord[];
  newRecords: any[];
  totalRecords: number;
  fileName: string;
}

export const RevenueUploadTab: React.FC<RevenueUploadTabProps> = ({ currentUser }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('請上傳 Excel 檔案（.xlsx 或 .xls）');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('檔案過大，請上傳小於 10MB 的檔案');
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/platform-revenue/parse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('解析失敗');
      }

      const result: ParseResult = await response.json();
      setParseResult(result);

      if (result.hasConflicts) {
        setShowConflictModal(true);
      } else {
        await handleImport('skip');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('上傳失敗，請稍後再試');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async (action: 'overwrite' | 'skip' | 'cancel') => {
    if (action === 'cancel') {
      setShowConflictModal(false);
      setParseResult(null);
      setSelectedFile(null);
      return;
    }

    if (!parseResult) return;

    try {
      const recordsToImport = action === 'overwrite'
        ? [...parseResult.newRecords, ...parseResult.duplicates.map(d => d.new)]
        : parseResult.newRecords;

      const response = await fetch(`${API_BASE_URL}/platform-revenue/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: recordsToImport,
          action: action,
          fileName: parseResult.fileName
        })
      });

      if (!response.ok) {
        throw new Error('匯入失敗');
      }

      const result = await response.json();
      alert(`成功匯入 ${result.imported} 筆數據`);
      
      setShowConflictModal(false);
      setParseResult(null);
      setSelectedFile(null);
    } catch (error) {
      console.error('Import error:', error);
      alert('匯入失敗，請稍後再試');
    }
  };

  const fieldNames: Record<string, string> = {
    lottery_amount: '彩票',
    external_game_amount: '外接遊戲',
    lottery_dividend: '彩票分紅',
    external_dividend: '外接分紅',
    private_return: '私返',
    deposit_amount: '充值',
    withdrawal_amount: '提款',
    loan_amount: '借款',
    profit: '營利',
    balance: '餘額'
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">📤 上傳平台營收報表</h2>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
        >
          {isUploading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">解析中...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-6xl">📊</div>
              <div>
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  拖曳 Excel 檔案到此處，或點擊選擇檔案
                </p>
                <p className="text-sm text-gray-500">
                  支援 .xlsx 和 .xls 格式，檔案大小限制 10MB
                </p>
              </div>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <span className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block">
                  選擇檔案
                </span>
              </label>
            </div>
          )}
        </div>

        {selectedFile && !isUploading && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">
              ✓ 已選擇檔案：<strong>{selectedFile.name}</strong>
            </p>
          </div>
        )}
      </div>

      {showConflictModal && parseResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-orange-600">⚠️ 發現重複數據</h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                以下 <strong>{parseResult.duplicates.length}</strong> 筆數據已存在，請選擇處理方式：
              </p>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {parseResult.duplicates.slice(0, 5).map((dup, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="font-semibold mb-2">
                      平台：{dup.platform} | 日期：{dup.date}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-300">
                            <th className="text-left py-2 px-3">欄位</th>
                            <th className="text-right py-2 px-3">現有數據</th>
                            <th className="text-right py-2 px-3">新數據</th>
                            <th className="text-right py-2 px-3">差異</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(dup.differences).map(([field, diff]) => (
                            <tr key={field} className="border-b border-gray-200">
                              <td className="py-2 px-3">{fieldNames[field] || field}</td>
                              <td className="text-right py-2 px-3">{diff.old.toLocaleString()}</td>
                              <td className="text-right py-2 px-3">{diff.new.toLocaleString()}</td>
                              <td className={`text-right py-2 px-3 font-semibold ${
                                diff.change > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {diff.change > 0 ? '+' : ''}{diff.change.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                {parseResult.duplicates.length > 5 && (
                  <p className="text-gray-500 text-center">
                    還有 {parseResult.duplicates.length - 5} 筆重複數據...
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ 覆蓋後將記錄修改歷史，可在「修改記錄」頁面查看
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">處理方式：</p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="action" value="overwrite" defaultChecked className="w-4 h-4" />
                    <span>覆蓋舊數據（使用新數據）⚠️</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="action" value="skip" className="w-4 h-4" />
                    <span>保留舊數據（跳過新數據）</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => handleImport('cancel')}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const action = (document.querySelector('input[name="action"]:checked') as HTMLInputElement)?.value as 'overwrite' | 'skip';
                  handleImport(action || 'overwrite');
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ✓ 確認處理 ({parseResult.duplicates.length} 筆重複)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
