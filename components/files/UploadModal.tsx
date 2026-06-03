// components/files/UploadModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { ConflictCheckResult } from '../../types';
import { FileTypeIcon, formatFileSize } from '../FileTypeIcon';

interface UploadModalProps {
  file: File;
  onClose: () => void;
  onUploaded: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ file, onClose, onUploaded }) => {
  const toast = useToast();
  const [conflict, setConflict] = useState<ConflictCheckResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [targetFileId, setTargetFileId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  // Guard against React StrictMode double-invoke of useEffect in dev,
  // which would otherwise cause one user-action to upload twice.
  const didStartRef = useRef(false);

  useEffect(() => {
    if (didStartRef.current) return;
    didStartRef.current = true;
    (async () => {
      try {
        const hash = await api.files.computeHash(file);
        const result = await api.files.checkConflict(file.name, hash);

        // Silent path: same uploader has this file → auto-upload as new version
        if (result.same_user_match) {
          setUploading(true);
          const r = await api.files.upload(file, result.same_user_match.file_id);
          toast.success(`已加為 v${r.version_no}：${file.name}`);
          onUploaded();
          onClose();
          return;
        }

        // No matches → silent upload as new file
        if (!result.cross_user_matches.length) {
          setUploading(true);
          await api.files.upload(file);
          toast.success(`已上傳：${file.name}`);
          onUploaded();
          onClose();
          return;
        }

        // Cross-user matches → show modal
        setConflict(result);
        setChecking(false);
      } catch (err: any) {
        toast.error(err.message || '檢查衝突失敗');
        onClose();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    setUploading(true);
    try {
      const r = await api.files.upload(file, targetFileId, note || undefined);
      toast.success(targetFileId ? `已加為對方的 v${r.version_no}` : `已建立新檔：${file.name}`);
      onUploaded();
      onClose();
    } catch (err: any) {
      toast.error(err.message || '上傳失敗');
      setUploading(false);
    }
  };

  if (checking) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 text-slate-600">分析檔案中...</div>
      </div>
    );
  }

  if (!conflict) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <FileTypeIcon mimeType={file.type} className="!w-9 !h-9" />
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-sm">即將上傳：{file.name}</h3>
            <p className="text-xs text-slate-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
            系統發現有 {conflict.cross_user_matches.length} 位同事也有「{file.name}
            」。要加為對方的新版本嗎？
          </div>

          {conflict.cross_user_matches.map((m) => (
            <label
              key={m.file_id}
              className={`block border-2 rounded-xl p-3 cursor-pointer transition ${
                targetFileId === m.file_id
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="target"
                  className="accent-blue-600"
                  checked={targetFileId === m.file_id}
                  onChange={() => setTargetFileId(m.file_id)}
                />
                <div className="flex-1">
                  <div className="font-bold text-slate-900 text-sm">
                    加為 {m.owner_name} 的新版本（v{m.version_count + 1}）
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    會顯示在 {m.owner_name} 的「我的檔案」
                    {m.hash_matches_latest && (
                      <span className="ml-2 text-emerald-600">✓ 內容與最新版相同</span>
                    )}
                  </div>
                </div>
              </div>
            </label>
          ))}

          <label
            className={`block border-2 rounded-xl p-3 cursor-pointer transition ${
              targetFileId === undefined && conflict.cross_user_matches.length > 0
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="target"
                className="accent-blue-600"
                checked={targetFileId === undefined}
                onChange={() => setTargetFileId(undefined)}
              />
              <div className="flex-1">
                <div className="font-bold text-slate-900 text-sm">
                  建立我自己的「{file.name}」（v1）
                </div>
                <div className="text-xs text-slate-500 mt-0.5">會在我的「我的檔案」獨立成新檔</div>
              </div>
            </div>
          </label>

          <textarea
            className="w-full px-3 py-2 bg-stone-50 border border-slate-200 rounded-lg text-sm"
            rows={2}
            placeholder="版本備註（選填）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="px-5 py-3 bg-stone-50 border-t border-slate-100 flex justify-end gap-2">
          <button
            className="px-3 py-1.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded"
            onClick={onClose}
            disabled={uploading}
          >
            取消
          </button>
          <button
            className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
            onClick={handleConfirm}
            disabled={uploading}
          >
            {uploading ? '上傳中...' : '確認上傳'}
          </button>
        </div>
      </div>
    </div>
  );
};
