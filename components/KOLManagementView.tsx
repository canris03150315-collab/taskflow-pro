import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, KOLProfile, KOLContract, KOLPayment, KOLStats } from '../types';
import { api } from '../services/api';

interface KOLManagementViewProps {
  currentUser: User;
}

export const KOLManagementView: React.FC<KOLManagementViewProps> = ({ currentUser }) => {
  const [profiles, setProfiles] = useState<KOLProfile[]>([]);
  const [stats, setStats] = useState<KOLStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<KOLProfile | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesRes, statsRes] = await Promise.all([
        api.kol.getProfiles({ status: statusFilter !== 'ALL' ? statusFilter : undefined, search: searchQuery || undefined }),
        api.kol.getStats()
      ]);
      setProfiles(profilesRes.profiles);
      setStats(statsRes);
    } catch (error) {
      console.error('Load KOL data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (searchQuery && !p.facebookId.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !p.platformAccount.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [profiles, statusFilter, searchQuery]);

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

  const handleAddProfile = async (data: any) => {
    try {
      await api.kol.createProfile(data);
      setShowAddModal(false);
      loadData();
    } catch (error) {
      console.error('Add profile error:', error);
      alert('新增失敗');
    }
  };

  const handleViewDetail = async (profile: KOLProfile) => {
    setSelectedProfile(profile);
    setShowDetailModal(true);
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
          <div className="text-sm opacity-90">未付款項</div>
          <div className="text-3xl font-bold mt-2">${stats?.totalUnpaid?.toFixed(0) || 0}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-sm opacity-90">本月支出</div>
          <div className="text-3xl font-bold mt-2">${stats?.monthlyPayments?.toFixed(0) || 0}</div>
        </div>
      </div>

      {/* 篩選和搜尋 */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="ALL">全部狀態</option>
            <option value="ACTIVE">正常合作</option>
            <option value="STOPPED">停止合作</option>
            <option value="NEGOTIATING">協議中</option>
            <option value="LOST_CONTACT">失聯</option>
          </select>

          <input
            type="text"
            placeholder="搜尋 KOL 名稱或帳號..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />

          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md whitespace-nowrap"
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
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md whitespace-nowrap"
          >
            📥 導入 Excel
          </button>

          <button
            onClick={handleExcelExport}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md whitespace-nowrap"
          >
            📤 匯出 Excel
          </button>
        </div>
      </div>

      {/* KOL 列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfiles.map((profile) => (
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
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`確定要刪除 ${profile.facebookId} 嗎？此操作無法復原。`)) {
                      handleDeleteProfile(profile.id);
                    }
                  }}
                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="刪除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm" onClick={() => handleViewDetail(profile)} style={{cursor: 'pointer'}}>
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
                <span className="font-medium text-orange-600">${profile.totalUnpaid?.toFixed(0) || 0}</span>
              </div>
            </div>

            {profile.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 line-clamp-2">{profile.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredProfiles.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🔍</div>
          <p>沒有找到符合條件的 KOL</p>
        </div>
      )}

      {/* 新增 KOL Modal */}
      {showAddModal && (
        <AddKOLModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddProfile}
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
          onUpdate={loadData}
        />
      )}
    </div>
  );
};

// 新增 KOL Modal 組件
const AddKOLModal: React.FC<{ onClose: () => void; onSubmit: (data: any) => void }> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    facebookId: '',
    platformAccount: '',
    contactInfo: '',
    status: 'ACTIVE',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">新增 KOL</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">臉書 ID *</label>
            <input
              type="text"
              required
              value={formData.facebookId}
              onChange={(e) => setFormData({ ...formData, facebookId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">平台帳號 *</label>
            <input
              type="text"
              required
              value={formData.platformAccount}
              onChange={(e) => setFormData({ ...formData, platformAccount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">聯絡方式</label>
            <input
              type="text"
              value={formData.contactInfo}
              onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="ACTIVE">正常合作</option>
              <option value="NEGOTIATING">協議中</option>
              <option value="STOPPED">停止合作</option>
              <option value="LOST_CONTACT">失聯</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              新增
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// KOL 詳情 Modal 組件（簡化版）
const KOLDetailModal: React.FC<{ profile: KOLProfile; onClose: () => void; onUpdate: () => void }> = ({ profile, onClose, onUpdate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">{profile.facebookId}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-600">平台帳號：</span>
              <span className="font-medium">{profile.platformAccount}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">狀態：</span>
              <span className="font-medium">{profile.status}</span>
            </div>
            {profile.notes && (
              <div>
                <span className="text-sm text-gray-600">備註：</span>
                <p className="mt-1">{profile.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
