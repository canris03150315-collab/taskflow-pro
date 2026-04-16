// Global Dialog Service - replaces native alert() and confirm()
// Uses event-based pattern so it works from anywhere (inside or outside React components)

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastEvent {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ConfirmEvent {
  id: string;
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  resolve: (value: boolean) => void;
}

type DialogListener = (event: ToastEvent | ConfirmEvent) => void;

const toastListeners: Set<(event: ToastEvent) => void> = new Set();
const confirmListeners: Set<(event: ConfirmEvent) => void> = new Set();

let idCounter = 0;
const genId = () => `dlg-${++idCounter}-${Date.now()}`;

// === Toast (replaces alert) ===
export function showToast(message: string, type: ToastType = 'info', duration = 3000): void {
  const event: ToastEvent = { id: genId(), message, type, duration };
  toastListeners.forEach(fn => fn(event));
}

export function showSuccess(message: string, duration = 3000): void {
  showToast(message, 'success', duration);
}

export function showError(message: string, duration = 4000): void {
  showToast(message, 'error', duration);
}

export function showWarning(message: string, duration = 3500): void {
  showToast(message, 'warning', duration);
}

export function showInfo(message: string, duration = 3000): void {
  showToast(message, 'info', duration);
}

// === Confirm Dialog (replaces confirm) ===
export function showConfirm(
  message: string,
  options?: { title?: string; confirmText?: string; cancelText?: string }
): Promise<boolean> {
  return new Promise((resolve) => {
    const event: ConfirmEvent = {
      id: genId(),
      message,
      title: options?.title || '確認操作',
      confirmText: options?.confirmText || '確定',
      cancelText: options?.cancelText || '取消',
      resolve,
    };
    confirmListeners.forEach(fn => fn(event));
  });
}

// === Listener registration (used by GlobalDialogs component) ===
export function onToast(fn: (event: ToastEvent) => void): () => void {
  toastListeners.add(fn);
  return () => toastListeners.delete(fn);
}

export function onConfirm(fn: (event: ConfirmEvent) => void): () => void {
  confirmListeners.add(fn);
  return () => confirmListeners.delete(fn);
}

export type { ToastEvent, ConfirmEvent, ToastType };
