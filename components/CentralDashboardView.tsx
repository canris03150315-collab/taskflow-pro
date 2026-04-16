import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, ChevronDown, ChevronUp, Plus, Edit2, Trash2, Activity,
  AlertTriangle, AlertCircle, Info, CheckCircle, X, Loader2, Building2, Wifi, WifiOff
} from 'lucide-react';
import {
  centralApi,
  Subsidiary,
  DashboardOverview,
  CentralAlert,
  SubsidiaryCreateData
} from '../services/centralApi';
import { showError, showConfirm } from '../utils/dialogService';

// ============================================================================
// TYPES
// ============================================================================

interface CompanyKpis {
  attendanceRate: number;
  pendingLeaves: number;
  overdueTasks: number;
  platformRevenue: number;
}

interface CompanyStatus {
  id: string;
  name: string;
  status: 'online' | 'offline';
  kpis: CompanyKpis;
}

interface SubsidiaryFormData {
  name: string;
  base_url: string;
  service_token: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-6">
    {/* Company cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-lg shadow p-6">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-3 bg-gray-200 rounded w-full mb-2" />
          <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
    {/* Alerts skeleton */}
    <div className="bg-white rounded-lg shadow p-6">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-10 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
    {/* Table skeleton */}
    <div className="bg-white rounded-lg shadow p-6">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  </div>
);

