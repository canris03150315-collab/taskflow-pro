// components/files/ExcelPreview.tsx
import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { formatFileSize } from '../FileTypeIcon';

interface ExcelPreviewProps {
  fileId: string;
  versionNo: number;
  filename: string;
  mimeType: string;
  fileSize?: number;
  uploaderName?: string;
  uploadedAt?: string;
  onClose: () => void;
}

const isExcelMime = (m: string) =>
  m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
  m === 'application/vnd.ms-excel';

const isPdfMime = (m: string) => m === 'application/pdf';
const isImageMime = (m: string) => typeof m === 'string' && m.startsWith('image/');

const Spinner = () => (
  <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
    <path
      d="M22 12a10 10 0 0 1-10 10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

export const ExcelPreview: React.FC<ExcelPreviewProps> = ({
  fileId,
  versionNo,
  filename,
  mimeType,
  fileSize,
  uploaderName,
  uploadedAt,
  onClose,
}) => {
  const [data, setData] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [activeSheet, setActiveSheet] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // Guard against React StrictMode double-invoke of effects in dev.
  const didStartRef = useRef(false);
  const objectUrlRef = useRef<string>('');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (didStartRef.current) return;
    didStartRef.current = true;

    (async () => {
      try {
        if (isPdfMime(mimeType)) {
          const url = await api.files.getPreviewBlobUrl(fileId, versionNo);
          objectUrlRef.current = url;
          setPdfUrl(url);
        } else if (isImageMime(mimeType)) {
          const url = await api.files.getPreviewBlobUrl(fileId, versionNo);
          objectUrlRef.current = url;
          setImageUrl(url);
        } else if (isExcelMime(mimeType)) {
          const result = await api.files.getPreview(fileId, versionNo);
          if (result.type === 'oversized' || result.type === 'unsupported') {
            setError(result.message);
          } else if (result.type === 'excel') {
            setData(result);
          } else {
            setError('預覽失敗');
          }
        } else {
          setError('此檔案類型不支援預覽，請下載查看');
        }
      } catch (e: any) {
        setError(e.message || '載入預覽失敗');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = '';
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESC key closes; focus the close button on mount
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDownload = async () => {
    try {
      await api.files.download(fileId, versionNo, filename);
    } catch {
      // Toast handled elsewhere; preview shouldn't break.
    }
  };

  const openInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener');
      return;
    }
    if (imageUrl) {
      window.open(imageUrl, '_blank', 'noopener');
      return;
    }
    if (!data) return;

    // For Excel: render all sheets as a standalone HTML page.
    const escape = (s: any) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const sheetsHtml = data.sheets
      .map((s: any, i: number) => {
        const rows = (s.data || [])
          .map(
            (row: any[], rowIdx: number) =>
              `<tr>${row
                .map(
                  (cell) =>
                    `<${rowIdx === 0 ? 'th' : 'td'}>${escape(cell)}</${rowIdx === 0 ? 'th' : 'td'}>`
                )
                .join('')}</tr>`
          )
          .join('');
        return `
          <section${i === 0 ? ' open' : ''} class="sheet">
            <h2>${escape(s.name)}</h2>
            <div class="table-wrap"><table><tbody>${rows}</tbody></table></div>
          </section>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>${escape(filename)} · v${versionNo}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, 'PingFang TC', 'Microsoft JhengHei', sans-serif;
    background: #f8fafc;
    color: #0f172a;
  }
  header {
    position: sticky; top: 0; z-index: 10;
    background: white; border-bottom: 1px solid #e2e8f0;
    padding: 16px 24px;
    display: flex; align-items: baseline; gap: 12px;
    box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  }
  h1 { margin: 0; font-size: 18px; font-weight: 900; }
  .meta { font-size: 12px; color: #64748b; font-variant-numeric: tabular-nums; }
  .version-badge {
    font-family: monospace; font-weight: 700;
    color: #047857; background: #ecfdf5;
    border: 1px solid #a7f3d0;
    padding: 2px 8px; border-radius: 4px; font-size: 11px;
  }
  main { padding: 24px; max-width: 1600px; margin: 0 auto; }
  .sheet { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
  .sheet h2 { margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #0f172a; }
  .table-wrap { overflow-x: auto; }
  table { border-collapse: collapse; font-size: 13px; min-width: 100%; }
  th, td {
    border: 1px solid #e2e8f0; padding: 8px 12px;
    min-width: 100px; white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  th { background: #f1f5f9; font-weight: 700; text-align: left; }
  tr:hover td { background: #f8fafc; }
  @media print {
    header { position: static; box-shadow: none; }
    .sheet { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<header>
  <h1>${escape(filename)}</h1>
  <span class="version-badge">v${versionNo}</span>
  <span class="meta">${
    fileSize !== undefined ? formatFileSize(fileSize) : ''
  }${uploaderName ? ' · ' + escape(uploaderName) : ''}${
    uploadedAt ? ' · ' + escape(new Date(uploadedAt).toLocaleString('zh-TW')) : ''
  }</span>
</header>
<main>${sheetsHtml}</main>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    // Revoke later so the new tab has time to load the document
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${filename} 預覽`}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] h-[90vh] flex flex-col overflow-hidden"
        style={{ animation: 'modalEnter 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-900 text-lg truncate">{filename}</h3>
            <div
              className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                v{versionNo}
              </span>
              {fileSize !== undefined && <span>{formatFileSize(fileSize)}</span>}
              {uploaderName && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>{uploaderName}</span>
                </>
              )}
              {uploadedAt && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>{new Date(uploadedAt).toLocaleString('zh-TW')}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(pdfUrl || data || imageUrl) && (
              <button
                onClick={openInNewTab}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 h-10 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="在新分頁開啟"
                aria-label="在新分頁開啟"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                    clipRule="evenodd"
                  />
                  <path
                    fillRule="evenodd"
                    d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>新分頁</span>
              </button>
            )}
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 h-10 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors"
              aria-label="下載檔案"
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
              ref={closeButtonRef}
              onClick={onClose}
              className="inline-flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
              aria-label="關閉預覽"
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
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-slate-50">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
              <Spinner />
              <p className="text-sm">載入預覽中...</p>
            </div>
          )}

          {error && !loading && (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-800">{error}</p>
                <p className="text-sm text-slate-500 mt-1">
                  你仍然可以使用上方的「下載」按鈕取得原始檔案。
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="mt-2 px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg"
              >
                下載檔案
              </button>
            </div>
          )}

          {pdfUrl && !error && !loading && (
            <iframe src={pdfUrl} title={filename} className="w-full h-full border-0 bg-white" />
          )}

          {imageUrl && !error && !loading && (
            <div className="h-full w-full flex items-center justify-center bg-slate-100 p-4 overflow-auto">
              <img
                src={imageUrl}
                alt={filename}
                className="max-w-full max-h-full object-contain bg-white shadow-lg rounded"
              />
            </div>
          )}

          {data && !error && !loading && (
            <div className="h-full flex flex-col">
              {data.sheets.length > 1 && (
                <div className="flex gap-1 px-4 pt-3 bg-white border-b border-slate-200 overflow-x-auto shrink-0">
                  {data.sheets.map((s: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveSheet(i)}
                      className={`px-4 py-2 text-sm font-bold whitespace-nowrap rounded-t-lg transition-colors ${
                        activeSheet === i
                          ? 'text-blue-600 bg-blue-50 border-x border-t border-blue-200'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 overflow-auto p-4 bg-white">
                <table className="text-sm border-collapse min-w-full">
                  <tbody>
                    {(data.sheets[activeSheet]?.data || []).map((row: any[], i: number) => (
                      <tr key={i} className={i === 0 ? '' : 'hover:bg-slate-50'}>
                        {row.map((cell: any, j: number) => (
                          <td
                            key={j}
                            className={`border border-slate-200 px-3 py-2 whitespace-nowrap ${
                              i === 0
                                ? 'bg-slate-100 font-bold text-slate-700 sticky top-0'
                                : 'text-slate-800'
                            }`}
                            style={{
                              minWidth: '100px',
                              maxWidth: '320px',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex items-center justify-between shrink-0">
          <span>按 Esc 或點擊背景關閉</span>
          {data && (
            <span className="font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {(data.sheets[activeSheet]?.data || []).length} 列
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
