import React, { useState, useCallback } from 'react';
import { User } from '../types';

const API_BASE_URL = '/api';

interface RevenueUploadTabProps {
  currentUser: User;
}

interface ParseResult {
  success: boolean;
  total: number;
  records: any[];
  fileName: string;
}

export const RevenueUploadTab: React.FC<RevenueUploadTabProps> = ({ currentUser }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

      // 直接自動匯入所有記錄
      await handleImport(result.records);
    } catch (error) {
      console.error('Upload error:', error);
      alert('上傳失敗，請稍後再試');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async (records: any[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/platform-revenue/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records })
      });

      if (!response.ok) {
        throw new Error('匯入失敗');
      }

      const importResult = await response.json();
      const message = `同步完成！已處理共 ${importResult.imported} 筆資料` +
        (importResult.inserted > 0 ? `（新增 ${importResult.inserted} 筆）` : '') +
        (importResult.updated > 0 ? `（更新 ${importResult.updated} 筆）` : '') +
        (importResult.skipped > 0 ? `（已自動過濾 ${importResult.skipped} 筆完全重複的數據）` : '');
      
      alert(message);
      setSelectedFile(null);
    } catch (error) {
      console.error('Import error:', error);
      alert('匯入失敗，請稍後再試');
    }
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

    </div>
  );
};
