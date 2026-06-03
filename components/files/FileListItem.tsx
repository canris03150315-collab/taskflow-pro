// components/files/FileListItem.tsx
import React, { useState } from 'react';
import { FileRecord, User } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { FileTypeIcon } from '../FileTypeIcon';
import { VersionList } from './VersionList';

interface FileListItemProps {
  file: FileRecord;
  currentUser: User;
  onPreview: (
    fileId: string,
    versionNo: number,
    mimeType: string,
    meta: { fileSize: number; uploaderName: string; uploadedAt: string }
  ) => void;
  onChanged: () => void;
}

export const FileListItem: React.FC<FileListItemProps> = ({
  file,
  currentUser,
  onPreview,
  onChanged,
}) => {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const toggle = async () => {
    if (!expanded && !detail) {
      try {
        const d = await api.files.getDetail(file.id);
        setDetail(d);
      } catch (e: any) {
        toast.error(e.message || '載入失敗');
        return;
      }
    }
    setExpanded(!expanded);
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white hover:border-slate-300 transition">
      <button
        className="w-full p-4 flex items-center gap-4 hover:bg-stone-50/60 text-left"
        onClick={toggle}
      >
        <FileTypeIcon mimeType={file.latest_mime_type} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900 truncate">{file.filename}</div>
          <div
            className="text-xs text-slate-500 mt-0.5"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            最新版 v{file.latest_version_no} ·{' '}
            {new Date(file.latest_uploaded_at).toLocaleString('zh-TW')} · by {file.owner_name}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-bold"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {file.version_count} 個版本
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>
      {expanded && detail && (
        <VersionList
          fileId={file.id}
          filename={file.filename}
          versions={detail.versions || []}
          currentUser={currentUser}
          onPreview={(n, mime, meta) => onPreview(file.id, n, mime, meta)}
          onChanged={() => {
            api.files
              .getDetail(file.id)
              .then(setDetail)
              .catch(() => {});
            onChanged();
          }}
        />
      )}
    </div>
  );
};
