import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface ManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onSuccess: () => void;
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onSuccess
}) => {
  const toast = useToast();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [date, setDate] = useState('');
  const [clockIn, setClockIn] = useState('09:00');
  const [clockOut, setClockOut] = useState('18:00');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRecord, setExistingRecord] = useState<any>(null);
  const [isCheckingRecord, setIsCheckingRecord] = useState(false);

  // Filter users based on current user's role
  const availableUsers = users.filter(user => {
    if (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') {
      return user.role !== 'BOSS';
    }
    if (currentUser.role === 'SUPERVISOR') {
      // SUPERVISOR 可以為同部門的所有員工補登（包括其他 SUPERVISOR 和 EMPLOYEE）
      return user.department === currentUser.department && user.id !== currentUser.id;
    }
    return false;
  });

  // Debug logging
  useEffect(() => {
    console.log('[ManualAttendanceModal] Total users:', users.length);
    console.log('[ManualAttendanceModal] Current user role:', currentUser.role);
    console.log('[ManualAttendanceModal] Current user department:', currentUser.department);
    console.log('[ManualAttendanceModal] All users departments:', users.map(u => ({ id: u.id, name: u.name, role: u.role, dept: u.department })));
    console.log('[ManualAttendanceModal] Available users:', availableUsers.length);
    console.log('[ManualAttendanceModal] Available users list:', availableUsers.map(u => ({ id: u.id, name: u.name, role: u.role, dept: u.department })));
  }, [users, currentUser, availableUsers]);

  // Check for existing attendance record when user and date are selected
  useEffect(() => {
    const checkExistingRecord = async () => {
      if (!selectedUserId || !date) {
        setExistingRecord(null);
        return;
      }

      setIsCheckingRecord(true);
      try {
        const records = await api.attendance.getHistory();
        const record = records.find(r => r.userId === selectedUserId && r.date === date);
        
        if (record && !record.clockOut) {
          // Found existing record without clock-out
          setExistingRecord(record);
          const existingClockIn = new Date(record.clockIn);
          setClockIn(existingClockIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
          toast.info('檢測到已有上班打卡記錄，將只補登下班時間');
        } else {
          setExistingRecord(null);
        }
      } catch (error) {
        console.error('Failed to check existing record:', error);
      } finally {
        setIsCheckingRecord(false);
      }
    };

    checkExistingRecord();
  }, [selectedUserId, date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId || !date || !clockIn || !clockOut || !reason) {
      toast.error('請填寫所有必要欄位');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.attendance.manualEntry(selectedUserId, date, clockIn, clockOut, reason);
      toast.success('補登打卡成功');
      onSuccess();
      onClose();
      // Reset form
      setSelectedUserId('');
      setDate('');
      setClockIn('09:00');
      setClockOut('18:00');
      setReason('');
    } catch (error: any) {
      console.error('Manual attendance error:', error);
      toast.error(error.message || '補登打卡失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">補登打卡記錄</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* User Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              選擇員工 <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="">請選擇員工</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.username})
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Clock In Time */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              上班時間 <span className="text-red-500">*</span>
              {existingRecord && <span className="ml-2 text-xs text-blue-600">(已有記錄)</span>}
            </label>
            <input
              type="time"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              disabled={!!existingRecord}
              className={`w-full px-4 py-2 border rounded-lg outline-none ${
                existingRecord 
                  ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' 
                  : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              }`}
              required
            />
            {existingRecord && (
              <p className="mt-1 text-xs text-slate-500">
                已檢測到該員工當日的上班打卡記錄，將保留原始上班時間
              </p>
            )}
          </div>

          {/* Clock Out Time */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              下班時間 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              補登原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例如：忘記打卡、系統故障等"
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              required
            />
          </div>

          {/* Info/Warning */}
          {existingRecord ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-700">
                  <p className="font-bold mb-1">補登下班卡模式</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>已檢測到該員工當日的上班打卡記錄</li>
                    <li>將保留原始上班時間，只補登下班時間</li>
                    <li>補登記錄會標註「由主管補登」</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-orange-700">
                  <p className="font-bold mb-1">注意事項</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>補登記錄會標註「由主管補登」</li>
                    <li>請確保時間正確無誤</li>
                    <li>補登原因將被記錄備查</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? '補登中...' : '確認補登'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
