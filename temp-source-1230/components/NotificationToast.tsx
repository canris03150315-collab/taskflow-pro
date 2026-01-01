import React from 'react';

// 動畫樣式
const slideInStyle = {
  animation: 'slideIn 0.3s ease-out forwards',
};

// 添加 keyframes 到 document
if (typeof document !== 'undefined') {
  const styleId = 'notification-toast-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

interface Notification {
  id: string;
  type: 'assigned' | 'available' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  onClick?: () => void;
}

interface NotificationToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  const getTypeStyles = (type: Notification['type']) => {
    switch (type) {
      case 'assigned':
        return 'bg-gradient-to-r from-red-500 to-red-600 border-red-400';
      case 'available':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400';
      case 'success':
        return 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400';
      case 'warning':
        return 'bg-gradient-to-r from-orange-500 to-orange-600 border-orange-400';
      default:
        return 'bg-gradient-to-r from-slate-600 to-slate-700 border-slate-500';
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'assigned':
        return '🔔';
      case 'available':
        return '📋';
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          style={slideInStyle}
          className={`${getTypeStyles(notification.type)} text-white p-4 rounded-xl shadow-2xl border cursor-pointer transform transition-all hover:scale-[1.02]`}
          onClick={() => {
            if (notification.onClick) notification.onClick();
            onDismiss(notification.id);
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{getIcon(notification.type)}</span>
            <div className="flex-1">
              <h4 className="font-bold text-sm">{notification.title}</h4>
              <p className="text-xs opacity-90 mt-1">{notification.message}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(notification.id);
              }}
              className="text-white/70 hover:text-white transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-2 text-[10px] opacity-70 text-right">點擊查看</div>
        </div>
      ))}
    </div>
  );
};

export type { Notification };
