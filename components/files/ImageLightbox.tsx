// components/files/ImageLightbox.tsx
import React, { useEffect, useRef, useState } from 'react';
import { WorkLogImage } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { AuthedWorkLogImage } from './AuthedWorkLogImage';

interface ImageLightboxProps {
  images: WorkLogImage[];
  initialIndex: number;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, initialIndex, onClose }) => {
  const toast = useToast();
  const [idx, setIdx] = useState(initialIndex);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const current = images[idx];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(images.length - 1, i + 1));
    };
    document.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  const handleDownload = async () => {
    if (!current) return;
    try {
      const blobUrl = await api.workLogs.images.fetchBlobUrl(current.hash, current.filename);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = current.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      toast.error(e.message || '下載失敗');
    }
  };

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`圖片預覽：${current.filename}`}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-[95vw] max-h-[95vh] flex flex-col overflow-hidden"
        style={{ animation: 'modalEnter 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate">{current.filename}</p>
            <p className="text-xs text-slate-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {idx + 1} / {images.length}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 h-10 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            aria-label="下載圖片"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 3a.75.75 0 01.75.75v8.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 011.06-1.06l3.22 3.22V3.75A.75.75 0 0110 3z"
                clipRule="evenodd"
              />
              <path d="M3.5 13.75a.75.75 0 00-1.5 0v2.5A2.25 2.25 0 004.25 18.5h11.5A2.25 2.25 0 0018 16.25v-2.5a.75.75 0 00-1.5 0v2.5a.75.75 0 01-.75.75H4.25a.75.75 0 01-.75-.75v-2.5z" />
            </svg>
            <span>下載</span>
          </button>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="inline-flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-label="關閉"
            title="關閉 (Esc)"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.28 3.22a.75.75 0 00-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 101.06 1.06L10 11.06l5.72 5.72a.75.75 0 101.06-1.06L11.06 10l5.72-5.72a.75.75 0 00-1.06-1.06L10 8.94 4.28 3.22z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center bg-slate-900 relative">
          <AuthedWorkLogImage
            hash={current.hash}
            filename={current.filename}
            alt={current.filename}
            loading="eager"
            className="max-w-full max-h-[80vh] object-contain"
          />
          {idx > 0 && (
            <button
              onClick={() => setIdx(idx - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg"
              aria-label="上一張"
            >
              <svg className="w-5 h-5 text-slate-700" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          {idx < images.length - 1 && (
            <button
              onClick={() => setIdx(idx + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg"
              aria-label="下一張"
            >
              <svg className="w-5 h-5 text-slate-700" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="px-5 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex items-center justify-between">
          <span>← → 切換 · Esc 關閉</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            上傳者 · {new Date(current.uploaded_at).toLocaleString('zh-TW')}
          </span>
        </div>
      </div>
    </div>
  );
};
