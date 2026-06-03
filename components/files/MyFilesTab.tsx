// components/files/MyFilesTab.tsx
import React, { useState, useEffect, useRef } from 'react';
import { User, FileRecord } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { FileListItem } from './FileListItem';
import { UploadModal } from './UploadModal';
import { ExcelPreview } from './ExcelPreview';
import { EmptyState } from '../EmptyState';

interface MyFilesTabProps {
  currentUser: User;
}

export const MyFilesTab: React.FC<MyFilesTabProps> = ({ currentUser }) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    fileId: string;
    versionNo: number;
    filename: string;
    mimeType: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.files.list('mine', {
        ...(search && { q: search }),
        ...(typeFilter && { file_type: typeFilter }),
      });
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
  }, [search, typeFilter]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) {
      toast.error('檔案超過 25 MB 限制');
      return;
    }
    setPendingUpload(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div className="flex gap-2 flex-1 min-w-[280px]">
          <input
            className="flex-1 px-4 py-2 bg-stone-50 border border-slate-200 rounded-xl text-sm"
            placeholder="🔍 搜尋檔名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="px-3 py-2 bg-stone-50 border border-slate-200 rounded-xl text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">所有類型</option>
            <option value="excel">Excel</option>
            <option value="word">Word</option>
            <option value="powerpoint">PowerPoint</option>
            <option value="pdf">PDF</option>
            <option value="image">圖片</option>
          </select>
        </div>
        <button
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700"
          onClick={() => fileInputRef.current?.click()}
        >
          📤 上傳檔案
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">載入中...</div>
      ) : files.length === 0 ? (
        <EmptyState
          icon="📁"
          title="還沒有任何檔案"
          description="上傳第一份檔案開始管理你的工作報表"
          actionLabel="上傳檔案"
          onAction={() => fileInputRef.current?.click()}
        />
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <FileListItem
              key={f.id}
              file={f}
              currentUser={currentUser}
              onPreview={(fileId, versionNo, mimeType) =>
                setPreview({ fileId, versionNo, filename: f.filename, mimeType })
              }
              onChanged={load}
            />
          ))}
        </div>
      )}

      {pendingUpload && (
        <UploadModal
          file={pendingUpload}
          onClose={() => setPendingUpload(null)}
          onUploaded={() => {
            setPendingUpload(null);
            load();
          }}
        />
      )}

      {preview && (
        <ExcelPreview
          fileId={preview.fileId}
          versionNo={preview.versionNo}
          filename={preview.filename}
          mimeType={preview.mimeType}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};
