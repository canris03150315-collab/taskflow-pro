import React, { useState, useEffect, useCallback } from 'react';
import { onToast, onConfirm, ToastEvent, ConfirmEvent, ToastType } from '../utils/dialogService';

// === Toast Component ===
const toastStyles: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: 'bg-emerald-50', border: 'border-emerald-400', icon: '✅', text: 'text-emerald-800' },
  error:   { bg: 'bg-red-50',     border: 'border-red-400',     icon: '❌', text: 'text-red-800' },
  warning: { bg: 'bg-amber-50',   border: 'border-amber-400',   icon: '⚠️', text: 'text-amber-800' },
  info:    { bg: 'bg-blue-50',    border: 'border-blue-400',    icon: 'ℹ️', text: 'text-blue-800' },
};

const Toast: React.FC<{ toast: ToastEvent; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const style = toastStyles[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      data-testid="toast-message"
      data-toast-type={toast.type}
      className={`flex items-start gap-3 p-4 rounded-xl border-l-4 ${style.border} ${style.bg} shadow-lg max-w-sm w-full animate-slide-in`}
    >
      <span className="text-lg flex-shrink-0 mt-0.5">{style.icon}</span>
      <p className={`text-sm font-medium ${style.text} flex-1 break-words`}>{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-slate-600 flex-shrink-0 ml-2"
        aria-label="關閉"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// === Confirm Dialog Component ===
const ConfirmDialog: React.FC<{ confirm: ConfirmEvent; onResult: (id: string, result: boolean) => void }> = ({ confirm, onResult }) => {
  return (
    <div
      data-testid="confirm-dialog"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-5 pb-2">
          <h3 className="text-lg font-bold text-slate-800">{confirm.title}</h3>
        </div>
        {/* Body */}
        <div className="px-5 pb-5">
          <p className="text-sm text-slate-600 whitespace-pre-line">{confirm.message}</p>
        </div>
        {/* Actions */}
        <div className="flex border-t border-slate-100">
          <button
            data-testid="confirm-cancel"
            onClick={() => onResult(confirm.id, false)}
            className="flex-1 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-50 transition border-r border-slate-100"
          >
            {confirm.cancelText}
          </button>
          <button
            data-testid="confirm-ok"
            onClick={() => onResult(confirm.id, true)}
            className="flex-1 py-3.5 text-sm font-bold text-blue-600 hover:bg-blue-50 transition"
          >
            {confirm.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// === Global Dialogs Container ===
export const GlobalDialogs: React.FC = () => {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);
  const [confirms, setConfirms] = useState<ConfirmEvent[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleConfirmResult = useCallback((id: string, result: boolean) => {
    setConfirms(prev => {
      const target = prev.find(c => c.id === id);
      if (target) target.resolve(result);
      return prev.filter(c => c.id !== id);
    });
  }, []);

  useEffect(() => {
    const unsubToast = onToast((event) => {
      setToasts(prev => [...prev.slice(-4), event]); // max 5 toasts
    });
    const unsubConfirm = onConfirm((event) => {
      setConfirms(prev => [...prev, event]);
    });
    return () => { unsubToast(); unsubConfirm(); };
  }, []);

  return (
    <>
      {/* Toast Container - top right */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[9998] flex flex-col gap-2">
          {toasts.map(t => (
            <Toast key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
        </div>
      )}

      {/* Confirm Dialog - only show the first one */}
      {confirms.length > 0 && (
        <ConfirmDialog
          key={confirms[0].id}
          confirm={confirms[0]}
          onResult={handleConfirmResult}
        />
      )}
    </>
  );
};
