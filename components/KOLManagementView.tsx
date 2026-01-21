import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, KOLProfile, KOLContract, KOLPayment, KOLStats, KOL_PLATFORMS, KOLPlatform, DepartmentDef, Role } from '../types';
import { api } from '../services/api';

interface KOLManagementViewProps {
  currentUser: User;
  departments?: DepartmentDef[];
}

export const KOLManagementView: React.FC<KOLManagementViewProps> = ({ currentUser, departments = [] }) => {
  const [profiles, setProfiles] = useState<KOLProfile[]>([]);
  const [contracts, setContracts] = useState<KOLContract[]>([]);
  const [payments, setPayments] = useState<KOLPayment[]>([]);
  const [stats, setStats] = useState<KOLStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'profiles' | 'contracts' | 'payments'>('profiles');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<KOLProfile | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showEditContractModal, setShowEditContractModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<KOLContract | null>(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>(currentUser.department);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBoss = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery, activeView, selectedDept]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesRes, statsRes] = await Promise.all([
        api.kol.getProfiles({ status: statusFilter !== 'ALL' ? statusFilter : undefined, search: searchQuery || undefined, departmentId: isBoss ? selectedDept : currentUser.department }),
        api.kol.getStats({ departmentId: isBoss ? selectedDept : currentUser.department })
      ]);
      
      // 轉換 snake_case 到 camelCase
      const transformedProfiles = profilesRes.profiles.map((p: any) => ({
        id: p.id,
        platform: p.platform || 'FACEBOOK',
        platformId: p.platform_id || p.platformId || p.facebook_id || p.facebookId,
        platformAccount: p.platform_account || p.platformAccount,
        contactInfo: p.contact_info || p.contactInfo,
        status: p.status,
        statusColor: (p.status_color || p.statusColor || 'green') as 'green' | 'yellow' | 'red',
        notes: p.notes,
        createdAt: p.created_at || p.createdAt,
        updatedAt: p.updated_at || p.updatedAt,
        createdBy: p.created_by || p.createdBy,
        contractCount: p.contractCount,
        activeContracts: p.activeContracts,
        totalUnpaid: p.totalUnpaid
      }));
      setProfiles(transformedProfiles);
      setStats(statsRes);

      if (activeView === 'contracts') {
        const contractsRes = await api.kol.getContracts({ departmentId: isBoss ? selectedDept : currentUser.department });
        const transformedContracts = contractsRes.contracts.map((c: any) => ({
          id: c.id,
          kolId: c.kol_id || c.kolId,
          startDate: c.start_date || c.startDate,
          endDate: c.end_date || c.endDate,
          salaryAmount: c.salary_amount || c.salaryAmount,
          depositAmount: c.deposit_amount || c.depositAmount,
          unpaidAmount: c.unpaid_amount || c.unpaidAmount,
          clearedAmount: c.cleared_amount || c.clearedAmount,
          totalPaid: c.total_paid || c.totalPaid,
          contractType: c.contract_type || c.contractType,
          notes: c.notes,
          platform: c.platform || 'FACEBOOK',
          platformId: c.platform_id || c.platformId || c.facebook_id || c.facebookId,
          platformAccount: c.platform_account || c.platformAccount,
          kolStatus: c.kol_status || c.kolStatus
        }));
        setContracts(transformedContracts);
      } else if (activeView === 'payments') {
        const paymentsRes = await api.kol.getPayments({});
        const transformedPayments = paymentsRes.payments.map((p: any) => ({
          id: p.id,
          contractId: p.contract_id || p.contractId,
          paymentDate: p.payment_date || p.paymentDate,
          amount: p.amount,
          paymentType: p.payment_type || p.paymentType,
          notes: p.notes,
          kolId: p.kol_id || p.kolId,
          platform: p.platform || 'FACEBOOK',
          platformId: p.platform_id || p.platformId || p.facebook_id || p.facebookId,
          platformAccount: p.platform_account || p.platformAccount
        }));
        setPayments(transformedPayments);
      }
    } catch (error) {
      console.error('Load KOL data error:', error);
    } finally {
      setLoading(false);
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
      default: return 'bg-green-100 text-green-800'; // 預設綠色
    }
  };

  const handleAddProfile = async (data: any) => {
    try {
      await api.kol.createProfile({ ...data, departmentId: currentUser.department });
      setShowAddModal(false);
      loadData();
    } catch (error) {
      console.error('Add profile error:', error);
      alert('新增 KOL 失敗');
    }
  };

  const handleEditProfile = async (data: any) => {
    if (!selectedProfile) return;
    try {
      await api.kol.updateProfile(selectedProfile.id, data);
      setShowEditModal(false);
      setSelectedProfile(null);
      alert('KOL 資料更新成功！');
      loadData();
    } catch (error) {
      console.error('Edit profile error:', error);
      alert('更新 KOL 資料失敗');
    }
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      await api.kol.deleteProfile(id);
      alert('刪除成功');
      loadData();
    } catch (error) {
      console.error('Delete profile error:', error);
      alert('刪除失敗');
    }
  };

  const handleQuickPayment = async (profile: KOLProfile) => {
    try {
      const contractsRes = await api.kol.getContracts({ kolId: profile.id });
      if (contractsRes.contracts.length === 0) {
        alert('此 KOL 沒有合約，請先新增合約');
        setSelectedProfile(profile);
        setShowAddContractModal(true);
        return;
      }

      const contract = contractsRes.contracts[0];
      const remainingAmount = contract.unpaidAmount;
      
      const amount = prompt(`記錄支付金額（未付金額：$${remainingAmount}）：`);
      if (!amount || isNaN(parseFloat(amount))) return;

      const paymentAmount = parseFloat(amount);
      if (paymentAmount > remainingAmount) {
        alert(`支付金額不能超過未付金額！\n未付金額：$${remainingAmount}\n輸入金額：$${paymentAmount}`);
        return;
      }

      if (paymentAmount <= 0) {
        alert('支付金額必須大於 0');
        return;
      }

      await api.kol.createPayment({
        contractId: contract.id,
        paymentDate: new Date().toISOString().split('T')[0],
        amount: paymentAmount,
        paymentType: 'SALARY',
        notes: '快速支付'
      });

      alert('支付記錄成功！');
      loadData();
    } catch (error) {
      console.error('Quick payment error:', error);
      alert('支付記錄失敗');
    }
  };

  const handleAddContract = async (data: any) => {
    try {
      await api.kol.createContract(data);
      setShowAddContractModal(false);
      alert('合約新增成功！');
      loadData();
    } catch (error) {
      console.error('Add contract error:', error);
      alert('新增合約失敗');
    }
  };

  const handleEditContract = async (data: any) => {
    if (!selectedContract) return;
    try {
      await api.kol.updateContract(selectedContract.id, data);
      setShowEditContractModal(false);
      setSelectedContract(null);
      alert('合約更新成功！');
      loadData();
    } catch (error) {
      console.error('Edit contract error:', error);
      alert('更新合約失敗');
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    try {
      await api.kol.deleteContract(contractId);
      alert('合約刪除成功！');
      loadData();
    } catch (error) {
      console.error('Delete contract error:', error);
      alert('刪除合約失敗');
    }
  };

  const handleAddPayment = async (data: any) => {
    try {
      await api.kol.createPayment(data);
      setShowAddPaymentModal(false);
      alert('支付記錄成功！');
      loadData();
    } catch (error) {
      console.error('Add payment error:', error);
      alert('記錄支付失敗');
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

        // 解析日期範圍（開始日期:到期日 或 開始日期-到期日）
        const parseDateRange = (dateStr: string) => {
          if (!dateStr) return { start: '', end: '' };
          const str = String(dateStr);
          const parts = str.split(/[-:~]/);
          return { start: parts[0]?.trim() || '', end: parts[1]?.trim() || '' };
        };

        const formattedData = jsonData.map((row: any) => {
          const dateRange = parseDateRange(row['開始日期:到期日'] || row['合約期間'] || '');
          const fbId = row['臉書ID'] || row['平台ID'] || row['platformId'] || row['facebookId'] || '';
          return {
            facebookId: fbId,
            platformId: fbId,
            platform: row['平台'] || row['platform'] || 'FACEBOOK',
            platformAccount: row['平台帳號'] || row['platformAccount'] || fbId,
            contactInfo: row['聯絡方式'] || row['contactInfo'] || '',
            status: row['狀態'] || row['status'] || 'ACTIVE',
            notes: row['備註:'] || row['備註'] || row['notes'] || '',
            startDate: row['開始日期'] || dateRange.start || '',
            endDate: row['到期日'] || dateRange.end || '',
            salaryAmount: parseFloat(row['工資/傭金'] || row['salaryAmount'] || 0),
            depositAmount: parseFloat(row['訂金'] || row['depositAmount'] || 0),
            unpaidAmount: parseFloat(row['未付金額'] || row['unpaidAmount'] || 0),
            clearedAmount: parseFloat(row['截清金額'] || row['clearedAmount'] || 0),
            totalPaid: parseFloat(row['總付金額'] || row['totalPaid'] || 0),
            contractType: row['類型'] || row['contractType'] || 'NORMAL',
            contractNotes: row['合作備註'] || row['contractNotes'] || ''
          };
        });

        const result = await api.kol.importExcel(formattedData);
        
        let message = `導入完成！\n成功: ${result.results.success} 筆\n失敗: ${result.results.failed} 筆`;
        
        if (result.results.errors && result.results.errors.length > 0) {
          message += '\n\n失敗詳情：';
          result.results.errors.forEach((err: any) => {
            message += `\n第 ${err.row} 行: ${err.error}`;
          });
        }
        
        alert(message);
        loadData();
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Excel import error:', error);
      alert('Excel 導入失敗');
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
        '臉書ID': p.facebook_id,
        '平台帳號': p.platform_account,
        '聯絡方式': p.contact_info || '',
        '狀態': p.status,
        '備註': p.notes || '',
        '開始日期': p.start_date || '',
        '到期日': p.end_date || '',
        '工資/傭金': p.salary_amount || 0,
        '訂金': p.deposit_amount || 0,
        '未付金額': p.unpaid_amount || 0,
        '截清金額': p.cleared_amount || 0,
        '總付金額': p.total_paid || 0,
        '類型': p.contract_type || '',
        '合作備註': p.contract_notes || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'KOL工資紀錄');
      XLSX.writeFile(workbook, `KOL工資紀錄-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Excel 匯出失敗');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">載入中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">總 KOL 數</div>
          <div className="text-3xl font-bold mt-2">{stats?.totalKOLs || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">活躍 KOL</div>
          <div className="text-3xl font-bold mt-2">{stats?.activeKOLs || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">未付款項 ⚠️</div>
          <div className="text-3xl font-bold mt-2">${stats?.totalUnpaid?.toFixed(0) || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">本月支出</div>
          <div className="text-3xl font-bold mt-2">${stats?.monthlyPayments?.toFixed(0) || 0}</div>
        </div>
      </div>

      {/* 主導航標籤頁 */}
      <div className="bg-white rounded-xl shadow-sm p-2 flex gap-2">
        <button
          onClick={() => setActiveView('profiles')}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
            activeView === 'profiles' 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          👥 KOL 列表
        </button>
        <button
          onClick={() => setActiveView('contracts')}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
            activeView === 'contracts' 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          📄 合約管理
        </button>
        <button
          onClick={() => setActiveView('payments')}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
            activeView === 'payments' 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          💰 支付記錄
        </button>
      </div>

      {/* 工具列 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          {/* 部門選擇器 - 只有主管可見 */}
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

          {activeView === 'profiles' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">全部狀態</option>
                <option value="ACTIVE">正常合作</option>
                <option value="STOPPED">停止合作</option>
                <option value="NEGOTIATING">協議中</option>
                <option value="LOST_CONTACT">失聯</option>
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
            </>
          )}

          {activeView === 'contracts' && (
            <button
              onClick={() => setShowAddContractModal(true)}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 shadow-md whitespace-nowrap"
            >
              + 新增合約
            </button>
          )}

          {activeView === 'payments' && (
            <button
              onClick={() => setShowAddPaymentModal(true)}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 shadow-md whitespace-nowrap"
            >
              + 記錄支付
            </button>
          )}
        </div>
      </div>

      {/* KOL 列表視圖 - 條列式 */}
      {activeView === 'profiles' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">平台</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">平台 ID / 帳號</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">狀態</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">合約數</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">未付金額</th>
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
                    <div 
                      className="cursor-pointer hover:text-purple-600"
                      onClick={() => {
                        setSelectedProfile(profile);
                        setShowDetailModal(true);
                      }}
                    >
                      <div className="font-medium">{profile.platformId}</div>
                      <div className="text-sm text-gray-500">@{profile.platformAccount}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(profile.statusColor)}`}>
                      {profile.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <span className="font-medium">{profile.contractCount || 0}</span>
                      <span className="text-gray-500"> 筆</span>
                      {(profile.activeContracts || 0) > 0 && (
                        <span className="ml-1 text-green-600">({profile.activeContracts} 活躍)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${(profile.totalUnpaid || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      ${profile.totalUnpaid?.toFixed(0) || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {(profile.contractCount || 0) > 0 && (
                        <button
                          onClick={() => handleQuickPayment(profile)}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          title="快速支付"
                        >
                          💰 支付
                        </button>
                      )}
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
                        onClick={() => {
                          setSelectedProfile(profile);
                          setShowAddContractModal(true);
                        }}
                        className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                        title="新增合約"
                      >
                        📄 合約
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`確定要刪除 ${profile.platformId} 嗎？`)) {
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
      )}

      {/* 合約列表視圖 */}
      {activeView === 'contracts' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">KOL</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">工資/傭金</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">訂金</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">未付金額</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">已付金額</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">到期日</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{contract.platformId}</div>
                    <div className="text-sm text-gray-500">@{contract.platformAccount}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-green-600">${contract.salaryAmount}</td>
                  <td className="px-4 py-3">${contract.depositAmount}</td>
                  <td className="px-4 py-3 font-medium">
                    {contract.unpaidAmount > 0 ? (
                      <span className="text-orange-600">${contract.unpaidAmount}</span>
                    ) : (
                      <span className="text-green-600">✓ 結清</span>
                    )}
                  </td>
                  <td className="px-4 py-3">${contract.totalPaid}</td>
                  <td className="px-4 py-3 text-sm">{contract.endDate || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const remainingAmount = contract.unpaidAmount;
                          const amount = prompt(`記錄支付金額（未付金額：$${remainingAmount}）：`);
                          if (!amount || isNaN(parseFloat(amount))) return;
                          
                          const paymentAmount = parseFloat(amount);
                          if (paymentAmount <= 0) {
                            alert('支付金額必須大於 0');
                            return;
                          }
                          if (paymentAmount > remainingAmount) {
                            alert(`支付金額不能超過未付金額！\n未付金額：$${remainingAmount}\n輸入金額：$${paymentAmount}`);
                            return;
                          }
                          
                          try {
                            await api.kol.createPayment({
                              contractId: contract.id,
                              paymentDate: new Date().toISOString().split('T')[0],
                              amount: paymentAmount,
                              paymentType: 'SALARY'
                            });
                            alert('支付記錄成功！');
                            loadData();
                          } catch (error) {
                            alert('支付記錄失敗');
                          }
                        }}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        title="記錄支付"
                      >
                        💰 支付
                      </button>
                      <button
                        onClick={() => {
                          setSelectedContract(contract);
                          setShowEditContractModal(true);
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        title="編輯合約"
                      >
                        ✏️ 編輯
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`確定要刪除此合約嗎？\n\nKOL: ${contract.platformId}\n工資: $${contract.salaryAmount}\n未付: $${contract.unpaidAmount}`)) {
                            handleDeleteContract(contract.id);
                          }
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="刪除合約"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {contracts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📄</div>
              <p>暫無合約記錄</p>
            </div>
          )}
        </div>
      )}

      {/* 支付記錄視圖 */}
      {activeView === 'payments' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">日期</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">KOL</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">金額</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">類型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{payment.paymentDate}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{payment.platformId}</div>
                    <div className="text-sm text-gray-500">@{payment.platformAccount}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-green-600">${payment.amount}</td>
                  <td className="px-4 py-3 text-sm">{payment.paymentType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{payment.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {payments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">💰</div>
              <p>暫無支付記錄</p>
            </div>
          )}
        </div>
      )}

      {/* 新增 KOL Modal */}
      {showAddModal && (
        <AddKOLModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddProfile}
        />
      )}

      {/* 編輯 KOL Modal */}
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

      {/* KOL 詳情 Modal */}
      {showDetailModal && selectedProfile && (
        <KOLDetailModal
          profile={selectedProfile}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedProfile(null);
          }}
          onAddContract={() => {
            setShowAddContractModal(true);
          }}
          onRefresh={loadData}
        />
      )}

      {/* 新增合約 Modal */}
      {showAddContractModal && (
        <AddContractModal
          profiles={profiles}
          selectedProfileId={selectedProfile?.id}
          onClose={() => setShowAddContractModal(false)}
          onSubmit={handleAddContract}
        />
      )}

      {/* 編輯合約 Modal */}
      {showEditContractModal && selectedContract && (
        <EditContractModal
          contract={selectedContract}
          profiles={profiles}
          onClose={() => {
            setShowEditContractModal(false);
            setSelectedContract(null);
          }}
          onSubmit={handleEditContract}
        />
      )}

      {/* 記錄支付 Modal */}
      {showAddPaymentModal && (
        <AddPaymentModal
          contracts={contracts}
          onClose={() => setShowAddPaymentModal(false)}
          onSubmit={handleAddPayment}
        />
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
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">新增 KOL</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">平台 *</label>
            <select
              required
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value as KOLPlatform })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {KOL_PLATFORMS.map(p => (
                <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">平台 ID *</label>
            <input
              type="text"
              required
              value={formData.platformId}
              onChange={(e) => setFormData({ ...formData, platformId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="例如: facebook.com/xxx 的 xxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">平台帳號 *</label>
            <input
              type="text"
              required
              value={formData.platformAccount}
              onChange={(e) => setFormData({ ...formData, platformAccount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">聯絡方式</label>
            <input
              type="text"
              value={formData.contactInfo}
              onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
            <input
              type="text"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="例如：正常合作、停止合作、協議中等"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">狀態顏色</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, statusColor: 'green' })}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  formData.statusColor === 'green'
                    ? 'bg-green-100 border-green-500 text-green-800'
                    : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                }`}
              >
                🟢 綠色
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, statusColor: 'yellow' })}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  formData.statusColor === 'yellow'
                    ? 'bg-yellow-100 border-yellow-500 text-yellow-800'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-600 hover:bg-yellow-100'
                }`}
              >
                🟡 黃色
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, statusColor: 'red' })}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  formData.statusColor === 'red'
                    ? 'bg-red-100 border-red-500 text-red-800'
                    : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                }`}
              >
                🔴 紅色
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">取消</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg">新增</button>
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
    statusColor: (profile.statusColor || 'green') as 'green' | 'yellow' | 'red',
    notes: profile.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">編輯 KOL</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">平台 *</label>
            <select
              required
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value as KOLPlatform })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {KOL_PLATFORMS.map(p => (
                <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">平台 ID *</label>
            <input
              type="text"
              required
              value={formData.platformId}
              onChange={(e) => setFormData({ ...formData, platformId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">平台帳號 *</label>
            <input
              type="text"
              required
              value={formData.platformAccount}
              onChange={(e) => setFormData({ ...formData, platformAccount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">聯絡方式</label>
            <input
              type="text"
              value={formData.contactInfo}
              onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
            <input
              type="text"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="例如：正常合作、停止合作、協議中等"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">狀態顏色</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, statusColor: 'green' })}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  formData.statusColor === 'green'
                    ? 'bg-green-100 border-green-500 text-green-800'
                    : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                }`}
              >
                🟢 綠色
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, statusColor: 'yellow' })}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  formData.statusColor === 'yellow'
                    ? 'bg-yellow-100 border-yellow-500 text-yellow-800'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-600 hover:bg-yellow-100'
                }`}
              >
                🟡 黃色
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, statusColor: 'red' })}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  formData.statusColor === 'red'
                    ? 'bg-red-100 border-red-500 text-red-800'
                    : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                }`}
              >
                🔴 紅色
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">取消</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg">更新</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// KOL 詳情 Modal
const KOLDetailModal: React.FC<{ 
  profile: KOLProfile; 
  onClose: () => void; 
  onAddContract: () => void;
  onRefresh: () => void;
}> = ({ profile, onClose, onAddContract, onRefresh }) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const data = await api.kol.getProfile(profile.id);
        setDetails(data);
      } catch (error) {
        console.error('Load details error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [profile.id]);

  const handleQuickPayment = async (contractId: string) => {
    const contract = details?.contracts?.find((c: any) => c.id === contractId);
    if (!contract) return;

    const remainingAmount = contract.unpaid_amount;
    const amount = prompt(`記錄支付金額（未付金額：$${remainingAmount}）：`);
    if (!amount || isNaN(parseFloat(amount))) return;

    const paymentAmount = parseFloat(amount);
    if (paymentAmount > remainingAmount) {
      alert(`支付金額不能超過未付金額！\n未付金額：$${remainingAmount}\n輸入金額：$${paymentAmount}`);
      return;
    }

    if (paymentAmount <= 0) {
      alert('支付金額必須大於 0');
      return;
    }

    try {
      await api.kol.createPayment({
        contractId,
        paymentDate: new Date().toISOString().split('T')[0],
        amount: paymentAmount,
        paymentType: 'SALARY'
      });
      alert('支付記錄成功！');
      const data = await api.kol.getProfile(profile.id);
      setDetails(data);
      onRefresh();
    } catch (error) {
      alert('支付記錄失敗');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">載入中...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">{KOL_PLATFORMS.find(p => p.value === profile.platform)?.icon} {profile.platformId}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* 基本資訊 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">基本資訊</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-gray-600">平台：</span><span className="font-medium">{KOL_PLATFORMS.find(p => p.value === (details?.profile?.platform || 'FACEBOOK'))?.label}</span></div>
              <div><span className="text-gray-600">平台ID：</span><span className="font-medium">{details?.profile?.platform_id || details?.profile?.facebook_id}</span></div>
              <div><span className="text-gray-600">平台帳號：</span><span className="font-medium">{details?.profile?.platform_account}</span></div>
              <div><span className="text-gray-600">聯絡方式：</span><span className="font-medium">{details?.profile?.contact_info || '-'}</span></div>
              <div><span className="text-gray-600">狀態：</span><span className="font-medium">{details?.profile?.status}</span></div>
            </div>
          </div>

          {/* 合約記錄 */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">合約記錄 ({details?.contracts?.length || 0})</h3>
              <button onClick={onAddContract} className="px-4 py-1 bg-purple-500 text-white rounded-lg text-sm">+ 新增合約</button>
            </div>
            {details?.contracts && details.contracts.length > 0 ? (
              <div className="space-y-3">
                {details.contracts.map((contract: any) => (
                  <div key={contract.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div><span className="text-gray-600">工資/傭金：</span><span className="font-medium text-green-600">${contract.salary_amount}</span></div>
                      <div><span className="text-gray-600">訂金：</span><span className="font-medium">${contract.deposit_amount}</span></div>
                      <div><span className="text-gray-600">未付金額：</span><span className="font-medium text-orange-600">${contract.unpaid_amount}</span></div>
                      <div><span className="text-gray-600">截清金額：</span><span className="font-medium">${contract.cleared_amount}</span></div>
                      <div><span className="text-gray-600">總付金額：</span><span className="font-medium">${contract.total_paid}</span></div>
                      <div><span className="text-gray-600">類型：</span><span className="font-medium">{contract.contract_type}</span></div>
                    </div>
                    {contract.unpaid_amount > 0 && (
                      <button
                        onClick={() => handleQuickPayment(contract.id)}
                        className="mt-3 px-4 py-1 bg-green-500 text-white rounded-lg text-sm"
                      >
                        💰 記錄支付
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">暫無合約記錄</p>
            )}
          </div>

          {/* 支付記錄 */}
          {details?.payments && details.payments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">支付記錄 ({details.payments.length})</h3>
              <div className="space-y-2">
                {details.payments.map((payment: any) => (
                  <div key={payment.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <div>
                      <span className="font-medium text-green-600">${payment.amount}</span>
                      <span className="text-sm text-gray-600 ml-2">{payment.payment_type}</span>
                    </div>
                    <span className="text-sm text-gray-500">{payment.payment_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 新增合約 Modal
const AddContractModal: React.FC<{ 
  profiles: KOLProfile[];
  selectedProfileId?: string;
  onClose: () => void; 
  onSubmit: (data: any) => void;
}> = ({ profiles, selectedProfileId, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    kolId: selectedProfileId || '',
    salaryAmount: '',
    depositAmount: '0',
    startDate: '',
    endDate: '',
    contractType: 'NORMAL',
    notes: '',
    weeklyNotes: ''
  });

  // 自動計算未付金額
  const calculatedUnpaidAmount = () => {
    const salary = parseFloat(formData.salaryAmount) || 0;
    const deposit = parseFloat(formData.depositAmount) || 0;
    return salary - deposit;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const salaryAmount = parseFloat(formData.salaryAmount);
    const depositAmount = parseFloat(formData.depositAmount) || 0;
    
    // 驗證訂金不能超過工資
    if (depositAmount > salaryAmount) {
      alert(`訂金不能超過工資/傭金！\n工資/傭金：$${salaryAmount}\n訂金：$${depositAmount}`);
      return;
    }
    
    onSubmit({
      ...formData,
      salaryAmount: salaryAmount,
      depositAmount: depositAmount,
      unpaidAmount: salaryAmount - depositAmount
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">新增合約</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">選擇 KOL *</label>
            <select
              required
              value={formData.kolId}
              onChange={(e) => setFormData({ ...formData, kolId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">請選擇</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{KOL_PLATFORMS.find(pl => pl.value === p.platform)?.icon} {p.platformId} (@{p.platformAccount})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工資/傭金 *</label>
              <input
                type="number"
                required
                value={formData.salaryAmount}
                onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">訂金</label>
              <input
                type="number"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">未付金額（自動計算）</label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium">
              ${calculatedUnpaidAmount().toFixed(0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">= 工資/傭金 - 訂金</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">到期日</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="合約相關備註"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">週薪備註</label>
            <textarea
              value={formData.weeklyNotes}
              onChange={(e) => setFormData({ ...formData, weeklyNotes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="週薪相關說明或備註"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">取消</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg">新增</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 編輯合約 Modal
const EditContractModal: React.FC<{ 
  contract: KOLContract;
  profiles: KOLProfile[];
  onClose: () => void; 
  onSubmit: (data: any) => void;
}> = ({ contract, profiles, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    kolId: contract.kolId,
    salaryAmount: contract.salaryAmount.toString(),
    depositAmount: contract.depositAmount.toString(),
    unpaidAmount: contract.unpaidAmount.toString(),
    startDate: contract.startDate || '',
    endDate: contract.endDate || '',
    contractType: contract.contractType || 'NORMAL',
    notes: contract.notes || '',
    weeklyNotes: contract.weeklyNotes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const salaryAmount = parseFloat(formData.salaryAmount);
    const depositAmount = parseFloat(formData.depositAmount);
    
    // 驗證訂金不能超過工資
    if (depositAmount > salaryAmount) {
      alert(`訂金不能超過工資/傭金！\n工資/傭金：$${salaryAmount}\n訂金：$${depositAmount}`);
      return;
    }
    
    onSubmit({
      ...formData,
      salaryAmount: salaryAmount,
      depositAmount: depositAmount,
      unpaidAmount: parseFloat(formData.unpaidAmount),
      clearedAmount: contract.clearedAmount || 0,
      totalPaid: contract.totalPaid || 0
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">編輯合約</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">KOL</label>
            <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
              {KOL_PLATFORMS.find(pl => pl.value === contract.platform)?.icon} {contract.platformId} (@{contract.platformAccount})
            </div>
            <p className="text-xs text-gray-500 mt-1">編輯合約時無法更改 KOL</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工資/傭金 *</label>
              <input
                type="number"
                required
                value={formData.salaryAmount}
                onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">訂金</label>
              <input
                type="number"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">未付金額 *</label>
            <input
              type="number"
              required
              value={formData.unpaidAmount}
              onChange={(e) => setFormData({ ...formData, unpaidAmount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">到期日</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="合約相關備註"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">週薪備註</label>
            <textarea
              value={formData.weeklyNotes}
              onChange={(e) => setFormData({ ...formData, weeklyNotes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="週薪相關說明或備註"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">取消</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg">更新</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 記錄支付 Modal
const AddPaymentModal: React.FC<{ 
  contracts: KOLContract[];
  onClose: () => void; 
  onSubmit: (data: any) => void;
}> = ({ contracts, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    contractId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentType: 'SALARY',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentAmount = parseFloat(formData.amount);
    if (paymentAmount <= 0) {
      alert('支付金額必須大於 0');
      return;
    }
    
    const selectedContract = contracts.find(c => c.id === formData.contractId);
    if (selectedContract && paymentAmount > selectedContract.unpaidAmount) {
      alert(`支付金額不能超過未付金額！\n未付金額：$${selectedContract.unpaidAmount}\n輸入金額：$${paymentAmount}`);
      return;
    }
    
    onSubmit({
      ...formData,
      amount: paymentAmount
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">記錄支付</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">選擇合約 *</label>
            <select
              required
              value={formData.contractId}
              onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">請選擇</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.platformId} - ${c.salaryAmount} (未付: ${c.unpaidAmount})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">支付金額 *</label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">支付日期 *</label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">支付類型</label>
            <select
              value={formData.paymentType}
              onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="SALARY">工資</option>
              <option value="DEPOSIT">訂金</option>
              <option value="BONUS">獎金</option>
              <option value="OTHER">其他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">取消</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg">記錄支付</button>
          </div>
        </form>
      </div>
    </div>
  );
};