const AlertBadge: React.FC<{ type: CentralAlert['type'] }> = ({ type }) => {
  const config = {
    critical: { bg: 'bg-red-100 text-red-800', icon: AlertCircle },
    warning: { bg: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
    info: { bg: 'bg-yellow-100 text-yellow-800', icon: Info },
  };
  const { bg, icon: Icon } = config[type] || config.info;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${bg}`}>
      <Icon size={12} />
      {type === 'critical' ? '嚴重' : type === 'warning' ? '警告' : '提示'}
    </span>
  );
};

const CompanyCard: React.FC<{
  company: CompanyStatus;
  onClick: (id: string) => void;
}> = ({ company, onClick }) => {
  const isOnline = company.status === 'online';

  return (
    <div
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-5 cursor-pointer border border-gray-100"
      onClick={() => onClick(company.id)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900">{company.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-700 font-medium">線上</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-red-700 font-medium">離線</span>
            </>
          )}
        </div>
      </div>

      {!isOnline && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-1">
          <WifiOff size={14} />
          子公司離線，請聯繫技術人員
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500 text-xs">出勤率</p>
          <p className={`font-semibold ${company.kpis.attendanceRate >= 90 ? 'text-green-600' : company.kpis.attendanceRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
            {company.kpis.attendanceRate}%
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">待處理請假</p>
          <p className={`font-semibold ${company.kpis.pendingLeaves > 5 ? 'text-red-600' : company.kpis.pendingLeaves > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
            {company.kpis.pendingLeaves} 筆
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">逾期任務</p>
          <p className={`font-semibold ${company.kpis.overdueTasks > 3 ? 'text-red-600' : company.kpis.overdueTasks > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
            {company.kpis.overdueTasks} 個
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">平台營收</p>
          <p className="font-semibold text-blue-600">
            ${company.kpis.platformRevenue.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

const SubsidiaryForm: React.FC<{
  initialData?: SubsidiaryFormData;
  onSubmit: (data: SubsidiaryFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState<SubsidiaryFormData>(
    initialData || { name: '', base_url: '', service_token: '' }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.base_url.trim() || !formData.service_token.trim()) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">公司名稱</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="例：台北分公司"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">API 位址 (Base URL)</label>
        <input
          type="url"
          value={formData.base_url}
          onChange={e => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://company-a.example.com"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Service Token</label>
        <input
          type="password"
          value={formData.service_token}
          onChange={e => setFormData(prev => ({ ...prev, service_token: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="子公司授權金鑰"
          required
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          {initialData ? '更新' : '新增'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50"
        >
          取消
        </button>
      </div>
    </form>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CentralDashboardView: React.FC = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Subsidiary management
  const [subsidiaries, setSubsidiaries] = useState<Subsidiary[]>([]);
  const [managementExpanded, setManagementExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSubsidiary, setEditingSubsidiary] = useState<Subsidiary | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [healthChecking, setHealthChecking] = useState<string | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [overviewRes, subsRes] = await Promise.all([
        centralApi.dashboard.getOverview(),
        centralApi.subsidiaries.getAll(),
      ]);

      // Map API response to DashboardOverview interface
      const raw = overviewRes as any;
      const companies = raw.companies || raw.subsidiaries || [];
      const onlineCount = companies.filter((c: any) => c.status === 'online').length;
      const mappedOverview: DashboardOverview = {
        subsidiaries: companies.map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status || 'offline',
          kpis: {
            totalUsers: c.kpis?.totalUsers || 0,
            totalTasks: c.kpis?.totalTasks || 0,
            completedTasks: c.kpis?.completedTasks || 0,
            taskCompletionRate: c.kpis?.taskCompletionRate || 0,
            attendanceRate: c.kpis?.todayAttendance?.rate || 0,
            pendingLeaves: c.kpis?.pendingLeaves || 0,
            overdueTasks: c.kpis?.overdueTasks || 0,
            platformRevenue: c.kpis?.monthlyRevenue || 0,
            monthlyExpense: c.kpis?.monthlyExpense || 0,
          },
        })),
        alerts: raw.alerts || [],
        summary: {
          totalCompanies: companies.length,
          onlineCount,
          offlineCount: companies.length - onlineCount,
        },
      };
      setOverview(mappedOverview);
      setSubsidiaries(subsRes.subsidiaries || subsRes || []);
    } catch (err: any) {
      console.error('Failed to fetch central dashboard data', err);
      setError(err.message || '無法載入總部儀表板資料');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCompanyClick = (companyId: string) => {
    const company = overview?.subsidiaries.find(s => s.id === companyId);
    console.log(`[Central] Viewing subsidiary: ${company?.name || companyId} (${companyId}) - drill-down not yet implemented`);
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleAddSubsidiary = async (data: SubsidiaryFormData) => {
    try {
      setFormSubmitting(true);
      await centralApi.subsidiaries.create(data);
      setShowAddForm(false);
      await fetchData(true);
    } catch (err: any) {
      showError(err.message || '新增子公司失敗');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateSubsidiary = async (data: SubsidiaryFormData) => {
    if (!editingSubsidiary) return;
    try {
      setFormSubmitting(true);
      await centralApi.subsidiaries.update(editingSubsidiary.id, data);
      setEditingSubsidiary(null);
      await fetchData(true);
    } catch (err: any) {
      showError(err.message || '更新子公司失敗');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSubsidiary = async (sub: Subsidiary) => {
    const confirmed = await showConfirm(`確定要刪除子公司「${sub.name}」嗎？此操作無法復原。`);
    if (!confirmed) return;
    try {
      await centralApi.subsidiaries.delete(sub.id);
      await fetchData(true);
    } catch (err: any) {
      showError(err.message || '刪除子公司失敗');
    }
  };

  const handleHealthCheck = async (subId: string) => {
    try {
      setHealthChecking(subId);
      const res = await centralApi.subsidiaries.healthCheck(subId);
      const result = res.result;
      setError(null);
      // Show inline status instead of alert
      await fetchData(true);
    } catch (err: any) {
      showError(err.message || '健康檢查失敗');
    } finally {
      setHealthChecking(null);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">總部儀表板</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">總部儀表板</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={40} />
          <p className="text-red-700 font-medium mb-2">載入失敗</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
          >
            重試
          </button>
        </div>
      </div>
    );
  }

  const companies: CompanyStatus[] = overview?.subsidiaries || [];
  const alerts: CentralAlert[] = overview?.alerts || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">總部儀表板</h1>
          <p className="text-sm text-gray-500 mt-1">
            {overview?.summary.totalCompanies || 0} 間子公司 &middot;{' '}
            <span className="text-green-600">{overview?.summary.onlineCount || 0} 線上</span>{' '}
            {(overview?.summary.offlineCount || 0) > 0 && (
              <span className="text-red-600">&middot; {overview?.summary.offlineCount} 離線</span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? '更新中...' : '重新整理'}
        </button>
      </div>

      {/* Error banner (non-blocking) */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-sm text-yellow-800">
          <AlertTriangle size={16} />
          <span>部分資料更新失敗：{error}</span>
        </div>
      )}

      {/* ================================================================ */}
      {/* TOP SECTION: Company Status Cards */}
      {/* ================================================================ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">子公司狀態</h2>
        {companies.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <Building2 className="mx-auto mb-2 text-gray-300" size={40} />
            <p>尚未註冊任何子公司</p>
            <p className="text-sm mt-1">請在下方「子公司管理」區塊新增</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {companies.map(company => (
              <CompanyCard
                key={company.id}
                company={company}
                onClick={handleCompanyClick}
              />
            ))}
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* MIDDLE SECTION: Immediate Alerts */}
      {/* ================================================================ */}
      {alerts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            即時警報
            <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          </h2>
          <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
            {alerts.map(alert => (
              <div key={alert.id} className="p-4 flex items-start gap-3">
                <AlertBadge type={alert.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{alert.detail}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {alert.companyName}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* BOTTOM SECTION: Daily Summary Table */}
      {/* ================================================================ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">每日總覽</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    公司
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    狀態
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    出勤率
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    新請假
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    逾期任務
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    平台營收
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                      尚無資料
                    </td>
                  </tr>
                ) : (
                  companies.map(company => (
                    <tr
                      key={company.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleCompanyClick(company.id)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {company.name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {company.status === 'online' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700">
                            <Wifi size={12} /> 線上
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-700">
                            <WifiOff size={12} /> 離線
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                        <span className={
                          company.kpis.attendanceRate >= 90
                            ? 'text-green-600 font-medium'
                            : company.kpis.attendanceRate >= 70
                              ? 'text-yellow-600 font-medium'
                              : 'text-red-600 font-semibold'
                        }>
                          {company.kpis.attendanceRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                        <span className={
                          company.kpis.pendingLeaves > 5
                            ? 'text-red-600 font-semibold'
                            : company.kpis.pendingLeaves > 0
                              ? 'text-yellow-600 font-medium'
                              : 'text-green-600'
                        }>
                          {company.kpis.pendingLeaves}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                        <span className={
                          company.kpis.overdueTasks > 3
                            ? 'text-red-600 font-semibold'
                            : company.kpis.overdueTasks > 0
                              ? 'text-yellow-600 font-medium'
                              : 'text-green-600'
                        }>
                          {company.kpis.overdueTasks}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm whitespace-nowrap text-blue-600 font-medium">
                        ${company.kpis.platformRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SUBSIDIARY MANAGEMENT (Collapsible) */}
      {/* ================================================================ */}
      <section className="bg-white rounded-lg shadow">
        <button
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
          onClick={() => setManagementExpanded(prev => !prev)}
        >
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-800">子公司管理</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {subsidiaries.length}
            </span>
          </div>
          {managementExpanded ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </button>

        {managementExpanded && (
          <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
            {/* Add button */}
            {!showAddForm && !editingSubsidiary && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
              >
                <Plus size={14} />
                新增子公司
              </button>
            )}

            {/* Add form */}
            {showAddForm && (
              <SubsidiaryForm
                onSubmit={handleAddSubsidiary}
                onCancel={() => setShowAddForm(false)}
                isSubmitting={formSubmitting}
              />
            )}

            {/* Edit form */}
            {editingSubsidiary && (
              <SubsidiaryForm
                initialData={{
                  name: editingSubsidiary.name,
                  base_url: editingSubsidiary.base_url,
                  service_token: editingSubsidiary.service_token,
                }}
                onSubmit={handleUpdateSubsidiary}
                onCancel={() => setEditingSubsidiary(null)}
                isSubmitting={formSubmitting}
              />
            )}

            {/* Subsidiary list */}
            {subsidiaries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">尚未註冊任何子公司</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {subsidiaries.map(sub => (
                  <div key={sub.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{sub.name}</p>
                      <p className="text-xs text-gray-400 truncate">{sub.base_url}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleHealthCheck(sub.id)}
                        disabled={healthChecking === sub.id}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                        title="健康檢查"
                      >
                        {healthChecking === sub.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingSubsidiary(sub);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="編輯"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteSubsidiary(sub)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="刪除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
