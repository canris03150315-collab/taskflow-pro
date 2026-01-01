import React, { useState } from 'react';
import { api } from '../services/api';
import { useToast } from './Toast';

interface ChangePasswordModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  userId,
  userName,
  onClose,
  onSuccess
}) => {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 驗證
    if (!currentPassword) {
      setError('請輸入目前密碼');
      return;
    }

    if (!newPassword) {
      setError('請輸入新密碼');
      return;
    }

    if (newPassword.length < 4) {
      setError('新密碼至少需要 4 個字元');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('新密碼與確認密碼不一致');
      return;
    }

    if (currentPassword === newPassword) {
      setError('新密碼不能與目前密碼相同');
      return;
    }

    setLoading(true);
    try {
      const result = await api.auth.changePassword(userId, currentPassword, newPassword);
      if (result.success) {
        toast.success('密碼修改成功！');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || '密碼修改失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* 標題 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">🔐</span>
            <h2 className="text-lg font-semibold">修改密碼</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            正在為 <span className="font-medium text-gray-900">{userName}</span> 修改密碼
          </p>

          {/* 目前密碼 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              目前密碼
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="輸入目前密碼"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* 新密碼 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新密碼
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="輸入新密碼（至少 4 字元）"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* 確認新密碼 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              確認新密碼
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="再次輸入新密碼"
            />
            {confirmPassword && newPassword === confirmPassword && (
              <div className="flex items-center gap-1 mt-1 text-green-600 text-sm">
                <span>✓</span>
                <span>密碼一致</span>
              </div>
            )}
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 按鈕 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '處理中...' : '確認修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
