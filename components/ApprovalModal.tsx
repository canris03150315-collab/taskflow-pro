// ApprovalModal.tsx
// Modal for initiating and completing report approval
import React, { useState, useEffect } from 'react';
import { User, EligibleApprover } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface ApprovalModalProps {
  currentUser: User;
  mode: 'request' | 'approve';
  pendingAuthId?: string;
  pendingAuthData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  currentUser,
  mode,
  pendingAuthId,
  pendingAuthData,
  onClose,
  onSuccess
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [approvers, setApprovers] = useState<EligibleApprover[]>([]);
  const [selectedApproverId, setSelectedApproverId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (mode === 'request') {
      loadEligibleApprovers();
    }
  }, [mode]);

  const loadEligibleApprovers = async () => {
    try {
      console.log('[ApprovalModal] Loading eligible approvers...');
      const response = await api.reports.approval.getEligibleApprovers();
      console.log('[ApprovalModal] API Response:', response);
      console.log('[ApprovalModal] Approvers:', response.approvers);
      console.log('[ApprovalModal] Approvers length:', response.approvers?.length || 0);
      setApprovers(response.approvers || []);
    } catch (error) {
      console.error('[ApprovalModal] Failed to load approvers:', error);
      toast.error('載入審核者列表失敗');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reason.length < 10) {
      toast.error('審核原因至少需要 10 個字');
      return;
    }

    if (mode === 'request' && !selectedApproverId) {
      toast.error('請選擇審核者');
      return;
    }

    // Check if user selected themselves as approver
    if (mode === 'request' && selectedApproverId === currentUser.id) {
      toast.error('不能選擇自己作為審核者');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'request') {
        await api.reports.approval.request(selectedApproverId, reason);
        toast.success('申請已發送，等待審核者批准');
      } else {
        const response = await api.reports.approval.approve(pendingAuthId!, reason);
        toast.success(`審核完成，${response.requesterName} 已獲得查看權限 30 分鐘`);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Approval failed:', error);
      toast.error(error.message || '操作失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'request' ? '🔐 申請查看報表' : '✅ 批准查看申請'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Rules Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">📋 審核規則說明</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 需要一位不同部門的主管審核</li>
              <li>• 審核者不能是您自己</li>
              <li>• 審核通過後您可查看所有報表 30 分鐘</li>
              <li>• 關閉網頁後授權自動失效</li>
            </ul>
          </div>

          {/* Pending Auth Info (for approve mode) */}
          {mode === 'approve' && pendingAuthData && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">📋 申請資訊</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      申請者：{pendingAuthData.requesterName} ({pendingAuthData.requesterDept})
                    </div>
                    <div className="text-xs text-gray-600">
                      申請時間：{new Date(pendingAuthData.createdAt).toLocaleString('zh-TW')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Select Approver (for request mode) */}
          {mode === 'request' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 選擇審核者 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedApproverId}
                onChange={(e) => setSelectedApproverId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">請選擇審核主管</option>
                {approvers.map((approver) => (
                  <option key={approver.id} value={approver.id}>
                    👔 {approver.name} ({approver.department}) - {approver.role}
                  </option>
                ))}
              </select>
              {approvers.length === 0 && (
                <p className="text-sm text-gray-600 mt-2">載入審核者列表中...</p>
              )}
            </div>
          )}

          {/* Your Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">📍 您的資訊</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <div>• 姓名：{currentUser.name}</div>
              <div>• 部門：{currentUser.department}</div>
              <div>• 角色：{currentUser.role}</div>
              <div>• 時間：{new Date().toLocaleString('zh-TW')}</div>
            </div>
          </div>

          {/* Reason Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 {mode === 'request' ? '申請原因' : '審核意見'} <span className="text-red-500">*</span>
              <span className="text-gray-500 font-normal ml-2">(至少 10 字)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={mode === 'request' 
                ? '例如：需要查看本月營運報表，進行季度績效評估和部門預算調整...'
                : '例如：確認需求合理，同意授權查看報表進行績效評估和預算調整...'
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              required
              minLength={10}
            />
            <div className="flex justify-between items-center mt-2">
              <span className={`text-sm ${reason.length >= 10 ? 'text-green-600' : 'text-gray-500'}`}>
                字數：{reason.length} / 10
              </span>
              {reason.length >= 10 && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  符合要求
                </span>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 text-sm text-yellow-800">
                <div className="font-medium mb-1">⚠️ 重要提示</div>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {mode === 'request' ? (
                    <>
                      <li>審核通過後，您可查看所有報表 30 分鐘</li>
                      <li>您的申請操作將被完整記錄</li>
                      <li>請確認申請原因合理後再提交</li>
                    </>
                  ) : (
                    <>
                      <li>審核通過後，{pendingAuthData?.requesterName} 可查看所有報表 30 分鐘</li>
                      <li>您的審核操作將被完整記錄</li>
                      <li>請確認申請合理後再批准</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading || reason.length < 10 || (mode === 'request' && !selectedApproverId)}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  處理中...
                </>
              ) : (
                <>
                  {mode === 'request' ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      📤 提交申請
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ✅ 批准申請
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
