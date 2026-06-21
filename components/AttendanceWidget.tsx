import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface AttendanceWidgetProps {
  currentUser: User;
}

// Capture current GPS — best-effort. Never throws; resolves null if blocked / timeout / unsupported.
// (Log-only mode: clock-in always succeeds even without GPS.)
const captureLocation = (): Promise<{ lat: number; lng: number } | null> =>
  new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (val: { lat: number; lng: number } | null) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => finish({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => finish(null),
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true }
    );
    setTimeout(() => finish(null), 8500);
  });

// Build platform-specific instructions for re-enabling geolocation.
// Verified against official browser vendor docs (Chrome / Apple / Mozilla 2025).
type PermissionGuide = {
  platform: string;
  iconHint: string; // what to visually look for
  steps: string[];
  fallbackUrl?: string; // chrome://settings... URL the user can paste in a new tab
};

function getPermissionInstructions(): PermissionGuide {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /android/i.test(ua);
  const isMac = /Macintosh/.test(ua) && !isIOS;
  const isFirefox = /Firefox\//.test(ua);
  const isChromiumDesktop = !isIOS && !isAndroid && /Chrome\//.test(ua) && !isFirefox;

  if (isIOS) {
    return {
      platform: 'iPhone / iPad（Safari）',
      iconHint: '畫面最底部（或頂部）網址列上的「aA」按鈕',
      steps: [
        '點網址列上的「aA」按鈕（iOS 預設在底部）',
        '選「網站設定」→ 把「位置」改成「允許」',
        '若 iOS 18.2 以上：設定 → App → Safari → 網站設定 → 位置',
        '確認 設定 → 隱私權與安全性 → 定位服務 → Safari 網站 已開啟',
      ],
    };
  }
  if (isAndroid) {
    return {
      platform: 'Android Chrome',
      iconHint: '網址列最左邊的「查看網站資訊」圖示（兩條橫線帶滑桿的 tune 圖示）',
      steps: [
        '點網址列最左邊的「查看網站資訊」圖示',
        '點「權限」→ 找到「位置」',
        '選「造訪這個網站時允許」',
        '若仍不行：手機設定 → 應用程式 → Chrome → 權限 → 位置 → 使用時允許',
      ],
    };
  }
  if (isFirefox) {
    return {
      platform: 'Firefox',
      iconHint: '網址列鎖頭右側的「權限」滑桿圖示（不是齒輪、也不是盾牌）',
      steps: [
        '點網址列鎖頭右側的「權限」滑桿圖示',
        '找到「存取你的位置資訊」、改為「允許」',
        '若無此圖示：按 Ctrl+I（Mac 按 ⌘+I）開「頁面資訊」',
        '在「權限」分頁、把「存取你的位置」取消「使用預設值」、點「允許」',
      ],
    };
  }
  if (isMac) {
    // Safari on Mac vs Chrome on Mac
    const isSafariMac = /Safari\//.test(ua) && !/Chrome\//.test(ua);
    if (isSafariMac) {
      return {
        platform: 'Mac Safari',
        iconHint: '網址列左側智慧搜尋欄旁的「頁面選單按鈕」（小選單圖示）',
        steps: [
          '點網址列的「頁面選單按鈕」→「網站設定」',
          '把「位置」改成「允許」',
          '或：上方功能表 Safari → 設定 → 網站 → 位置 → 此網站改「允許」',
          '確認 系統設定 → 隱私權與安全性 → 定位服務 → Safari 已開啟',
        ],
      };
    }
    // Mac Chrome — fall through to chromium desktop block below
  }
  if (isChromiumDesktop) {
    return {
      platform: '電腦 Chrome / Edge',
      iconHint:
        '網址列最左邊的「查看網站資訊」圖示（兩條橫線帶圓點的滑桿圖示，2023/9 起取代舊鎖頭）',
      steps: [
        '點網址列最左邊的「查看網站資訊」圖示（看起來像兩條橫線帶圓點）',
        '在跳出的選單點「網站設定」',
        '在「權限」區找到「位置」、下拉改成「允許」',
        '若找不到「位置」、用下方按鈕複製設定頁網址、貼到新分頁開啟',
      ],
      fallbackUrl: 'chrome://settings/content/location',
    };
  }
  // Generic fallback
  return {
    platform: '瀏覽器',
    iconHint: '網址列左邊的小圖示',
    steps: [
      '點網址列左邊那個小圖示（可能是滑桿、鎖頭或 ⓘ）',
      '找到「位置」或「網站設定」→「位置」',
      '改成「允許」',
      '重新整理此頁',
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
    } catch (e) {
      console.error(e);
      toast.error('打卡失敗，請稍後再試');
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
    } catch (e) {
      console.error('Clock out failed', e);
      toast.error('簽退失敗，系統將重新整理狀態');
      await loadStatus();
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

      {/* 軟性提醒：位置權限被封鎖時引導開啟（不擋打卡） */}
      {permissionDenied &&
        (() => {
          const guide = getPermissionInstructions();
          return (
            <details className="w-full bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3 text-left">
              <summary className="text-xs font-bold text-amber-700 cursor-pointer list-none flex items-center gap-1">
                <span>📍</span>
                <span>未取得位置權限（打卡仍可進行）— 點此查看開啟方式</span>
              </summary>
              <div className="mt-2 pt-2 border-t border-amber-200">
                <div className="text-xs font-bold text-slate-500 uppercase mb-1.5">
                  {guide.platform}
                </div>
                <div className="text-xs text-slate-600 bg-white border border-amber-200 rounded p-2 mb-2">
                  <span className="font-bold text-amber-700">要找的圖示：</span>
                  {guide.iconHint}
                </div>
                <ol className="space-y-1 text-xs text-slate-700 mb-2">
                  {guide.steps.map((step, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="font-black text-amber-600 flex-shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                {guide.fallbackUrl && (
                  <button
                    onClick={async () => {
                      const url = guide.fallbackUrl!;
                      try {
                        await navigator.clipboard.writeText(url);
                        toast.success(`已複製 ${url}，請貼到新分頁網址列`);
                      } catch {
                        toast.error(`請手動複製：${url}`);
                      }
                    }}
                    className="w-full min-h-[36px] py-1 mb-1.5 bg-white border border-amber-300 hover:bg-amber-100 active:bg-amber-200 text-amber-700 rounded text-xs font-bold transition"
                  >
                    📋 複製設定頁網址（{guide.fallbackUrl}）
                  </button>
                )}
                <button
                  onClick={handleRetryPermission}
                  className="w-full min-h-[40px] py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded text-xs font-bold transition"
                >
                  我已開啟，重試
                </button>
                <div className="text-[10px] text-slate-400 mt-1.5 text-center">
                  改完權限後通常需要重新整理頁面（F5 / 下拉重整）
                </div>
              </div>
            </details>
          );
        })()}

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
