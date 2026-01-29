import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, AlertTriangle, CheckCircle, Clock, HardDrive } from 'lucide-react';

interface BackupInfo {
  filename: string;
  size: number;
  created: string;
  timestamp: number;
}

interface BackupStatus {
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  totalBackups: number;
  latestBackup: BackupInfo | null;
  hoursSinceLastBackup: string | null;
  backups: BackupInfo[];
}

export const BackupMonitorView: React.FC = () => {
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchBackupStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/backup/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch backup status');
      }

      const data = await response.json();
      setBackupStatus(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupStatus();
    
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchBackupStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-6 h-6" />;
      case 'warning': return <AlertTriangle className="w-6 h-6" />;
      case 'error': return <AlertTriangle className="w-6 h-6" />;
      default: return <Clock className="w-6 h-6" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return '正常運行';
      case 'warning': return '需要注意';
      case 'error': return '異常狀態';
      default: return '未知狀態';
    }
  };

  if (loading && !backupStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-slate-600">載入備份狀態...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-bold text-red-900">無法載入備份狀態</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchBackupStatus}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          重試
        </button>
      </div>
    );
  }

  if (!backupStatus) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">備份系統監控</h1>
        </div>
        <button
          onClick={fetchBackupStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* Status Overview */}
      <div className={`border-2 rounded-lg p-6 ${getStatusColor(backupStatus.status)}`}>
        <div className="flex items-center gap-4">
          {getStatusIcon(backupStatus.status)}
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">
              備份系統狀態：{getStatusText(backupStatus.status)}
            </h2>
            {backupStatus.latestBackup && (
              <p className="text-sm">
                最後備份：{formatDate(backupStatus.latestBackup.created)}
                {backupStatus.hoursSinceLastBackup && (
                  <span className="ml-2">
                    ({parseFloat(backupStatus.hoursSinceLastBackup).toFixed(1)} 小時前)
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-700">備份總數</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{backupStatus.totalBackups}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-700">最新大小</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {backupStatus.latestBackup ? formatBytes(backupStatus.latestBackup.size) : 'N/A'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-700">更新頻率</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">每小時</p>
        </div>
      </div>

      {/* Backup List */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">最近備份記錄</h2>
          <p className="text-sm text-slate-600 mt-1">
            最後更新：{lastRefresh.toLocaleTimeString('zh-TW')}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase">檔案名稱</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase">建立時間</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase">大小</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {backupStatus.backups.map((backup, index) => (
                <tr key={backup.filename} className={index === 0 ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                  <td className="px-6 py-4 text-sm font-mono text-slate-900">
                    {backup.filename}
                    {index === 0 && (
                      <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">最新</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(backup.created)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatBytes(backup.size)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      ✓ 正常
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning Message */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-yellow-900 mb-1">資料完整性提醒</h3>
            <p className="text-sm text-yellow-800">
              當前備份資料範圍：2026-01-06 至 2026-01-26
              <br />
              ⚠️ 缺少 2026-01-27 至 2026-01-29 的資料
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
