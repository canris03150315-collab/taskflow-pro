// Central Hub API - only active when VITE_INSTANCE_MODE=central
// Uses the shared request helper from api.ts (same JWT token handling)

import { request } from './api';

const CENTRAL_API_BASE = '/central';

// ============================================================================
// TYPES
// ============================================================================

export interface Subsidiary {
  id: string;
  name: string;
  base_url: string;
  service_token: string;
  status?: 'online' | 'offline' | 'unknown';
  last_health_check?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SubsidiaryCreateData {
  name: string;
  base_url: string;
  service_token: string;
}

export interface HealthCheckResult {
  id: string;
  name: string;
  status: 'online' | 'offline';
  latency_ms?: number;
  checked_at: string;
  error?: string;
}

export interface SuperAiQueryResponse {
  reply: string;
  conversationId: string;
  pendingAction?: {
    id: string;
    action: string;
    description: string;
    targetCompany?: string;
  };
}

export interface CentralAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  title: string;
  detail: string;
  companyName: string;
  companyId: string;
  created_at: string;
}

export interface DashboardOverview {
  subsidiaries: Array<{
    id: string;
    name: string;
    status: 'online' | 'offline';
    kpis: {
      totalUsers: number;
      totalTasks: number;
      completedTasks: number;
      taskCompletionRate: number;
      attendanceRate: number;
      pendingLeaves: number;
      overdueTasks: number;
      platformRevenue: number;
      monthlyExpense: number;
    };
  }>;
  alerts: CentralAlert[];
  summary: {
    totalCompanies: number;
    onlineCount: number;
    offlineCount: number;
  };
}

export interface CentralNotification {
  id: string;
  type: string;
  message: string;
  companyId: string;
  companyName: string;
  created_at: string;
  read: boolean;
}

// ============================================================================
// CENTRAL API
// ============================================================================

export const centralApi = {
  // Subsidiary Management
  subsidiaries: {
    getAll: () => request<{ subsidiaries: Subsidiary[] }>('GET', `${CENTRAL_API_BASE}/subsidiaries`),
    create: (data: SubsidiaryCreateData) =>
      request<{ subsidiary: Subsidiary; message: string }>('POST', `${CENTRAL_API_BASE}/subsidiaries`, data),
    update: (id: string, data: Partial<SubsidiaryCreateData>) =>
      request<{ subsidiary: Subsidiary; message: string }>('PUT', `${CENTRAL_API_BASE}/subsidiaries/${id}`, data),
    delete: (id: string) =>
      request<void>('DELETE', `${CENTRAL_API_BASE}/subsidiaries/${id}`),
    healthCheck: (id: string) =>
      request<{ result: HealthCheckResult }>('POST', `${CENTRAL_API_BASE}/subsidiaries/${id}/health-check`),
    healthCheckAll: () =>
      request<{ results: HealthCheckResult[] }>('POST', `${CENTRAL_API_BASE}/subsidiaries/health-check-all`),
  },

  // Gateway (proxy to subsidiary)
  gateway: {
    request: (companyId: string, method: string, path: string, body?: any) =>
      request<any>(method, `${CENTRAL_API_BASE}/gateway/${companyId}/${path}`, body),
  },

  // Super AI
  superAi: {
    query: (message: string, conversationId?: string) =>
      request<SuperAiQueryResponse>('POST', `${CENTRAL_API_BASE}/super-ai/query`, { message, conversationId }),
    confirm: (pendingId: string) =>
      request<{ success: boolean; message: string }>('POST', `${CENTRAL_API_BASE}/super-ai/confirm`, { pendingId }),
    cancel: (pendingId: string) =>
      request<{ success: boolean; message: string }>('POST', `${CENTRAL_API_BASE}/super-ai/cancel`, { pendingId }),
    getAlerts: () =>
      request<{ alerts: CentralAlert[] }>('GET', `${CENTRAL_API_BASE}/super-ai/alerts`),
  },

  // Dashboard
  dashboard: {
    getOverview: () =>
      request<DashboardOverview>('GET', `${CENTRAL_API_BASE}/dashboard/overview`),
    getNotifications: () =>
      request<{ notifications: CentralNotification[] }>('GET', `${CENTRAL_API_BASE}/dashboard/notifications`),
  },
};
