
import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface AttendanceWidgetProps {
  currentUser: User;
}

export const AttendanceWidget: React.FC<AttendanceWidgetProps> = ({ currentUser }) => {
  const toast = useToast();
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Clock Timer
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [currentUser]);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
        const data = await api.attendance.getTodayStatus(currentUser.id);
        setRecord(data);
    } catch (error) {
        console.error("Failed to load attendance status", error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleClockIn = async () => {
      if(isSubmitting) return;
      setIsSubmitting(true);
      try {
          const data = await api.attendance.clockIn(currentUser.id);
          setRecord(data);
      } catch(e) {
          console.error(e);
          toast.error('打卡失敗，請稍後再試');
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleClockOut = async () => {
      if (!record || isSubmitting) return;
      // Removed confirm dialog for smoother UX and to avoid blocking issues
      setIsSubmitting(true);
      try {
          const data = await api.attendance.clockOut(record.id);
          setRecord(data);
      } catch(e) {
          console.error("Clock out failed", e);
          toast.error('簽退失敗，系統將重新整理狀態');
          await loadStatus();
      } finally {
          setIsSubmitting(false);
      }
  };

  const formatTime = (date: Date) => {
      return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getDuration = () => {
      if (!record) return '00:00';
      const start = new Date(record.clockIn);
      const end = record.clockOut ? new Date(record.clockOut) : currentTime;
      // Ensure positive calculation even if system clocks drift slightly
      const diffMs = Math.max(0, end.getTime() - start.getTime());
      const hours = Math.floor(diffMs / 1000 / 60 / 60);
      const mins = Math.floor((diffMs / 1000 / 60) % 60);
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  if (isLoading) return <div className="h-32 bg-slate-100 rounded-2xl animate-pulse"></div>;

  const isOnline = record && !record.clockOut;
  const isOffline = record && record.clockOut;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-between relative overflow-hidden">
        {/* Background Status Indicator */}
        <div className={`absolute top-0 left-0 w-full h-1.5 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>

        <div className="text-center w-full mb-4">
            <h3 className="text-slate-400 font-bold text-xs uppercase mb-1">現在時間</h3>
            <div className="text-3xl font-black font-mono text-slate-800 tracking-tight">
                {formatTime(currentTime)}
            </div>
            {isOnline && (
                <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded animate-pulse">
                    🟢 工作中 (本次已上 {getDuration()})
                </div>
            )}
            {isOffline && (
                <div className="mt-2 text-xs font-bold text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded">
                    💤 非辦公時間 (最近一班工時 {record.durationMinutes}m)
                </div>
            )}
        </div>

        {isOnline ? (
            <button 
                onClick={handleClockOut}
                disabled={isSubmitting}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-lg transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? '處理中...' : <span>🌙 下班簽退</span>}
            </button>
        ) : (
            <button 
                onClick={handleClockIn}
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? '處理中...' : <span>{record ? '☀️ 再次上班' : '☀️ 上班打卡'}</span>}
            </button>
        )}
        
        {record && (
            <div className="mt-4 text-xs text-slate-400 font-mono w-full flex justify-between border-t border-slate-100 pt-2">
                <span>IN: {new Date(record.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                {record.clockOut && <span>OUT: {new Date(record.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>}
            </div>
        )}
    </div>
  );
};
