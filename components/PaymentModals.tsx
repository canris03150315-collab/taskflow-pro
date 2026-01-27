import React, { useState } from 'react';
import { KOLProfile, KOLWeeklyPayment, User, Role } from '../types';

// 新增支付記錄 Modal
export const AddPaymentModal: React.FC<{ 
  profile: KOLProfile; 
  onClose: () => void; 
  onSubmit: (data: { amount: number; paymentDate: string; notes?: string }) => void 
}> = ({ profile, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('請輸入有效的支付金額');
      return;
    }
    onSubmit({
      amount: parseFloat(formData.amount),
      paymentDate: formData.paymentDate,
      notes: formData.notes || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">記錄支付 - {profile.platformAccount}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">支付金額 *</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="請輸入金額"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">支付日期 *</label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
              placeholder="例如：每週薪資、獎金等"
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
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              確認支付
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 編輯支付記錄 Modal
export const EditPaymentModal: React.FC<{
  payment: KOLWeeklyPayment;
  onClose: () => void;
  onSubmit: (data: { amount: number; paymentDate: string; notes?: string }) => void;
}> = ({ payment, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    amount: payment.amount.toString(),
    paymentDate: payment.paymentDate,
    notes: payment.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('請輸入有效的支付金額');
      return;
    }
    onSubmit({
      amount: parseFloat(formData.amount),
      paymentDate: formData.paymentDate,
      notes: formData.notes || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">編輯支付記錄</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">支付金額 *</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">支付日期 *</label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
            />
          </div>
          <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
            <div>建立時間: {payment.createdAt}</div>
            {payment.updatedAt && <div>最後修改: {payment.updatedAt}</div>}
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
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              儲存修改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 支付記錄查看 Modal
export const PaymentHistoryModal: React.FC<{
  profile: KOLProfile;
  payments: KOLWeeklyPayment[];
  total: number;
  currentUser: User;
  onClose: () => void;
  onEdit: (paymentId: string, data: { amount: number; paymentDate: string; notes?: string }) => void;
  onDelete: (paymentId: string) => void;
  onRefresh: (startDate?: string, endDate?: string) => void;
}> = ({ profile, payments, total, currentUser, onClose, onEdit, onDelete, onRefresh }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingPayment, setEditingPayment] = useState<KOLWeeklyPayment | null>(null);

  const handleSearch = () => {
    onRefresh(startDate || undefined, endDate || undefined);
  };

  const canEdit = (payment: KOLWeeklyPayment) => {
    return currentUser.role === Role.BOSS || 
           currentUser.role === Role.MANAGER || 
           payment.createdBy === currentUser.id;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{profile.platformAccount} 的支付記錄</h2>
        
        {/* 日期區間搜尋 */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">開始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">結束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              搜尋
            </button>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                onRefresh();
              }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              清除
            </button>
          </div>
          <div className="mt-3 text-lg font-semibold text-blue-600">
            區間總計: ${total.toLocaleString()}
          </div>
        </div>

        {/* 支付記錄列表 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">日期</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">金額</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">備註</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">{payment.paymentDate}</td>
                  <td className="px-4 py-2 text-sm font-semibold">${payment.amount.toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{payment.notes || '-'}</td>
                  <td className="px-4 py-2">
                    {canEdit(payment) && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingPayment(payment)}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          ✏️ 編輯
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('確定要刪除此支付記錄嗎？')) {
                              onDelete(payment.id);
                            }
                          }}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          🗑️ 刪除
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {payments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>尚無支付記錄</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            關閉
          </button>
        </div>

        {/* 編輯支付記錄 Modal */}
        {editingPayment && (
          <EditPaymentModal
            payment={editingPayment}
            onClose={() => setEditingPayment(null)}
            onSubmit={(data) => {
              onEdit(editingPayment.id, data);
              setEditingPayment(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
