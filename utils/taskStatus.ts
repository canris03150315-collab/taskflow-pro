import { Task, TaskStatus } from '../types';

// 後端可能存中文狀態值，前端 enum 是英文——所有比較前先過這層正規化
// （原本是 TaskCard 的區域變數，抽出來讓 App 的統計/分組/篩選共用同一套）
const STATUS_CN_TO_EN: Record<string, string> = {
  待接取: TaskStatus.OPEN,
  已指派: TaskStatus.ASSIGNED,
  進行中: TaskStatus.IN_PROGRESS,
  已完成: TaskStatus.COMPLETED,
  已取消: TaskStatus.CANCELLED,
};

export const normalizeTaskStatus = (status: string): string => STATUS_CN_TO_EN[status] || status;

// urgency 同樣有中文/大小寫混存的歷史（DB constraint 接受 12 種值）
const URGENCY_CN_TO_EN: Record<string, string> = {
  低: 'low',
  中: 'medium',
  高: 'high',
  緊急: 'urgent',
};

export const normalizeUrgency = (urgency: string): string =>
  URGENCY_CN_TO_EN[urgency] || String(urgency || '').toLowerCase();

const URGENCY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export const urgencyRank = (urgency: string): number =>
  URGENCY_RANK[normalizeUrgency(urgency)] ?? 9;

export const isTaskOverdue = (t: Task): boolean => {
  if (!t.deadline) return false;
  const s = normalizeTaskStatus(t.status);
  if (s === TaskStatus.COMPLETED || s === TaskStatus.CANCELLED) return false;
  return new Date(t.deadline) < new Date();
};

// Task 沒有 completedAt 欄位 → 以最後一筆 timeline 的 timestamp 當完成時間的近似值
export const taskCompletedAt = (t: Task): string | null => {
  if (normalizeTaskStatus(t.status) !== TaskStatus.COMPLETED) return null;
  if (!t.timeline || t.timeline.length === 0) return null;
  return t.timeline[t.timeline.length - 1].timestamp || null;
};

// 本週起點＝週一 00:00（本地時區）
export const startOfWeek = (): Date => {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
};
