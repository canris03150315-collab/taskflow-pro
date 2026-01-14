import React, { useState, useEffect, useMemo } from 'react';
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
        </div>
      </div>

      {/* KOL 列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfiles.map((profile) => (
          <div
            key={profile.id}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer"
            onClick={() => handleViewDetail(profile)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900">{profile.facebookId}</h3>
                <p className="text-sm text-gray-600">@{profile.platformAccount}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(profile.status)}`}>
                {getStatusText(profile.status)}
              </span>
            </div>

            <div className="space-y-2 text-sm">
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
