// components/files/CompanyFilesTab.tsx
import React, { useState, useEffect } from 'react';
import { User, FileRecord } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { FileListItem } from './FileListItem';
import { ExcelPreview } from './ExcelPreview';
import { EmptyState } from '../EmptyState';

interface CompanyFilesTabProps {
  currentUser: User;
}

export const CompanyFilesTab: React.FC<CompanyFilesTabProps> = ({ currentUser }) => {
  const toast = useToast();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{
    fileId: string;
    versionNo: number;
    filename: string;
    mimeType: string;
    fileSize: number;
    uploaderName: string;
    uploadedAt: string;
  } | null>(null);

  const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.files.list('company', { ...(search && { q: search }) });
      setFiles(result);
    } catch (e: any) {
      toast.error(e.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-800">
        {isManager
          ? '🔓 你看到的是全公司所有檔案（不受 48 小時限制）'
          : '⏰ 48 小時透明窗：只顯示過去 48 小時內全公司有新版本的檔案'}
      </div>

      <div className="mb-4">
        <input
          className="w-full px-4 py-2 bg-stone-50 border border-slate-200 rounded-xl text-sm"
          placeholder="🔍 搜尋檔名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">載入中...</div>
      ) : files.length === 0 ? (
        <EmptyState icon="🌐" title="過去 48 小時內沒有檔案更新" />
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <FileListItem
              key={f.id}
              file={f}
              currentUser={currentUser}
              onPreview={(fileId, versionNo, mimeType, meta) =>
                setPreview({ fileId, versionNo, filename: f.filename, mimeType, ...meta })
              }
              onChanged={load}
            />
          ))}
        </div>
      )}

      {preview && (
        <ExcelPreview
          key={`${preview.fileId}-${preview.versionNo}`}
          fileId={preview.fileId}
          versionNo={preview.versionNo}
          filename={preview.filename}
          mimeType={preview.mimeType}
          fileSize={preview.fileSize}
          uploaderName={preview.uploaderName}
          uploadedAt={preview.uploadedAt}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};
