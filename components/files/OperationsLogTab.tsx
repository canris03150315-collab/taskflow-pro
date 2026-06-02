// components/files/OperationsLogTab.tsx
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { EmptyState } from '../EmptyState';

interface OperationsLogTabProps {
  currentUser: User;
}

const ACTION_LABEL: Record<string, { label: string; class: string }> = {
  upload: { label: '📤 上傳', class: 'bg-emerald-100 text-emerald-700' },
  download: { label: '⬇️ 下載', class: 'bg-blue-100 text-blue-700' },
  delete: { label: '🗑 刪除', class: 'bg-red-100 text-red-700' },
  restore: { label: '↩ 救回', class: 'bg-purple-100 text-purple-700' },
};

export const OperationsLogTab: React.FC<OperationsLogTabProps> = ({ currentUser }) => {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';

  const load = async () => {
    if (!isManager) return;
    setLoading(true);
    try {
      const result = await api.files.listOperations({
        ...(actionFilter && { action: actionFilter }),
      });
      setItems(result);
    } catch (e: any) {
      toast.error(e.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter]);

  if (!isManager) {
    return <EmptyState icon="🔒" title="只有 BOSS/MANAGER 能查看操作紀錄" />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-700">📋 全公司檔案操作紀錄</h3>
        <select
          className="px-3 py-1.5 bg-stone-50 border border-slate-200 rounded-lg text-sm"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">全部動作</option>
          <option value="upload">上傳</option>
          <option value="download">下載</option>
          <option value="delete">刪除</option>
          <option value="restore">救回</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">載入中...</div>
      ) : items.length === 0 ? (
        <EmptyState icon="📋" title="目前沒有操作紀錄" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-slate-600">
                <th className="p-3 font-bold">時間</th>
                <th className="p-3 font-bold">操作者</th>
                <th className="p-3 font-bold">動作</th>
                <th className="p-3 font-bold">檔案</th>
                <th className="p-3 font-bold">版本</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((op) => {
                const meta = ACTION_LABEL[op.action] || {
                  label: op.action,
                  class: 'bg-slate-100 text-slate-700',
                };
                return (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td
                      className="p-3 font-mono text-xs text-slate-500"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {new Date(op.created_at).toLocaleString('zh-TW')}
                    </td>
                    <td className="p-3">{op.actor_name || '?'}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded font-bold ${meta.class}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">{op.filename || '?'}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {op.version_no ? `v${op.version_no}` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
