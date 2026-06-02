// components/files/ExcelPreview.tsx
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface ExcelPreviewProps {
  fileId: string;
  versionNo: number;
  filename: string;
  onClose: () => void;
}

export const ExcelPreview: React.FC<ExcelPreviewProps> = ({
  fileId,
  versionNo,
  filename,
  onClose,
}) => {
  const [data, setData] = useState<any>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await api.files.getPreview(fileId, versionNo);
        if (result.type === 'oversized' || result.type === 'unsupported') {
          setError(result.message);
        } else if (result.type === 'excel') {
          setData(result);
        } else {
          setError('預覽失敗');
        }
      } catch (e: any) {
        setError(e.message || '載入預覽失敗');
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId, versionNo]);

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
          {data && (
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
