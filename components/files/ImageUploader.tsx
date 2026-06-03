// components/files/ImageUploader.tsx
import React, { useRef, useState } from 'react';
import { WorkLogImage } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';

interface ImageUploaderProps {
  images: WorkLogImage[];
  maxCount: number;
  onAdd: (file: File) => Promise<void>;
  onRemove: (hash: string) => Promise<void>;
  onPreview: (image: WorkLogImage, idx: number) => void;
  canRemove: (image: WorkLogImage) => boolean;
  disabled?: boolean;
  label?: string;
  // Optional override for thumbnail URL resolution. Used for pending (not-yet-uploaded)
  // images during a new-log create flow where the URL is a local blob: URL.
  resolveUrl?: (image: WorkLogImage) => string;
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE = 10 * 1024 * 1024;

const formatSize = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const defaultResolveUrl = (img: WorkLogImage) => api.workLogs.images.getUrl(img.hash, img.filename);

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  maxCount,
  onAdd,
  onRemove,
  onPreview,
  canRemove,
  disabled,
  label,
  resolveUrl,
}) => {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const remaining = maxCount - images.length;
  const canAddMore = remaining > 0 && !disabled && !uploading;

  const handleFile = async (file: File) => {
    if (!ALLOWED_MIME.has(file.type)) {
      toast.error('只接受 JPEG / PNG / WebP / GIF 圖片');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error(`圖片超過 10 MB（你的：${formatSize(file.size)}）`);
      return;
    }
    setUploading(true);
    try {
      await onAdd(file);
    } catch (e: any) {
      toast.error(e.message || '上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (inputRef.current) inputRef.current.value = '';
    await handleFile(f);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (!canAddMore) return;
    const f = e.dataTransfer.files?.[0];
    if (f) await handleFile(f);
  };

  const handleRemove = async (img: WorkLogImage) => {
    try {
      await onRemove(img.hash);
    } catch (e: any) {
      toast.error(e.message || '刪除失敗');
    }
  };

  return (
    <div>
      {label !== undefined && (
        <div
          className="text-xs font-bold text-slate-600 mb-2"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {label}（{images.length}/{maxCount}）
        </div>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {images.map((img, idx) => (
          <div
            key={img.hash + idx}
            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group bg-slate-50"
          >
            <button
              type="button"
              onClick={() => onPreview(img, idx)}
              className="w-full h-full hover:opacity-90 transition"
              aria-label={`預覽 ${img.filename}`}
            >
              <img
                src={(resolveUrl || defaultResolveUrl)(img)}
                alt={img.filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
            {canRemove(img) && (
              <button
                type="button"
                onClick={() => handleRemove(img)}
                className="absolute top-1 right-1 w-7 h-7 bg-white/95 hover:bg-red-50 border border-slate-200 hover:border-red-300 rounded-full text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition shadow-sm"
                aria-label={`移除 ${img.filename}`}
                title="移除"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.28 3.22a.75.75 0 00-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 101.06 1.06L10 11.06l5.72 5.72a.75.75 0 101.06-1.06L11.06 10l5.72-5.72a.75.75 0 00-1.06-1.06L10 8.94 4.28 3.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition ${
              dragActive
                ? 'border-blue-400 bg-blue-50 text-blue-600'
                : 'border-slate-300 bg-stone-50'
            }`}
          >
            {uploading ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  opacity="0.25"
                />
                <path
                  d="M22 12a10 10 0 0 1-10 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <>
                <svg className="w-5 h-5 mb-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                <span className="text-xs font-bold">新增圖片</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
};
