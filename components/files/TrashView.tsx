// components/files/TrashView.tsx
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { EmptyState } from '../EmptyState';

interface TrashViewProps {
  currentUser: User;
  onClose: () => void;
}

export const TrashView: React.FC<TrashViewProps> = ({ currentUser, onClose }) => {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.files.listTrash();
      setItems(result);
    } catch (e: any) {
      toast.error(e.message || '載入垃圾桶失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const restore = async (fileId: string, versionNo: number) => {
    try {
      await api.files.restoreVersion(fileId, versionNo);
      toast.success('已救回');
      load();
    } catch (e: any) {
      toast.error(e.message || '救回失敗');
    }
  };

  const remainingHours = (deletedAt: string) => {
    const elapsed = (Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60);
    return Math.max(0, Math.round(48 - elapsed));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">🗑 垃圾桶</h3>
          <button onClick={onClose} className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded">
            ✕
          </button>
        </div>
        <div className="bg-red-50 border-y border-red-200 px-5 py-3 text-sm text-red-700">
          已刪除的版本保留 48 小時，過期自動清除。
        </div>
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="text-center py-10 text-slate-400">載入中...</div>
          ) : items.length === 0 ? (
            <EmptyState icon="🗑" title="垃圾桶是空的" />
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-700 truncate">
                      {item.filename} · v{item.version_no}
                    </div>
                    <div
                      className="text-xs text-slate-400 mt-0.5"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      刪除時間：{new Date(item.deleted_at).toLocaleString('zh-TW')} · by{' '}
                      {item.deleter_name}
                    </div>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">
                    剩 {remainingHours(item.deleted_at)} 小時
                  </span>
                  <button
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600"
                    onClick={() => restore(item.file_id, item.version_no)}
                  >
                    救回
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
