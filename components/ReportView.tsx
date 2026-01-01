import React, { useState, useEffect } from 'react';
import { User, Report, ReportType, DailyReportContent, DepartmentDef } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface ReportViewProps {
  currentUser: User;
  users: User[];
  reports: Report[];
  departments: DepartmentDef[];
  onCreateClick: () => void;
  onOpenReportModal?: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ currentUser, users, reports: propReports, departments, onCreateClick, onOpenReportModal }) => {
  const toast = useToast();
  // We use propReports as the source of truth if provided, otherwise fetch?
  // Since App.tsx passes reports, we should use them. 
  // However, for simplicity and to match the previous logic of local editing/updates within this component without prop callbacks for updates,
  // we might want to maintain local state initialized from props, or just fetch fresh data.
  // The prompt asked to fix the props mismatch. App.tsx passes `reports`.
  // Let's use a local state `localReports` initialized with `propReports` but also capable of fetching/updating.
  
  const [reports, setReports] = useState<Report[]>(propReports || []);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  
  // Edit State
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editContent, setEditContent] = useState<DailyReportContent | null>(null);

  useEffect(() => {
    // If props change, update local state
    if (propReports) {
        setReports(propReports);
    } else {
        loadReports();
    }
  }, [propReports]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.reports.getAll();
      // Sort by date desc
      setReports(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to load reports', error);
      toast.error('載入報表失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (report: Report) => {
      setEditingReport(report);
      setEditContent(report.content);
  };

  const handleSaveEdit = async () => {
      if (!editingReport || !editContent) return;
      try {
          await api.reports.update(editingReport.id, editContent);
          setReports(reports.map(r => r.id === editingReport.id ? { ...r, content: editContent } : r));
          setEditingReport(null);
          setEditContent(null);
          toast.success('報表已更新');
      } catch (error) {
          console.error('Failed to update report', error);
          toast.error('更新失敗');
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm('確定要刪除此報表嗎？')) return;
      try {
          await api.reports.delete(id);
          setReports(reports.filter(r => r.id !== id));
          toast.success('報表已刪除');
      } catch (error) {
          console.error('Failed to delete report', error);
          toast.error('刪除失敗');
      }
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
        <div className="flex justify-between items-end border-b border-slate-200 pb-4">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span></span> 工作報表中心
                </h2>
                <p className="text-slate-500 text-sm mt-1">查看與管理每日營運報表</p>
            </div>
            <button 
                onClick={onCreateClick}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
            >
                + 新增報表
            </button>
        </div>

        {loading ? (
            <div className="p-8 text-center text-slate-400">載入中...</div>
        ) : (
            <div className="space-y-4">
                {reports.length === 0 && (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        尚無報表紀錄
                    </div>
                )}
                
                {reports.slice(0, visibleCount).map(report => (
                    <div key={report.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
                        {/* Report Header */}
                        <div 
                            className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition"
                            onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                    {getUserName(report.userId).charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        {report.createdAt} 日報
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-normal">
                                            {getUserName(report.userId)}
                                        </span>
                                    </h3>
                                    <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                        <span>淨入: <span className={report.content.netIncome >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{formatCurrency(report.content.netIncome)}</span></span>
                                        <span></span>
                                        <span>LINE: {report.content.lineLeads}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-slate-400">
                                {expandedReportId === report.id ? '' : ''}
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {(expandedReportId === report.id || editingReport?.id === report.id) && (
                            <div className="p-6 animate-fade-in">
                                {editingReport?.id === report.id ? (
                                    // Edit Mode
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">LINE 導入數</label>
                                                <input 
                                                    type="number"
                                                    value={editContent?.lineLeads}
                                                    onChange={e => setEditContent({...editContent!, lineLeads: Number(e.target.value)})}
                                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">註冊數</label>
                                                <input 
                                                    type="number"
                                                    value={editContent?.registrations}
                                                    onChange={e => setEditContent({...editContent!, registrations: Number(e.target.value)})}
                                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">充值金額</label>
                                                <input 
                                                    type="number"
                                                    value={editContent?.depositAmount}
                                                    onChange={e => setEditContent({...editContent!, depositAmount: Number(e.target.value)})}
                                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">提現金額</label>
                                                <input 
                                                    type="number"
                                                    value={editContent?.withdrawalAmount}
                                                    onChange={e => setEditContent({...editContent!, withdrawalAmount: Number(e.target.value)})}
                                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 block mb-1">備註 / 說明</label>
                                            <textarea 
                                                value={editContent?.notes}
                                                onChange={e => setEditContent({...editContent!, notes: e.target.value})}
                                                className="w-full p-2 border border-slate-300 rounded-lg h-24"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button 
                                                onClick={() => setEditingReport(null)}
                                                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                                            >
                                                取消
                                            </button>
                                            <button 
                                                onClick={handleSaveEdit}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                儲存變更
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // View Mode
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="text-xs text-slate-400">LINE 導入</div>
                                                <div className="text-xl font-bold text-slate-700">{report.content.lineLeads}</div>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="text-xs text-slate-400">註冊人數</div>
                                                <div className="text-xl font-bold text-slate-700">{report.content.registrations}</div>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="text-xs text-slate-400">首充人數</div>
                                                <div className="text-xl font-bold text-slate-700">{report.content.firstDeposits}</div>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="text-xs text-slate-400">淨入金額</div>
                                                <div className={`text-xl font-bold ${report.content.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {formatCurrency(report.content.netIncome)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">財務明細</h4>
                                            <div className="flex gap-6 text-sm">
                                                <span className="text-slate-500">充值: <span className="text-slate-800 font-medium">{formatCurrency(report.content.depositAmount)}</span></span>
                                                <span className="text-slate-500">提現: <span className="text-slate-800 font-medium">{formatCurrency(report.content.withdrawalAmount)}</span></span>
                                            </div>
                                        </div>

                                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-sm text-slate-700 whitespace-pre-wrap">
                                            <h4 className="font-bold text-amber-700 mb-1">備註事項</h4>
                                            {report.content.notes || "無備註"}
                                        </div>

                                        {report.userId === currentUser.id && (
                                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                                <button 
                                                    onClick={() => handleEditClick(report)}
                                                    className="text-sm text-blue-600 hover:underline font-bold"
                                                >
                                                    編輯報表
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(report.id)}
                                                    className="text-sm text-red-500 hover:underline font-bold"
                                                >
                                                    刪除
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {reports.length > visibleCount && (
                    <button 
                        onClick={() => setVisibleCount(prev => prev + 5)}
                        className="w-full py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-slate-200"
                    >
                        載入更多
                    </button>
                )}
            </div>
        )}
    </div>
  );
};
