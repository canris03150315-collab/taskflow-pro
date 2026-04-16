import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, KOLProfile, KOLStats, KOL_PLATFORMS, KOLPlatform, DepartmentDef, Role, KOLWeeklyPayment } from '../types';
import { api } from '../services/api';
import { AddPaymentModal, PaymentHistoryModal } from './PaymentModals';
import { showSuccess, showError, showWarning, showConfirm, showToast } from '../utils/dialogService';

interface KOLManagementViewProps {
  currentUser: User;
  departments?: DepartmentDef[];
}

export const KOLManagementView: React.FC<KOLManagementViewProps> = ({ currentUser, departments = [] }) => {
  const [profiles, setProfiles] = useState<KOLProfile[]>([]);
  const [stats, setStats] = useState<KOLStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<KOLProfile | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>(currentUser.department);
  const [payments, setPayments] = useState<KOLWeeklyPayment[]>([]);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [profilePayments, setProfilePayments] = useState<Record<string, number>>({});
  const [showPaymentStatsModal, setShowPaymentStatsModal] = useState(false);
  const [paymentStats, setPaymentStats] = useState<{ total: number; count: number; average: number; byKol: any[] } | null>(null);
  const [statsDateRange, setStatsDateRange] = useState({ startDate: '', endDate: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBoss = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery, selectedDept]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesRes, statsRes] = await Promise.all([
        api.kol.getProfiles({ status: statusFilter !== 'ALL' ? statusFilter : undefined, search: searchQuery || undefined, departmentId: isBoss ? selectedDept : currentUser.department }),
        api.kol.getStats({ departmentId: isBoss ? selectedDept : currentUser.department })
      ]);
      
      const transformedProfiles = profilesRes.profiles.map((p: any) => ({
        id: p.id,
        platform: p.platform || 'FACEBOOK',
        platformId: p.platform_id || p.platformId || p.facebook_id || p.facebookId,
        platformAccount: p.platform_account || p.platformAccount,
        contactInfo: p.contact_info || p.contactInfo,
        status: p.status,
        statusColor: (p.status_color || p.statusColor || 'green') as 'green' | 'yellow' | 'red',
        weeklyPayNote: p.weekly_pay_note || p.weeklyPayNote,
        notes: p.notes,
        createdAt: p.created_at || p.createdAt,
        updatedAt: p.updated_at || p.updatedAt,
        createdBy: p.created_by || p.createdBy
      }));
      setProfiles(transformedProfiles);
      setStats(statsRes);
      
      await loadAllPayments(transformedProfiles);
    } catch (error) {
      console.error('Load KOL data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllPayments = async (profilesList: KOLProfile[]) => {
    try {
      const paymentPromises = profilesList.map(p => 
        api.kol.getKolPayments(p.id).catch(() => ({ payments: [], total: 0 }))
      );
      const results = await Promise.all(paymentPromises);
      
      const paymentMap: Record<string, number> = {};
      profilesList.forEach((p, i) => {
        paymentMap[p.id] = results[i].total || 0;
      });
      setProfilePayments(paymentMap);
    } catch (error) {
      console.error('Load payments error:', error);
    }
  };

  const loadPaymentStats = async (startDate?: string, endDate?: string) => {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (isBoss) params.departmentId = selectedDept;
      
      const result = await api.kol.getPaymentStats(params);
      setPaymentStats(result);
    } catch (error) {
      console.error('Load payment stats error:', error);
      showError('載入支付統計失敗');
    }
  };

  const loadPaymentHistory = async (kolId: string, startDate?: string, endDate?: string) => {
    try {
      const result = await api.kol.getKolPayments(kolId, { startDate, endDate });
      setPayments(result.payments);
      setPaymentTotal(result.total);
    } catch (error) {
      console.error('Load payment history error:', error);
      showError('載入支付記錄失敗');
    }
  };

  const handleAddPayment = async (data: { amount: number; paymentDate: string; notes?: string }) => {
    if (!selectedProfile) return;
    try {
      await api.kol.createKolPayment({ kolId: selectedProfile.id, ...data });
      setShowPaymentModal(false);
      showSuccess('支付記錄新增成功！');
      loadData();
    } catch (error) {
      console.error('Add payment error:', error);
      showError('新增支付記錄失敗');
    }
  };

  const handleEditPayment = async (paymentId: string, data: { amount: number; paymentDate: string; notes?: string }) => {
    try {
      await api.kol.updateKolPayment(paymentId, data);
      showSuccess('支付記錄更新成功！');
      if (selectedProfile) {
        await loadPaymentHistory(selectedProfile.id);
      }
      loadData();
    } catch (error: any) {
      console.error('Edit payment error:', error);
      if (error.message?.includes('Permission denied')) {
        showError('權限不足：只有創建者或主管可以編輯支付記錄');
      } else {
        showError('更新支付記錄失敗');
      }
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await api.kol.deleteKolPayment(paymentId);
      showSuccess('支付記錄刪除成功！');
      if (selectedProfile) {
        await loadPaymentHistory(selectedProfile.id);
      }
      loadData();
    } catch (error: any) {
      console.error('Delete payment error:', error);
      if (error.message?.includes('Permission denied')) {
        showError('權限不足：只有創建者或主管可以刪除支付記錄');
      } else {
        showError('刪除支付記錄失敗');
      }
    }
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (searchQuery && !p.platformId.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !p.platformAccount.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [profiles, statusFilter, searchQuery]);

  const getStatusColor = (statusColor?: 'green' | 'yellow' | 'red') => {
    switch (statusColor) {
      case 'green': return 'bg-green-100 text-green-800';
      case 'yellow': return 'bg-yellow-100 text-yellow-800';
      case 'red': return 'bg-red-100 text-red-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getStatusText = (statusColor?: 'green' | 'yellow' | 'red') => {
    switch (statusColor) {
      case 'green': return '正常合作';
      case 'yellow': return '暫停合作';
      case 'red': return '不再合作';
      default: return '正常合作';
    }
  };

  const handleAddProfile = async (data: any) => {
    try {
      await api.kol.createProfile({ ...data, departmentId: currentUser.department });
      setShowAddModal(false);
      loadData();
    } catch (error) {
      console.error('Add profile error:', error);
      showError('新增 KOL 失敗');
    }
  };

  const handleEditProfile = async (data: any) => {
    if (!selectedProfile) return;
    try {
      await api.kol.updateProfile(selectedProfile.id, data);
      setShowEditModal(false);
      setSelectedProfile(null);
      showSuccess('KOL 資料更新成功！');
      loadData();
    } catch (error) {
      console.error('Edit profile error:', error);
      showError('更新 KOL 資料失敗');
    }
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      await api.kol.deleteProfile(id);
      showSuccess('刪除成功');
      loadData();
    } catch (error) {
      console.error('Delete profile error:', error);
      showError('刪除失敗');
    }
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        if (!data) return;

        const workbook = await import('xlsx').then(XLSX => XLSX.read(data, { type: 'binary' }));
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = await import('xlsx').then(XLSX => XLSX.utils.sheet_to_json(worksheet));

        const formattedData = jsonData.map((row: any) => ({
          platformId: row['平台ID'] || row['platformId'] || '',
          platform: row['平台'] || row['platform'] || 'FACEBOOK',
          platformAccount: row['平台帳號'] || row['platformAccount'] || '',
          contactInfo: row['聯絡方式'] || row['contactInfo'] || '',
          status: row['狀態'] || row['status'] || 'ACTIVE',
          statusColor: row['狀態顏色'] || row['statusColor'] || 'green',
          weeklyPayNote: row['週薪備註'] || row['weeklyPayNote'] || '',
          notes: row['特別備註'] || row['notes'] || ''
        }));

        const result = await api.kol.importExcel(formattedData);
        
        let message = `導入完成！\n成功: ${result.results.success} 筆\n失敗: ${result.results.failed} 筆`;
        
        if (result.results.errors && result.results.errors.length > 0) {
          message += '\n\n失敗詳情：';
          result.results.errors.forEach((err: any) => {
            message += `\n第 ${err.row} 行: ${err.error}`;
          });
        }
        
        showSuccess(message);
        loadData();
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Excel import error:', error);
      showError('Excel 導入失敗');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExcelExport = async () => {
    try {
      const { profiles } = await api.kol.exportExcel();
      const XLSX = await import('xlsx');
      
      const exportData = profiles.map((p: any) => ({
        '平台': p.platform || 'FACEBOOK',
        '平台ID': p.platform_id || p.platformId,
        '平台帳號': p.platform_account || p.platformAccount,
        '聯絡方式': p.contact_info || '',
        '狀態顏色': p.status_color || 'green',
        '週薪備註': p.weekly_pay_note || '',
        '特別備註': p.notes || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'KOL名單');
      XLSX.writeFile(workbook, `KOL名單-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      showError('Excel 匯出失敗');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">載入中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">總 KOL 數</div>
          <div className="text-3xl font-bold mt-2">{stats?.totalKOLs || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">正常合作</div>
          <div className="text-3xl font-bold mt-2">{stats?.activeKOLs || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">暫停合作</div>
          <div className="text-3xl font-bold mt-2">{stats?.pausedKOLs || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">不再合作</div>
          <div className="text-3xl font-bold mt-2">{stats?.stoppedKOLs || 0}</div>
        </div>
        <div 
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => {
            loadPaymentStats();
            setShowPaymentStatsModal(true);
          }}
          title="點擊查看詳細統計"
        >
          <div className="text-sm opacity-90">總支付金額</div>
          <div className="text-3xl font-bold mt-2">
            ${Object.values(profilePayments).reduce((sum: number, val: number) => sum + val, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 工具列 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          {isBoss && departments.length > 0 && (
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-purple-50 font-medium"
            >
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>🏢 {dept.name}</option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="ALL">全部狀態</option>
            <option value="ACTIVE">正常合作</option>
            <option value="STOPPED">暫停合作</option>
            <option value="LOST_CONTACT">不再合作</option>
          </select>

          <input
            type="text"
            placeholder="搜尋 KOL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />

          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 shadow-md whitespace-nowrap"
          >
            + 新增 KOL
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelImport}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-md whitespace-nowrap"
          >
            📥 導入 Excel
          </button>

          <button
            onClick={handleExcelExport}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-md whitespace-nowrap"
          >
            📤 匯出 Excel
          </button>

          <button
            onClick={() => {
              loadPaymentStats();
              setShowPaymentStatsModal(true);
            }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md whitespace-nowrap"
          >
            📊 支付統計
          </button>
        </div>
      </div>

      {/* KOL 列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">平台</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">平台 ID / 帳號</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">週薪備註</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">累計支付</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">合作狀態</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">特別備註</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProfiles.map((profile) => (
              <tr key={profile.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="text-xl">{KOL_PLATFORMS.find(p => p.value === profile.platform)?.icon}</span>
                  <span className="ml-1 text-xs text-gray-500">{KOL_PLATFORMS.find(p => p.value === profile.platform)?.label}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{profile.platformId}</div>
                  <div className="text-sm text-gray-500">@{profile.platformAccount}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">
                      {profile.weeklyPayNote || '-'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => {
                      setSelectedProfile(profile);
                      loadPaymentHistory(profile.id);
                      setShowPaymentHistoryModal(true);
                    }}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="點擊查看支付記錄"
                  >
                    ${profilePayments[profile.id]?.toLocaleString() || '0'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(profile.statusColor)}`}>
                    {getStatusText(profile.statusColor)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-600 max-w-xs truncate">
                    {profile.notes || '-'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedProfile(profile);
                        setShowPaymentModal(true);
                      }}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      title="記錄支付"
                    >
                      💰 支付
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProfile(profile);
                        setShowEditModal(true);
                      }}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      title="編輯 KOL"
                    >
                      ✏️ 編輯
                    </button>
                    <button
                      onClick={async () => {
                        if (await showConfirm(`確定要刪除 ${profile.platformId} 嗎？`)) {
                          handleDeleteProfile(profile.id);
                        }
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="刪除"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProfiles.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <p>沒有找到符合條件的 KOL</p>
          </div>
        )}
      </div>

      {/* 新增 Modal */}
      {showAddModal && (
        <AddKOLModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddProfile}
        />
      )}

      {/* 編輯 Modal */}
      {showEditModal && selectedProfile && (
        <EditKOLModal
          profile={selectedProfile}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProfile(null);
          }}
          onSubmit={handleEditProfile}
        />
      )}

      {/* 支付 Modal */}
      {showPaymentModal && selectedProfile && (
        <AddPaymentModal
          profile={selectedProfile}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedProfile(null);
          }}
          onSubmit={handleAddPayment}
        />
      )}

      {/* 支付記錄 Modal */}
      {showPaymentHistoryModal && selectedProfile && (
        <PaymentHistoryModal
          profile={selectedProfile}
          payments={payments}
          total={paymentTotal}
          currentUser={currentUser}
          onClose={() => {
            setShowPaymentHistoryModal(false);
            setSelectedProfile(null);
            setPayments([]);
            setPaymentTotal(0);
          }}
          onEdit={handleEditPayment}
          onDelete={handleDeletePayment}
          onRefresh={(startDate, endDate) => loadPaymentHistory(selectedProfile.id, startDate, endDate)}
        />
      )}

      {/* 支付統計 Modal */}
      {showPaymentStatsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">💰 支付統計</h2>
              <button
                onClick={() => setShowPaymentStatsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* 日期範圍選擇 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-1">開始日期</label>
                  <input
                    type="date"
                    value={statsDateRange.startDate}
                    onChange={(e) => setStatsDateRange({ ...statsDateRange, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-1">結束日期</label>
                  <input
                    type="date"
                    value={statsDateRange.endDate}
                    onChange={(e) => setStatsDateRange({ ...statsDateRange, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <button
                  onClick={() => loadPaymentStats(statsDateRange.startDate, statsDateRange.endDate)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  查詢
                </button>
                <button
                  onClick={() => {
                    setStatsDateRange({ startDate: '', endDate: '' });
                    loadPaymentStats();
                  }}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  清除
                </button>
              </div>
            </div>

            {/* 統計數據 */}
            {paymentStats && (
              <div className="space-y-6">
                {/* 總覽卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <div className="text-sm opacity-90">總支付金額</div>
                    <div className="text-3xl font-bold mt-2">${paymentStats.total.toLocaleString()}</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <div className="text-sm opacity-90">支付次數</div>
                    <div className="text-3xl font-bold mt-2">{paymentStats.count}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <div className="text-sm opacity-90">平均金額</div>
                    <div className="text-3xl font-bold mt-2">${paymentStats.average.toLocaleString()}</div>
                  </div>
                </div>

                {/* 按 KOL 統計 */}
                {paymentStats.byKol && paymentStats.byKol.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4">📊 支付排行榜（前 10 名）</h3>
                    <div className="bg-white border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">排名</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">KOL ID</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">累計支付</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {paymentStats.byKol.map((item, index) => (
                            <tr key={item.kolId} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <span className={`font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium">{item.platformId || item.kolId}</td>
                              <td className="px-4 py-3 text-right font-bold text-green-600">
                                ${item.total.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!paymentStats && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📊</div>
                <p>請選擇日期範圍後點擊查詢</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 新增 KOL Modal
const AddKOLModal: React.FC<{ onClose: () => void; onSubmit: (data: any) => void }> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    platform: 'FACEBOOK' as KOLPlatform,
    platformId: '',
    platformAccount: '',
    contactInfo: '',
    status: 'ACTIVE',
    statusColor: 'green' as 'green' | 'yellow' | 'red',
    weeklyPayNote: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.platformId || !formData.platformAccount) {
      showWarning('請填寫平台 ID 和帳號');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">新增 KOL</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">平台</label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value as KOLPlatform })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {KOL_PLATFORMS.map(p => (
                <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">平台 ID *</label>
            <input
              type="text"
              value={formData.platformId}
              onChange={(e) => setFormData({ ...formData, platformId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">平台帳號 *</label>
            <input
              type="text"
              value={formData.platformAccount}
              onChange={(e) => setFormData({ ...formData, platformAccount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">聯絡方式</label>
            <input
              type="text"
              value={formData.contactInfo}
              onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">合作狀態</label>
            <select
              value={formData.statusColor}
              onChange={(e) => setFormData({ ...formData, statusColor: e.target.value as 'green' | 'yellow' | 'red' })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="green">🟢 正常合作</option>
              <option value="yellow">🟡 暫停合作</option>
              <option value="red">🔴 不再合作</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">週薪備註</label>
            <input
              type="text"
              value={formData.weeklyPayNote}
              onChange={(e) => setFormData({ ...formData, weeklyPayNote: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="例如：每週五發放 $1000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">特別備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              新增
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 編輯 KOL Modal
const EditKOLModal: React.FC<{ profile: KOLProfile; onClose: () => void; onSubmit: (data: any) => void }> = ({ profile, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    platform: profile.platform,
    platformId: profile.platformId,
    platformAccount: profile.platformAccount,
    contactInfo: profile.contactInfo || '',
    status: profile.status,
    statusColor: profile.statusColor || 'green',
    weeklyPayNote: profile.weeklyPayNote || '',
    notes: profile.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.platformId || !formData.platformAccount) {
      showWarning('請填寫平台 ID 和帳號');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">編輯 KOL</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">平台</label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value as KOLPlatform })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {KOL_PLATFORMS.map(p => (
                <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">平台 ID *</label>
            <input
              type="text"
              value={formData.platformId}
              onChange={(e) => setFormData({ ...formData, platformId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">平台帳號 *</label>
            <input
              type="text"
              value={formData.platformAccount}
              onChange={(e) => setFormData({ ...formData, platformAccount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">聯絡方式</label>
            <input
              type="text"
              value={formData.contactInfo}
              onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">合作狀態</label>
            <select
              value={formData.statusColor}
              onChange={(e) => setFormData({ ...formData, statusColor: e.target.value as 'green' | 'yellow' | 'red' })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="green">🟢 正常合作</option>
              <option value="yellow">🟡 暫停合作</option>
              <option value="red">🔴 不再合作</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">週薪備註</label>
            <input
              type="text"
              value={formData.weeklyPayNote}
              onChange={(e) => setFormData({ ...formData, weeklyPayNote: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="例如：每週五發放 $1000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">特別備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
