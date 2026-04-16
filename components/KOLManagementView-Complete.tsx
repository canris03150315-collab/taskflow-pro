import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, KOLProfile, KOLContract, KOLPayment, KOLStats } from '../types';
import { api } from '../services/api';
import { showSuccess, showError, showWarning, showConfirm, showToast } from '../utils/dialogService';

interface KOLManagementViewProps {
  currentUser: User;
}

export const KOLManagementView: React.FC<KOLManagementViewProps> = ({ currentUser }) => {
  const [profiles, setProfiles] = useState<KOLProfile[]>([]);
  const [contracts, setContracts] = useState<KOLContract[]>([]);
  const [payments, setPayments] = useState<KOLPayment[]>([]);
  const [stats, setStats] = useState<KOLStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'profiles' | 'contracts' | 'payments'>('profiles');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<KOLProfile | null>(null);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBatchPaymentModal, setShowBatchPaymentModal] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [activeView, statusFilter, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesRes, statsRes] = await Promise.all([
        api.kol.getProfiles({ status: statusFilter !== 'ALL' ? statusFilter : undefined, search: searchQuery || undefined }),
        api.kol.getStats()
      ]);
      setProfiles(profilesRes.profiles);
      setStats(statsRes);

      if (activeView === 'contracts') {
        const contractsRes = await api.kol.getContracts({});
        setContracts(contractsRes.contracts);
      } else if (activeView === 'payments') {
        const paymentsRes = await api.kol.getPayments({});
        setPayments(paymentsRes.payments);
      }
    } catch (error) {
      console.error('Load KOL data error:', error);
      showError('載入資料失敗');
    } finally {
      setLoading(false);
    }
  };

  // 未付款提醒
  const unpaidProfiles = useMemo(() => {
    return profiles.filter(p => (p.totalUnpaid || 0) > 0).sort((a, b) => (b.totalUnpaid || 0) - (a.totalUnpaid || 0));
  }, [profiles]);

  // 即將到期合約
  const expiringContracts = useMemo(() => {
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return contracts.filter(c => {
      if (!c.endDate) return false;
      const endDate = new Date(c.endDate);
      return endDate >= today && endDate <= thirtyDaysLater;
    });
  }, [contracts]);

  const handleQuickPayment = async (profile: KOLProfile) => {
    const amount = prompt(`為 ${profile.facebookId} 記錄支付金額：`);
    if (!amount || isNaN(parseFloat(amount))) return;

    try {
      // 獲取該 KOL 的合約
      const contractsRes = await api.kol.getContracts({ kolId: profile.id });
      if (contractsRes.contracts.length === 0) {
        showWarning('此 KOL 沒有合約，請先新增合約');
        return;
      }

      // 使用第一個合約
      const contract = contractsRes.contracts[0];
      await api.kol.createPayment({
        contractId: contract.id,
        paymentDate: new Date().toISOString().split('T')[0],
        amount: parseFloat(amount),
        paymentType: 'SALARY',
        notes: '快速支付'
      });

      showSuccess('支付記錄成功');
      loadData();
    } catch (error) {
      console.error('Quick payment error:', error);
      showError('支付記錄失敗');
    }
  };

  const handleBatchPayment = async (contractIds: string[], amount: number, date: string) => {
    try {
      const payments = contractIds.map(contractId => ({
        contractId,
        paymentDate: date,
        amount,
        paymentType: 'SALARY',
        notes: '批量支付'
      }));

      await api.kol.batchCreatePayments(payments);
      showSuccess(`批量支付成功，共 ${contractIds.length} 筆`);
      setSelectedContracts([]);
      loadData();
    } catch (error) {
      console.error('Batch payment error:', error);
      showError('批量支付失敗');
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
          facebookId: row['臉書ID'] || row['facebookId'],
          platformAccount: row['平台帳號'] || row['platformAccount'],
          contactInfo: row['聯絡方式'] || row['contactInfo'],
          status: row['狀態'] || row['status'] || 'ACTIVE',
          notes: row['備註'] || row['notes'],
          startDate: row['開始日期'] || row['startDate'],
          endDate: row['到期日'] || row['endDate'],
          salaryAmount: parseFloat(row['工資/傭金'] || row['salaryAmount'] || 0),
          depositAmount: parseFloat(row['訂金'] || row['depositAmount'] || 0),
          unpaidAmount: parseFloat(row['未付金額'] || row['unpaidAmount'] || 0),
          clearedAmount: parseFloat(row['截清金額'] || row['clearedAmount'] || 0),
          totalPaid: parseFloat(row['總付金額'] || row['totalPaid'] || 0),
          contractType: row['類型'] || row['contractType'] || 'NORMAL',
          contractNotes: row['合作備註'] || row['contractNotes']
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
      showError('Excel 匯出失敗');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">載入中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 + 提醒 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">總 KOL 數</div>
          <div className="text-3xl font-bold mt-2">{stats?.totalKOLs || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">活躍 KOL</div>
          <div className="text-3xl font-bold mt-2">{stats?.activeKOLs || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow" onClick={() => setActiveView('profiles')}>
          <div className="text-sm opacity-90">未付款項 ⚠️</div>
          <div className="text-3xl font-bold mt-2">${stats?.totalUnpaid?.toFixed(0) || 0}</div>
          <div className="text-xs mt-2 opacity-75">{unpaidProfiles.length} 個 KOL 待付款</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">本月支出</div>
          <div className="text-3xl font-bold mt-2">${stats?.monthlyPayments?.toFixed(0) || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow" onClick={() => setActiveView('contracts')}>
          <div className="text-sm opacity-90">即將到期 🔔</div>
          <div className="text-3xl font-bold mt-2">{expiringContracts.length}</div>
          <div className="text-xs mt-2 opacity-75">30天內到期合約</div>
        </div>
      </div>

      {/* 主導航 */}
      <div className="bg-white rounded-xl shadow-sm p-2 flex gap-2">
        <button
          onClick={() => setActiveView('profiles')}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
            activeView === 'profiles' 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          KOL 列表
        </button>
        <button
          onClick={() => setActiveView('contracts')}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
            activeView === 'contracts' 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          合約管理
        </button>
        <button
          onClick={() => setActiveView('payments')}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
            activeView === 'payments' 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          支付記錄
        </button>
      </div>

      {/* 工具列 */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />

              <button
                onClick={() => setShowAddProfileModal(true)}
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
            <>
              <button
                onClick={() => setShowAddContractModal(true)}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 shadow-md whitespace-nowrap"
              >
                + 新增合約
              </button>
              {selectedContracts.length > 0 && (
                <button
                  onClick={() => setShowBatchPaymentModal(true)}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-md whitespace-nowrap"
                >
                  💰 批量支付 ({selectedContracts.length})
                </button>
              )}
            </>
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

      {/* 內容區域 - 根據 activeView 顯示不同內容 */}
      {activeView === 'profiles' && (
        <ProfilesView 
          profiles={profiles}
          onQuickPayment={handleQuickPayment}
          onViewDetail={(profile) => {
            setSelectedProfile(profile);
            setShowDetailModal(true);
          }}
          onDelete={async (id) => {
            if (await showConfirm('確定要刪除此 KOL 嗎？此操作無法復原。')) {
              try {
                await api.kol.deleteProfile(id);
                showSuccess('刪除成功');
                loadData();
              } catch (error) {
                showError('刪除失敗');
              }
            }
          }}
        />
      )}

      {activeView === 'contracts' && (
        <ContractsView 
          contracts={contracts}
          selectedContracts={selectedContracts}
          onSelectContract={(id) => {
            setSelectedContracts(prev => 
              prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
            );
          }}
          onEdit={(contract) => {
            // TODO: 實作編輯合約
            showToast('編輯合約功能開發中');
          }}
        />
      )}

      {activeView === 'payments' && (
        <PaymentsView payments={payments} />
      )}

      {/* Modals - 將在下一步實作 */}
    </div>
  );
};

// ProfilesView 子組件
const ProfilesView: React.FC<{
  profiles: KOLProfile[];
  onQuickPayment: (profile: KOLProfile) => void;
  onViewDetail: (profile: KOLProfile) => void;
  onDelete: (id: string) => void;
}> = ({ profiles, onQuickPayment, onViewDetail, onDelete }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'STOPPED': return 'bg-red-100 text-red-800';
      case 'NEGOTIATING': return 'bg-yellow-100 text-yellow-800';
      case 'LOST_CONTACT': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '正常合作';
      case 'STOPPED': return '停止合作';
      case 'NEGOTIATING': return '協議中';
      case 'LOST_CONTACT': return '失聯';
      default: return status;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900">{profile.facebookId}</h3>
              <p className="text-sm text-gray-600">@{profile.platformAccount}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(profile.status)}`}>
                {getStatusText(profile.status)}
              </span>
              <button
                onClick={() => onDelete(profile.id)}
                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                title="刪除"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-2 text-sm mb-4" onClick={() => onViewDetail(profile)} style={{cursor: 'pointer'}}>
            <div className="flex justify-between">
              <span className="text-gray-600">合作記錄</span>
              <span className="font-medium">{profile.contractCount || 0} 筆</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">活躍合作</span>
              <span className="font-medium">{profile.activeContracts || 0} 個</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">未付金額</span>
              <span className={`font-medium ${(profile.totalUnpaid || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                ${profile.totalUnpaid?.toFixed(0) || 0}
              </span>
            </div>
          </div>

          {(profile.totalUnpaid || 0) > 0 && (
            <button
              onClick={() => onQuickPayment(profile)}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              💰 快速支付
            </button>
          )}
        </div>
      ))}

      {profiles.length === 0 && (
        <div className="col-span-full text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🔍</div>
          <p>沒有找到符合條件的 KOL</p>
        </div>
      )}
    </div>
  );
};

// ContractsView 子組件
const ContractsView: React.FC<{
  contracts: KOLContract[];
  selectedContracts: string[];
  onSelectContract: (id: string) => void;
  onEdit: (contract: KOLContract) => void;
}> = ({ contracts, selectedContracts, onSelectContract, onEdit }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left">
              <input type="checkbox" className="rounded" />
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">KOL</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">工資/傭金</th>
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
                <input 
                  type="checkbox" 
                  className="rounded"
                  checked={selectedContracts.includes(contract.id)}
                  onChange={() => onSelectContract(contract.id)}
                />
              </td>
              <td className="px-4 py-3">
                <div className="font-medium">{contract.facebookId}</div>
                <div className="text-sm text-gray-500">@{contract.platformAccount}</div>
              </td>
              <td className="px-4 py-3 font-medium text-green-600">${contract.salaryAmount}</td>
              <td className="px-4 py-3 font-medium text-orange-600">${contract.unpaidAmount}</td>
              <td className="px-4 py-3">${contract.totalPaid}</td>
              <td className="px-4 py-3 text-sm">{contract.endDate || '-'}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onEdit(contract)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  編輯
                </button>
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
  );
};

// PaymentsView 子組件
const PaymentsView: React.FC<{
  payments: KOLPayment[];
}> = ({ payments }) => {
  return (
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
                <div className="font-medium">{payment.facebookId}</div>
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
  );
};
