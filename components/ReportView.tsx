import React, { useState, useEffect } from 'react';
import { User, Report, ReportType, DailyReportContent, DepartmentDef, ReportAuthorization } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';
import WorkLogTab from './WorkLogTab';
import { ApprovalModal } from './ApprovalModal';
import { AuthorizationStatus } from './AuthorizationStatus';
import { AuditLogView } from './AuditLogView';
import { getAuthorization, isAuthorizationValid, clearAuthorization } from '../utils/authSession';

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
  // Tab state - default to 'worklogs'
  const [activeTab, setActiveTab] = useState<'worklogs' | 'reports' | 'audit'>('worklogs');
  
  const [reports, setReports] = useState<Report[]>(propReports || []);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  
  // Edit State
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editContent, setEditContent] = useState<DailyReportContent | null>(null);
  
  // Approval State
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authorization, setAuthorization] = useState<ReportAuthorization | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  
  // Filter State
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  useEffect(() => {
    // If props change, update local state
    if (propReports) {
        setReports(propReports);
    } else {
        loadReports();
    }
  }, [propReports]);

  // Check authorization status on mount and when switching to reports tab
  useEffect(() => {
    if (activeTab === 'reports') {
      checkAuthorizationStatus();
      loadPendingApprovals();
    }
  }, [activeTab]);

  // Auto-refresh authorization status when user is waiting for approval
  useEffect(() => {
    if (activeTab === 'reports' && !isAuthorized && currentUser.role !== 'EMPLOYEE') {
      // Poll every 5 seconds to check if approval has been granted
      const pollInterval = setInterval(async () => {
        try {
          const response = await api.reports.approval.checkStatus('');
          if (response.isAuthorized && response.authorization) {
            setIsAuthorized(true);
            setAuthorization(response.authorization);
            const { saveAuthorization } = await import('../utils/authSession');
            saveAuthorization(response.authorization);
            // Clear pending approvals since we got authorized
            setPendingApprovals([]);
          }
        } catch (error) {
          console.error('Failed to poll authorization status:', error);
        }
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(pollInterval);
    }
  }, [activeTab, isAuthorized, currentUser.role]);

  const checkAuthorizationStatus = () => {
    const auth = getAuthorization();
    if (auth && isAuthorizationValid()) {
      setIsAuthorized(true);
      setAuthorization(auth);
    } else {
      setIsAuthorized(false);
      setAuthorization(null);
      clearAuthorization();
    }
  };

  const loadPendingApprovals = async () => {
    try {
      const response = await api.reports.approval.getPending();
      setPendingApprovals(response.pending || []);
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
    }
  };

  const handleInitiateApproval = () => {
    setShowApprovalModal(true);
  };

  const handleApprovalSuccess = async (isApprovalAction: boolean = false) => {
    // Only reload authorization status if this was an approval action (not a request)
    if (isApprovalAction) {
      try {
        const response = await api.reports.approval.checkStatus('');
        if (response.isAuthorized && response.authorization) {
          setIsAuthorized(true);
          setAuthorization(response.authorization);
          // Save to sessionStorage
          const { saveAuthorization } = await import('../utils/authSession');
          saveAuthorization(response.authorization);
        }
      } catch (error) {
        console.error('Failed to check authorization status:', error);
      }
    }
    
    loadPendingApprovals();
    loadReports();
  };

  const handleAuthorizationExpired = () => {
    setIsAuthorized(false);
    setAuthorization(null);
    clearAuthorization();
    setShowExpiredModal(true);
  };

  const handleExtendAuthorization = () => {
    setShowApprovalModal(true);
  };

  const handleRevokeAuthorization = async () => {
    if (!confirm('確定要撤銷授權嗎？')) return;
    try {
      await api.reports.approval.revoke(authorization?.id);
      setIsAuthorized(false);
      setAuthorization(null);
      clearAuthorization();
      toast.success('授權已撤銷');
    } catch (error) {
      console.error('Failed to revoke authorization:', error);
      toast.error('撤銷失敗');
    }
  };

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
          // Recalculate computed values
          const updatedContent = {
              ...editContent,
              netIncome: (editContent.depositAmount || 0) - (editContent.withdrawalAmount || 0),
              conversionRate: editContent.lineLeads > 0 ? Math.round((editContent.registrations / editContent.lineLeads) * 100) : 0,
              firstDepositRate: editContent.registrations > 0 ? Math.round((editContent.firstDeposits / editContent.registrations) * 100) : 0
          };
          
          await api.reports.update(editingReport.id, updatedContent);
          setReports(reports.map(r => r.id === editingReport.id ? { ...r, content: updatedContent } : r));
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
        <div className="border-b border-slate-200 pb-4">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <span>📝</span> 工作報表中心
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {activeTab === 'worklogs' ? '查看與管理工作日誌' : '查看與管理每日營運報表'}
                    </p>
                    {activeTab === 'reports' && (
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <span className="text-blue-600 text-lg">ℹ️</span>
                                <div className="flex-1">
                                    <p className="text-sm text-blue-900 font-medium">
                                        📅 顯示最近 7 天內的報表
                                    </p>
                                    <p className="text-xs text-blue-700 mt-1">
                                        {currentUser.role === 'EMPLOYEE' 
                                            ? '您可以直接查看、編輯和刪除自己 7 天內的報表。查看 7 天前的報表需要申請雙重認證。'
                                            : currentUser.role === 'SUPERVISOR'
                                            ? '您可以直接查看部門 7 天內的報表。查看 7 天前的報表需要申請雙重認證。'
                                            : '您可以直接查看所有 7 天內的報表。查看 7 天前的報表需要申請雙重認證。'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {activeTab === 'reports' && (
                    <button 
                        onClick={onCreateClick}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
                    >
                        + 新增報表
                    </button>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('worklogs')}
                    className={`px-4 py-2 font-semibold rounded-lg transition-colors ${
                        activeTab === 'worklogs'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    工作日誌
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-4 py-2 font-semibold rounded-lg transition-colors ${
                        activeTab === 'reports'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    營運報表
                </button>
                {(currentUser.role === 'BOSS' || currentUser.role === 'MANAGER' || currentUser.role === 'SUPERVISOR') && (
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`px-4 py-2 font-semibold rounded-lg transition-colors ${
                            activeTab === 'audit'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        📋 審核歷史
                    </button>
                )}
            </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'worklogs' ? (
            <WorkLogTab 
                currentUser={currentUser}
                departments={departments}
                users={users}
            />
        ) : activeTab === 'audit' ? (
            <AuditLogView currentUser={currentUser} />
        ) : (
            <div>
                {/* Authorization Status or Request Approval */}
                {currentUser.role === 'BOSS' || currentUser.role === 'MANAGER' || currentUser.role === 'SUPERVISOR' ? (
                    <>
                        {/* Show Authorization Status if authorized */}
                        {isAuthorized && authorization ? (
                            <AuthorizationStatus
                                authorization={authorization}
                                onExpired={handleAuthorizationExpired}
                                onExtend={handleExtendAuthorization}
                                onRevoke={handleRevokeAuthorization}
                            />
                        ) : (
                            /* Show Request Approval UI if not authorized */
                            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900">🔒 團隊報表需要審核授權</h3>
                                        <p className="text-sm text-gray-600 mt-1">為確保資料安全，查看團隊報表需要一位不同部門的主管審核</p>
                                    </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                    <h4 className="font-semibold text-blue-900 mb-2">📋 審核要求</h4>
                                    <ul className="text-sm text-blue-800 space-y-1">
                                        <li>✅ 一位不同部門的主管審核（BOSS/MANAGER/SUPERVISOR）</li>
                                        <li>✅ 授權有效期 30 分鐘</li>
                                        <li>✅ 關閉網頁後需重新審核</li>
                                    </ul>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
                                    <div>
                                        <div className="font-medium text-gray-900">當前狀態</div>
                                        <div className="text-sm text-gray-600">❌ 未授權</div>
                                    </div>
                                    <button
                                        onClick={handleInitiateApproval}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2 shadow-lg"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        🔐 申請查看報表
                                    </button>
                                </div>

                                {/* Pending Approvals */}
                                {pendingApprovals.length > 0 && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <h4 className="font-semibold text-gray-900 mb-3">⏳ 待您審核的請求</h4>
                                        <div className="space-y-2">
                                            {pendingApprovals.map((pending) => (
                                                <div key={pending.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">{pending.firstApproverName} 的審核請求</div>
                                                        <div className="text-sm text-gray-600">{pending.firstApproverDept} · {new Date(pending.firstApprovedAt).toLocaleString('zh-TW')}</div>
                                                        <div className="text-xs text-gray-600 mt-1">原因：{pending.firstApprovalReason}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setShowApprovalModal(true);
                                                        }}
                                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                                                    >
                                                        前往審核
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : null}

                {/* Reports List - Backend already filters to 7 days */}
                {/* Filter Controls - Only for non-employees */}
                    {currentUser.role !== 'EMPLOYEE' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
                            <h3 className="font-semibold text-gray-900 mb-3">🔍 篩選報表</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Department Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">部門</label>
                                    <select
                                        value={filterDepartment}
                                        onChange={(e) => setFilterDepartment(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="all">全部部門</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Employee Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">員工</label>
                                    <select
                                        value={filterEmployee}
                                        onChange={(e) => setFilterEmployee(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="all">全部員工</option>
                                        {users
                                            .filter(user => filterDepartment === 'all' || user.department === filterDepartment)
                                            .map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name} ({user.role})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                
                                {/* Start Date Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
                                    <input
                                        type="date"
                                        value={filterStartDate}
                                        onChange={(e) => setFilterStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="不限"
                                    />
                                </div>
                                
                                {/* End Date Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
                                    <input
                                        type="date"
                                        value={filterEndDate}
                                        onChange={(e) => setFilterEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="不限"
                                    />
                                </div>
                            </div>
                            
                            {/* Clear Filters Button */}
                            {(filterDepartment !== 'all' || filterEmployee !== 'all' || filterStartDate || filterEndDate) && (
                                <button
                                    onClick={() => {
                                        setFilterDepartment('all');
                                        setFilterEmployee('all');
                                        setFilterStartDate('');
                                        setFilterEndDate('');
                                    }}
                                    className="mt-3 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                                >
                                    🔄 清除篩選
                                </button>
                            )}
                        </div>
                    )}

                    {/* Report List - Visible to all users */}
                    {loading ? (
                            <div className="p-8 text-center text-slate-400">載入中...</div>
                        ) : (
                            <div className="space-y-4">
                                {(() => {
                                    // Apply filters
                                    let filteredReports = reports;
                                    
                                    // Filter by department
                                    if (filterDepartment !== 'all') {
                                        filteredReports = filteredReports.filter(report => {
                                            const user = users.find(u => u.id === report.userId);
                                            return user?.department === filterDepartment;
                                        });
                                    }
                                    
                                    // Filter by employee
                                    if (filterEmployee !== 'all') {
                                        filteredReports = filteredReports.filter(report => {
                                            return report.userId === filterEmployee;
                                        });
                                    }
                                    
                                    // Filter by date range (only if date is specified)
                                    if (filterStartDate) {
                                        filteredReports = filteredReports.filter(report => {
                                            const reportDate = new Date(report.createdAt).toISOString().split('T')[0];
                                            return reportDate >= filterStartDate;
                                        });
                                    }
                                    
                                    if (filterEndDate) {
                                        filteredReports = filteredReports.filter(report => {
                                            const reportDate = new Date(report.createdAt).toISOString().split('T')[0];
                                            return reportDate <= filterEndDate;
                                        });
                                    }
                                    
                                    if (filteredReports.length === 0) {
                                        return (
                                            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                                {filterDepartment !== 'all' || filterEmployee !== 'all' || filterStartDate || filterEndDate 
                                                    ? '沒有符合篩選條件的報表' 
                                                    : '尚無報表紀錄'}
                                            </div>
                                        );
                                    }
                                    
                                    return filteredReports.slice(0, visibleCount).map(report => (
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

                                        {(report.userId === currentUser.id || currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') && (
                                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                                {(currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') && (
                                                    <button 
                                                        onClick={() => handleEditClick(report)}
                                                        className="text-sm text-blue-600 hover:underline font-bold"
                                                    >
                                                        編輯報表
                                                    </button>
                                                )}
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
                                    ));
                                })()}
                            </div>
                        )}
            </div>
        )}
        
        {/* Load More Button - only show when there are more filtered reports */}
        {activeTab === 'reports' && (() => {
            let filteredReports = reports;
            if (filterDepartment !== 'all') {
                filteredReports = filteredReports.filter(report => {
                    const user = users.find(u => u.id === report.userId);
                    return user?.department === filterDepartment;
                });
            }
            if (filterEmployee !== 'all') {
                filteredReports = filteredReports.filter(report => {
                    return report.userId === filterEmployee;
                });
            }
            if (filterStartDate) {
                filteredReports = filteredReports.filter(report => {
                    const reportDate = new Date(report.createdAt).toISOString().split('T')[0];
                    return reportDate >= filterStartDate;
                });
            }
            if (filterEndDate) {
                filteredReports = filteredReports.filter(report => {
                    const reportDate = new Date(report.createdAt).toISOString().split('T')[0];
                    return reportDate <= filterEndDate;
                });
            }
            return filteredReports.length > visibleCount;
        })() && (
                    <button 
                        onClick={() => setVisibleCount(prev => prev + 5)}
                        className="w-full py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-slate-200"
                    >
                        載入更多
                    </button>
                )}

        {/* Approval Modal */}
        {showApprovalModal && (
            <ApprovalModal
                currentUser={currentUser}
                mode={pendingApprovals.length > 0 ? 'approve' : 'request'}
                pendingAuthId={pendingApprovals[0]?.id}
                pendingAuthData={pendingApprovals[0]}
                onClose={() => setShowApprovalModal(false)}
                onSuccess={handleApprovalSuccess}
            />
        )}

        {/* Expired Modal */}
        {showExpiredModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">⏰ 授權已過期</h3>
                    </div>
                    
                    <p className="text-gray-700 mb-4">您的報表查看授權已過期</p>
                    
                    <p className="text-sm text-gray-600 mb-6">
                        過期原因：已超過 30 分鐘授權期限<br />
                        如需繼續查看報表，請重新發起審核
                    </p>
                    
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowExpiredModal(false)}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        >
                            返回
                        </button>
                        <button
                            onClick={() => {
                                setShowExpiredModal(false);
                                setShowApprovalModal(true);
                            }}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            🔐 重新審核
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
