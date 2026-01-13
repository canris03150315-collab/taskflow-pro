import React from 'react';
import { Badge } from './Badge';

interface FloatingChatButtonProps {
  unreadCount: number;
  onClick: () => void;
  isOpen: boolean;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  unreadCount,
  onClick,
  isOpen
}) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
        isOpen 
          ? 'bg-blue-700 rotate-0' 
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
      title="企業通訊"
    >
      {/* 聊天圖標 */}
      <div className="relative flex items-center justify-center w-full h-full">
        {isOpen ? (
          // 關閉圖標（X）
          <svg 
            className="w-6 h-6 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // 聊天氣泡圖標
          <svg 
            className="w-7 h-7 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
            />
          </svg>
        )}
        
        {/* 未讀訊息徽章 */}
        {!isOpen && unreadCount > 0 && (
          <div className="absolute -top-1 -right-1">
            <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </div>
        )}
      </div>

      {/* 脈衝動畫（有未讀訊息時） */}
      {!isOpen && unreadCount > 0 && (
        <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></span>
      )}
    </button>
  );
};
