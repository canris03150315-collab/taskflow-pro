import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface AttendanceWidgetProps {
  currentUser: User;
}

type GeoErrorReason = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

class GeoError extends Error {
  reason: GeoErrorReason;
  constructor(reason: GeoErrorReason, msg: string) {
    super(msg);
    this.reason = reason;
  }
}

// Capture current GPS — REQUIRED. Throws GeoError if denied/timeout/unavailable.
const captureLocation = (): Promise<{ lat: number; lng: number }> =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new GeoError('unsupported', '此裝置不支援定位功能'));
      return;
    }
    let settled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        if (settled) return;
        settled = true;
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new GeoError(
              'denied',
              '請允許瀏覽器使用位置權限後再打卡（網址列旁的鎖頭 → 位置 → 允許）'
            )
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(
            new GeoError(
              'unavailable',
              '無法取得目前位置，請確認 GPS 已開啟、或移動到收訊較好的地方'
            )
          );
        } else if (err.code === err.TIMEOUT) {
          reject(new GeoError('timeout', '取得位置逾時，請至窗邊或戶外再試一次'));
        } else {
          reject(new GeoError('unavailable', '位置取得失敗'));
        }
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    );
    // Hard timeout safety net
    setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new GeoError('timeout', '取得位置逾時，請至窗邊或戶外再試一次'));
    }, 11000);
  });

// Build platform-specific instructions for re-enabling geolocation
function getPermissionInstructions(): { platform: string; steps: string[] } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /android/i.test(ua);
  const isMac = /Macintosh/.test(ua) && !isIOS;
  if (isIOS) {
    return {
      platform: 'iPhone / iPad',
      steps: [
        '打開「設定」App',
        '滾到下方找到「Safari」',
        '點「位置」→ 選「允許」',
        '回到此頁、按下方「我已開啟，重試」',
      ],
    };
  }
  if (isAndroid) {
    return {
      platform: 'Android',
      steps: [
        '點瀏覽器右上角 ⋮ → 設定',
        '網站設定 → 位置',
        '找到此網站、改為「允許」',
        '回到此頁、按下方「我已開啟，重試」',
      ],
    };
  }
  if (isMac) {
    return {
      platform: 'Mac',
      steps: [
        '點網址列左邊的 🔒 圖示',
        '「網站設定」→ 位置 → 改為「允許」',
        '若仍不行：系統設定 → 隱私與安全性 → 定位服務 → 開啟瀏覽器',
        '重新整理此頁',
      ],
    };
  }
  return {
    platform: '電腦瀏覽器',
    steps: [
      '點網址列左邊的 🔒 圖示',
      '找到「位置」→ 改為「允許」',
      '重新整理此頁、或按下方「我已開啟，重試」',
    ],
  };
}

export const AttendanceWidget: React.FC<AttendanceWidgetProps> = ({ currentUser }) => {
  const toast = useToast();
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Clock Timer
    // Optimization: Pause timer when hidden
    const updateTime = () => {
      if (!document.hidden) {
        setCurrentTime(new Date());
      }
    };
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [currentUser]);

  // Detect geolocation permission state up-front so we can guide users
  // whose browser has blocked us (JS cannot re-prompt after explicit block).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;
    let cancelled = false;
    let status: PermissionStatus | null = null;
    const handler = () => {
      if (!cancelled && status) setPermissionDenied(status.state === 'denied');
    };
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((s) => {
        if (cancelled) return;
        status = s;
        setPermissionDenied(s.state === 'denied');
        s.addEventListener?.('change', handler);
      })
      .catch(() => {
        /* silent — older browsers may not support */
      });
    return () => {
      cancelled = true;
      if (status) status.removeEventListener?.('change', handler);
    };
  }, []);

  const handleRetryPermission = async () => {
    // User claims they re-enabled. Re-query Permissions API.
    if (navigator.permissions) {
      try {
        const s = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (s.state !== 'denied') {
          setPermissionDenied(false);
          toast.success('位置權限已恢復，可以打卡了');
          return;
        }
      } catch {
        /* ignore */
      }
    }
    toast.error('仍未取得位置權限，請依步驟重試');
  };

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const data = await api.attendance.getTodayStatus(currentUser.id);
      setRecord(data);
    } catch (error) {
      console.error('Failed to load attendance status', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const loc = await captureLocation();
      const data = await api.attendance.clockIn(currentUser.id, loc);
      setRecord(data);
    } catch (e: any) {
      console.error(e);
      if (e instanceof GeoError) {
        toast.error(e.message);
      } else {
        toast.error('打卡失敗，請稍後再試');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!record || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const loc = await captureLocation();
      const data = await api.attendance.clockOut(record.id, loc);
      setRecord(data);
    } catch (e: any) {
      console.error('Clock out failed', e);
      if (e instanceof GeoError) {
        toast.error(e.message);
      } else {
        toast.error('簽退失敗，系統將重新整理狀態');
        await loadStatus();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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
      <div
        className={`absolute top-0 left-0 w-full h-1.5 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
      ></div>

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

      {permissionDenied ? (
        (() => {
          const guide = getPermissionInstructions();
          return (
            <div className="w-full bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-left">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📍</span>
                <div>
                  <div className="font-black text-amber-800 text-sm">需要開啟位置權限</div>
                  <div className="text-xs text-amber-600">瀏覽器已封鎖此網站的位置存取</div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 mb-3 border border-amber-200">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">
                  {guide.platform} 設定步驟
                </div>
                <ol className="space-y-1.5 text-sm text-slate-700">
                  {guide.steps.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-black text-amber-600 flex-shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <button
                onClick={handleRetryPermission}
                className="w-full min-h-[44px] py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg font-bold text-sm transition"
              >
                我已開啟，重試
              </button>
            </div>
          );
        })()
      ) : isOnline ? (
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
          <span>
            IN:{' '}
            {new Date(record.clockIn).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {record.clockOut && (
            <span>
              OUT:{' '}
              {new Date(record.clockOut).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
