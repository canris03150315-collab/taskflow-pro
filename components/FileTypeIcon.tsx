// components/FileTypeIcon.tsx
import React from 'react';

interface FileTypeIconProps {
  mimeType?: string;
  className?: string;
}

const getTypeInfo = (mime?: string) => {
  if (!mime) return { color: 'slate', label: '檔案' };
  if (mime.includes('spreadsheet') || mime.includes('excel'))
    return { color: 'emerald', label: 'Excel' };
  if (mime.includes('word')) return { color: 'blue', label: 'Word' };
  if (mime.includes('presentation') || mime.includes('powerpoint'))
    return { color: 'orange', label: 'PowerPoint' };
  if (mime.includes('pdf')) return { color: 'red', label: 'PDF' };
  if (mime.startsWith('image/')) return { color: 'purple', label: 'Image' };
  if (mime.includes('csv') || mime === 'text/plain') return { color: 'slate', label: 'Text' };
  return { color: 'slate', label: '檔案' };
};

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string }> = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600' },
};

export const FileTypeIcon: React.FC<FileTypeIconProps> = ({ mimeType, className = '' }) => {
  const info = getTypeInfo(mimeType);
  const cls = COLOR_CLASSES[info.color];
  return (
    <div
      className={`w-11 h-11 rounded-xl ${cls.bg} border ${cls.border} flex items-center justify-center ${className}`}
      aria-label={info.label}
    >
      <svg className={`w-6 h-6 ${cls.text}`} viewBox="0 0 20 20" fill="currentColor">
        <path d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0117 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13z" />
      </svg>
    </div>
  );
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
