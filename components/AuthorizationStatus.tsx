// AuthorizationStatus.tsx
// Display authorization status and countdown timer
import React, { useState, useEffect } from 'react';
import { ReportAuthorization } from '../types';
import { getRemainingTime, formatTime } from '../utils/authSession';

interface AuthorizationStatusProps {
  authorization: ReportAuthorization;
  onExpired: () => void;
  onExtend: () => void;
  onRevoke: () => void;
}

export const AuthorizationStatus: React.FC<AuthorizationStatusProps> = ({
  authorization,
  onExpired,
  onExtend,
  onRevoke
}) => {
  // Calculate remaining time based on authorization.expiresAt
  const calculateRemainingTime = () => {
    if (!authorization?.expiresAt) return 0;
    const expiresAt = new Date(authorization.expiresAt);
    const now = new Date();
    const remaining = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
    return Math.max(0, remaining);
  };

  const [remainingTime, setRemainingTime] = useState(calculateRemainingTime());
  const [showWarning, setShowWarning] = useState(false);

  // Reset timer when authorization changes
  useEffect(() => {
    setRemainingTime(calculateRemainingTime());
    setShowWarning(false);
  }, [authorization?.expiresAt]);

  useEffect(() => {
    const timer = setInterval(() => {
      const time = calculateRemainingTime();
      setRemainingTime(time);

      // Show warning when 5 minutes left
      if (time <= 300 && time > 0 && !showWarning) {
        setShowWarning(true);
      }

      // Expired
      if (time <= 0) {
        clearInterval(timer);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onExpired, showWarning, authorization?.expiresAt]);

  const minutes = Math.floor(remainingTime / 60);
  const isWarning = minutes <= 5;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">🔓 授權已核准</h3>
            <p className="text-sm text-gray-600">審核已完成</p>
          </div>
        </div>
        
        <div className={`text-right ${isWarning ? 'animate-pulse' : ''}`}>
          <div className={`text-2xl font-bold ${isWarning ? 'text-red-600' : 'text-green-600'}`}>
            ⏰ {formatTime(remainingTime)}
          </div>
          <div className="text-sm text-gray-600">剩餘時間</div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">第一審核：{authorization.firstApproverName}</div>
            <div className="text-xs text-gray-600">
              {authorization.firstApproverDept} · {new Date(authorization.firstApprovedAt).toLocaleString('zh-TW')}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">第二審核：{authorization.secondApproverName}</div>
            <div className="text-xs text-gray-600">
              {authorization.secondApproverDept} · {new Date(authorization.secondApprovedAt).toLocaleString('zh-TW')}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1 text-sm text-yellow-800">
            <div className="font-medium mb-1">⚠️ 注意事項</div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>授權將在 30 分鐘後自動失效</li>
              <li>關閉網頁後需重新審核</li>
              <li>所有操作都會被記錄</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onExtend}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          延長授權
        </button>
        <button
          onClick={onRevoke}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          撤銷授權
        </button>
      </div>

      {/* Warning Modal */}
      {showWarning && isWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">⚠️ 授權即將過期</h3>
            </div>
            
            <p className="text-gray-700 mb-4">
              您的報表查看授權將在 {minutes} 分鐘後過期
            </p>
            
            <p className="text-sm text-gray-600 mb-6">
              如需繼續查看報表，請選擇延長授權（需要重新雙重審核）
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                知道了
              </button>
              <button
                onClick={() => {
                  setShowWarning(false);
                  onExtend();
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                延長授權
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
