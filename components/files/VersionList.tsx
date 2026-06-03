// components/files/VersionList.tsx
import React, { useState } from 'react';
import { FileVersion, User } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { formatFileSize } from '../FileTypeIcon';
import { showConfirm } from '../../utils/dialogService';

interface VersionListProps {
  fileId: string;
  filename: string;
  versions: FileVersion[];
  currentUser: User;
  onPreview: (versionNo: number, mimeType: string) => void;
  onChanged: () => void;
}

export const VersionList: React.FC<VersionListProps> = ({
  fileId,
  filename,
  versions,
  currentUser,
  onPreview,
  onChanged,
}) => {
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? versions : versions.slice(0, 5);
  const hidden = versions.length - visible.length;
  const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';

  const handleDelete = async (versionNo: number) => {
    if (!(await showConfirm('確定刪除這個版本？將進入垃圾桶 48 小時'))) return;
    try {
      await api.files.deleteVersion(fileId, versionNo);
      toast.success('已刪除');
      onChanged();
    } catch (e: any) {
      toast.error(e.message || '刪除失敗');
    }
  };

  const handleDownload = async (versionNo: number) => {
    try {
      await api.files.download(fileId, versionNo, filename);
    } catch (e: any) {
      toast.error(e.message || '下載失敗');
    }
  };

  return (
    <div className="bg-stone-50/60 border-t border-slate-100">
      <ul className="divide-y divide-slate-100">
        {visible.map((v) => {
          const isLatest = v.version_no === versions[0].version_no;
          const canDelete = v.uploader_id === currentUser.id || isManager;
          return (
            <li key={v.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white">
              <span
                className={`text-xs font-mono font-bold px-2 py-1 rounded ${
                  isLatest ? 'text-white bg-emerald-600' : 'text-slate-700 bg-slate-200'
                }`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                v{v.version_no}
              </span>
              {isLatest && <span className="text-xs font-bold text-emerald-600">最新</span>}
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium text-slate-800 truncate"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {v.uploader_name || '?'} · {new Date(v.uploaded_at).toLocaleString('zh-TW')} ·{' '}
                  {formatFileSize(v.file_size)}
                </div>
                {v.note && (
                  <div className="text-xs text-slate-500 truncate italic mt-0.5">💬 {v.note}</div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-blue-50"
                  onClick={() => onPreview(v.version_no, v.mime_type)}
                >
                  預覽
                </button>
                <button
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-blue-50"
                  onClick={() => handleDownload(v.version_no)}
                >
                  下載
                </button>
                {canDelete && (
                  <button
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(v.version_no)}
                  >
                    刪除
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {hidden > 0 && (
          <li className="px-4 py-3 bg-stone-100 border-t-2 border-dashed border-slate-300">
            <button
              className="w-full text-center text-sm font-bold text-slate-600 hover:text-blue-600"
              onClick={() => setShowAll(true)}
            >
              展開更早的 {hidden} 個版本
            </button>
          </li>
        )}
      </ul>
    </div>
  );
};
