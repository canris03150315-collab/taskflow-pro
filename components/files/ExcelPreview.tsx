// components/files/ExcelPreview.tsx
import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

interface ExcelPreviewProps {
  fileId: string;
  versionNo: number;
  filename: string;
  mimeType: string;
  onClose: () => void;
}

const isExcelMime = (m: string) =>
  m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
  m === 'application/vnd.ms-excel';

const isPdfMime = (m: string) => m === 'application/pdf';

export const ExcelPreview: React.FC<ExcelPreviewProps> = ({
  fileId,
  versionNo,
  filename,
  mimeType,
  onClose,
}) => {
  const [data, setData] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [activeSheet, setActiveSheet] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // Guard against React StrictMode double-invoke of effects in dev.
  const didStartRef = useRef(false);
  const objectUrlRef = useRef<string>('');

  useEffect(() => {
    if (didStartRef.current) return;
    didStartRef.current = true;

    (async () => {
      try {
        if (isPdfMime(mimeType)) {
          const url = await api.files.getPreviewBlobUrl(fileId, versionNo);
          objectUrlRef.current = url;
          setPdfUrl(url);
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

  return (
    <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">
            {filename} · v{versionNo}
          </h3>
          <button onClick={onClose} className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading && <p className="text-slate-500 text-center py-10">載入中...</p>}
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {pdfUrl && !error && (
            <iframe src={pdfUrl} title={filename} className="w-full h-[70vh] border-0" />
          )}
          {data && !error && (
            <>
              {data.sheets.length > 1 && (
                <div className="flex gap-1 mb-3 border-b border-slate-200">
                  {data.sheets.map((s: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveSheet(i)}
                      className={`px-3 py-1.5 text-sm font-bold ${
                        activeSheet === i
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              <table className="text-xs border-collapse">
                <tbody>
                  {(data.sheets[activeSheet]?.data || []).map((row: any[], i: number) => (
                    <tr key={i}>
                      {row.map((cell: any, j: number) => (
                        <td
                          key={j}
                          className={`border border-slate-200 px-2 py-1 ${
                            i === 0 ? 'bg-slate-100 font-bold' : ''
                          }`}
                          style={{ minWidth: '80px', maxWidth: '250px' }}
                        >
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
