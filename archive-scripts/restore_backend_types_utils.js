
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

// --- types.ts ---
const typesContent = `
export enum Role {
  BOSS = 'BOSS',
  MANAGER = 'MANAGER',
  SUPERVISOR = 'SUPERVISOR',
  EMPLOYEE = 'EMPLOYEE',
}

export type Permission = 
  | 'CREATE_TASK'
  | 'MANAGE_FINANCE'
  | 'POST_ANNOUNCEMENT'
  | 'MANAGE_FORUM'
  | 'MANAGE_USERS'
  | 'SYSTEM_RESET';

export interface DepartmentDef {
  id: string;
  name: string;
  theme: 'slate' | 'blue' | 'purple' | 'rose' | 'emerald' | 'orange' | 'cyan';
  icon: string;
}

export const UNASSIGNED_DEPT_ID = 'UNASSIGNED';

export const DEFAULT_DEPARTMENTS: DepartmentDef[] = [
  { id: 'Management', name: '營運管理部', theme: 'slate', icon: '💼' },
  { id: 'Engineering', name: '技術工程部', theme: 'blue', icon: '🔧' },
  { id: 'Marketing', name: '市場行銷部', theme: 'purple', icon: '📢' },
  { id: 'HR', name: '人力資源部', theme: 'rose', icon: '👥' },
  { id: UNASSIGNED_DEPT_ID, name: '待分配 / 新人', theme: 'slate', icon: '🔰' },
];

export enum Urgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TaskStatus {
  OPEN = 'Open',
  ASSIGNED = 'Assigned',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export interface User {
  id: string;
  name: string;
  role: Role;
  department: string;
  avatar: string;
  username: string; 
  password: string;
  permissions?: Permission[];
}

export const hasPermission = (user: User, perm: Permission): boolean => {
  if (user.role === Role.BOSS || user.role === Role.MANAGER || user.role === Role.SUPERVISOR) {
    if (perm === 'SYSTEM_RESET' && user.role !== Role.BOSS) {
        return user.permissions?.includes(perm) || false;
    }
    return true;
  }
  return user.permissions?.includes(perm) || false;
};

export interface TaskTimelineEntry {
  timestamp: string;
  userId: string;
  content: string;
  progress: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  urgency: Urgency;
  deadline?: string; 
  createdAt: string;
  status: TaskStatus;
  targetDepartment?: string;
  assignedToUserId?: string; 
  acceptedByUserId?: string; 
  completionNotes?: string;
  progress: number;
  timeline: TaskTimelineEntry[];
  createdBy: string;
  isArchived?: boolean;
  unreadUpdatesForUserIds?: string[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'IMPORTANT';
  createdAt: string;
  createdBy: string;
  readBy: string[];
}

export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  avatar: string;
  content: string;
  timestamp: string;
  readBy: string[];
}

export interface ChatChannel {
  id: string;
  type: 'DIRECT' | 'GROUP' | 'DEPARTMENT';
  name?: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
  created_at?: string; // Correctly added for ChatSystem.tsx
}

export interface ChatRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  timestamp: string;
}

export enum ReportType {
  DAILY = 'DAILY',
}

export interface DailyReportContent {
  lineLeads: number;
  registrations: number;
  firstDeposits: number;
  depositAmount: number;
  withdrawalAmount: number;
  netIncome: number;
  conversionRate?: number;
  firstDepositRate?: number;
  notes: string;
}

export interface Report {
  id: string;
  type: ReportType;
  userId: string;
  createdAt: string;
  content: DailyReportContent;
  aiSummary?: string;
  aiMood?: 'POSITIVE' | 'NEUTRAL' | 'STRESSED';
  managerFeedback?: string;
  reviewedBy?: string;
}

export interface FinanceRecord {
  id: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  status: 'PENDING' | 'COMPLETED';
  category: string;
  description: string;
  scope: 'DEPARTMENT' | 'PERSONAL';
  departmentId: string;
  ownerId?: string;
  recordedBy: string;
  attachment?: string;
}

export enum SuggestionStatus {
  OPEN = 'OPEN',
  REVIEWING = 'REVIEWING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface SuggestionComment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  isOfficialReply?: boolean;
}

export interface Suggestion {
  id: string;
  title: string;
  content: string;
  category: string;
  isAnonymous: boolean;
  authorId: string;
  targetDeptId?: string;
  status: SuggestionStatus;
  upvotes: string[];
  comments: SuggestionComment[];
  createdAt: string;
}

export interface MemoTodo {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Memo {
  id: string;
  userId: string;
  type: 'TEXT' | 'CHECKLIST';
  content?: string;
  todos?: MemoTodo[];
  color: 'yellow' | 'blue' | 'green' | 'rose' | 'purple';
  createdAt: string;
}

export interface RoutineTemplate {
  id: string;
  departmentId: string;
  title: string;
  items: string[];
  lastUpdated: string;
  readBy?: string[];
  isDaily?: boolean;
}

export interface RoutineItemStatus {
  text: string;
  completed: boolean;
  id?: string;
}

export interface RoutineRecord {
  id: string;
  templateId: string;
  userId: string;
  date: string;
  items: RoutineItemStatus[];
  completedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  durationMinutes?: number;
  status: 'ONLINE' | 'OFFLINE';
}

export type LogLevel = 'INFO' | 'WARNING' | 'DANGER';

export interface SystemLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  level: LogLevel;
}

export interface ReviewMetrics {
  taskCompletionRate: number;
  sopCompletionRate: number;
  attendanceRate: number;
}

export interface PerformanceReview {
  id: string;
  targetUserId: string;
  period: string;
  reviewerId?: string;
  updatedAt: string;
  metrics: ReviewMetrics;
  ratingWorkAttitude: number;
  ratingProfessionalism: number;
  ratingTeamwork: number;
  managerComment: string;
  totalScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  status: 'DRAFT' | 'PUBLISHED';
}

export type MenuItemId = 
  | 'dashboard' 
  | 'bulletin' 
  | 'tasks' 
  | 'sop' 
  | 'performance' 
  | 'team' 
  | 'reports' 
  | 'finance' 
  | 'data_center' 
  | 'forum' 
  | 'chat' 
  | 'memo' 
  | 'personnel' 
  | 'settings';

export interface MenuGroup {
  id: string;
  label: string;
  items: MenuItemId[];
}

export const DEFAULT_MENU_GROUPS: MenuGroup[] = [
  {
    id: 'main',
    label: '管理核心',
    items: ['dashboard', 'data_center', 'team', 'personnel']
  },
  {
    id: 'work',
    label: '工作執行',
    items: ['tasks', 'chat', 'reports', 'memo']
  },
  {
    id: 'admin',
    label: '行政與資源',
    items: ['bulletin', 'sop', 'finance', 'performance', 'forum']
  },
  {
    id: 'system',
    label: '系統設定',
    items: ['settings']
  }
];

export const DEFAULT_MENU_ORDER: MenuItemId[] = [
  'dashboard', 'chat', 'bulletin', 'tasks', 'sop', 
  'performance', 'team', 'reports', 'finance', 'data_center', 
  'forum', 'memo', 'personnel', 'settings'
];

export const MENU_LABELS: Record<MenuItemId, { label: string, icon: string }> = {
  dashboard: { label: '儀表板', icon: '📊' },
  bulletin: { label: '企業公告欄', icon: '📢' },
  tasks: { label: '任務列表', icon: '📋' },
  sop: { label: '部門文件與規範', icon: '📑' },
  performance: { label: '績效考核 (KPI)', icon: '🏆' },
  team: { label: '團隊工作概況', icon: '📉' },
  reports: { label: '工作報表中心', icon: '📝' },
  finance: { label: '零用金與公費', icon: '💰' },
  data_center: { label: '部門數據中心', icon: '📥' }, 
  forum: { label: '提案討論區', icon: '💬' },
  chat: { label: '企業通訊', icon: '📨' },
  memo: { label: '個人備忘錄', icon: '✏️' },
  personnel: { label: '人員帳號管理', icon: '👥' },
  settings: { label: '系統設定', icon: '⚙️' },
};
`;

// --- utils/websocketClient.ts ---
const wsContent = \`
export type WebSocketMessage = {
    type: string;
    payload: any;
};

export class WebSocketClient {
    private url: string;
    private ws: WebSocket | null = null;
    private messageHandlers: ((msg: WebSocketMessage) => void)[] = [];
    private reconnectInterval = 3000;

    constructor(url: string) {
        this.url = url;
    }

    async connect(token?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const fullUrl = token ? \\\`\\\${this.url}?token=\\\${token}\\\` : this.url;
            this.ws = new WebSocket(fullUrl);

            this.ws.onopen = () => {
                console.log('WS Connected');
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const parsed: WebSocketMessage = JSON.parse(event.data);
                    this.messageHandlers.forEach(h => h(parsed));
                } catch (e) {
                    console.error('WS Parse Error', e);
                }
            };

            this.ws.onclose = () => {
                console.log('WS Closed');
                setTimeout(() => this.connect(token), this.reconnectInterval);
            };

            this.ws.onerror = (err) => {
                console.error('WS Error', err);
                reject(err);
            };
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    addMessageHandler(handler: (msg: WebSocketMessage) => void) {
        this.messageHandlers.push(handler);
    }

    removeMessageHandler(handler: (msg: WebSocketMessage) => void) {
        this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    }

    sendMessage(type: string, payload: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
        }
    }
}
\`;

// --- services/api.ts ---
// Note: apiContent is very large, so I will reconstruct it carefully.
const apiContent = \`import { 
  User, Role, DepartmentDef, DEFAULT_DEPARTMENTS, Task, Announcement, 
  Report, FinanceRecord, Suggestion, Memo, RoutineTemplate, AttendanceRecord, 
  SystemLog, PerformanceReview, ChatChannel, ChatMessage, TaskStatus, Urgency,
  MenuItemId, DEFAULT_MENU_GROUPS, MenuGroup, RoutineRecord, ReviewMetrics
} from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const USE_MOCK_API = false; 
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api'; 

const MOCK_DB = {
  users: [] as User[], 
  departments: [...DEFAULT_DEPARTMENTS],
  tasks: [] as Task[],
  announcements: [] as Announcement[],
  reports: [] as Report[],
  finance: [] as FinanceRecord[],
  suggestions: [] as Suggestion[],
  memos: [] as Memo[],
  routineTemplates: [] as RoutineTemplate[],
  attendance: [] as AttendanceRecord[],
  performance: [] as PerformanceReview[],
  logs: [] as SystemLog[],
  chatChannels: [] as ChatChannel[],
  chatMessages: [] as ChatMessage[],
  settings: {
      menuGroups: DEFAULT_MENU_GROUPS as MenuGroup[]
  }
};

const STORAGE_KEY = 'TASKFLOW_PRO_DB_V2';

const loadFromStorage = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            const parsed = JSON.parse(data);
            Object.keys(parsed).forEach(key => {
                if ((MOCK_DB as any)[key] !== undefined && parsed[key] !== undefined) {
                    (MOCK_DB as any)[key] = parsed[key];
                }
            });
            if (MOCK_DB.attendance) {
                MOCK_DB.attendance.forEach(r => {
                    if (!r.status) r.status = r.clockOut ? 'OFFLINE' : 'ONLINE';
                });
            }
        } catch (e) {
            console.error('Failed to load mock DB', e);
        }
    }
};

const saveToStorage = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_DB));
};

if (USE_MOCK_API) {
    loadFromStorage();
}

const delay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': \\\`Bearer \\\${token}\\\` } : {})
    };
};

const request = async <T>(method: string, endpoint: string, body?: any): Promise<T> => {
    try {
        const response = await fetch(\\\`\\\${API_BASE_URL}\\\${endpoint}\\\`, {
            method,
            headers: getAuthHeaders(),
            body: body ? JSON.stringify(body) : undefined,
        });
        
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        
        if (!response.ok) {
            const errorMessage = data.error || \\\`API Error: \\\${response.statusText}\\\`;
            throw new Error(errorMessage);
        }
        
        return data;
    } catch (error) {
        console.error(\\\`Request failed: \\\${method} \\\${endpoint}\\\`, error);
        throw error;
    }
};

const RealApi = {
    auth: {
        login: async (username: string, password: string): Promise<User | undefined> => {
            const res = await request<{ user: User, token: string }>('POST', '/auth/login', { username, password });
            if (res.token) {
                localStorage.setItem('auth_token', res.token);
                return res.user;
            }
            return undefined;
        },
        setup: async (userData: any): Promise<User> => {
            const res = await request<{ user: User, token: string }>('POST', '/auth/setup', userData);
            if (res.token) {
                localStorage.setItem('auth_token', res.token);
            }
            return res.user;
        },
        verify: async (): Promise<User | null> => {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) return null;
                const res = await request<{ user: User }>('POST', '/auth/verify', {});
                return res.user;
            } catch (error) {
                localStorage.removeItem('auth_token');
                return null;
            }
        },
        logout: () => {
            localStorage.removeItem('auth_token');
        },
        checkSetup: async (): Promise<{ needsSetup: boolean; userCount: number }> => {
            return request<{ needsSetup: boolean; userCount: number }>('GET', '/auth/setup/check');
        },
        changePassword: (userId: string, currentPassword: string, newPassword: string) => request<{ success: boolean }>('POST', \\\`/users/\\\${userId}/change-password\\\`, { currentPassword, newPassword })
    },
    users: {
        getAll: async (): Promise<User[]> => {
            try {
                const response = await request<{ users: any[] } | any[]>('GET', '/users');
                const users = Array.isArray(response) ? response : (response.users || []);
                return users.map((u: any) => ({
                    ...u,
                    password: u.password || '',
                    permissions: u.permissions || []
                }));
            } catch (error) {
                console.error('Failed to get users', error);
                return [];
            }
        },
        create: async (user: User) => {
            const response = await request<{ user: User, message: string }>('POST', '/users', user);
            return response.user;
        },
        update: (user: User) => request<User>('PUT', \\\`/users/\\\${user.id}\\\`, user),
        delete: (id: string) => request<void>('DELETE', \\\`/users/\\\${id}\\\`),
        updateAvatar: async (userId: string, avatar: string) => {
            return await request<{ avatar: string, message: string }>('POST', \\\`/users/\\\${userId}/avatar\\\`, { avatar });
        }
    },
    departments: {
        getAll: async (): Promise<DepartmentDef[]> => {
            try {
                const response = await request<{ departments: any[] } | any[]>('GET', '/departments');
                return Array.isArray(response) ? response : (response.departments || []);
            } catch (error) {
                console.error('Failed to get departments', error);
                return [];
            }
        },
        create: async (dept: DepartmentDef) => {
            const response = await request<{ department: DepartmentDef, message: string }>('POST', '/departments', dept);
            return response.department;
        },
        update: async (dept: DepartmentDef) => {
            const response = await request<{ department: DepartmentDef, message: string }>('PUT', \\\`/departments/\\\${dept.id}\\\`, dept);
            return response.department;
        },
        delete: (id: string) => request<void>('DELETE', \\\`/departments/\\\${id}\\\`)
    },
    tasks: {
        getAll: async (): Promise<Task[]> => {
            const response = await request<{ tasks: any[], pagination?: any }>('GET', '/tasks');
            return (response.tasks || []).map((task: any) => ({
                id: task.id,
                title: task.title,
                description: task.description,
                urgency: task.urgency,
                deadline: task.deadline,
                createdAt: task.created_at,
                status: task.status,
                targetDepartment: task.target_department,
                assignedToUserId: task.assigned_to_user_id,
                assignedToDepartment: task.assigned_to_department,
                acceptedByUserId: task.accepted_by_user_id,
                completionNotes: task.completion_notes,
                progress: task.progress || 0,
                createdBy: task.created_by,
                isArchived: task.is_archived === 1 || task.is_archived === true,
                timeline: task.timeline || [],
                unreadUpdatesForUserIds: task.unread_updates_for_user_ids || []
            }));
        },
        create: (task: Task) => request<Task>('POST', '/tasks', task),
        update: (task: Task) => request<Task>('PUT', \\\`/tasks/\\\${task.id}\\\`, task),
        updateProgress: (id: string, updates: Partial<Task>) => request<void>('PATCH', \\\`/tasks/\\\${id}\\\`, updates),
        accept: (id: string) => request<{ task: any }>('POST', \\\`/tasks/\\\${id}/accept\\\`, {}),
        delete: (id: string) => request<void>('DELETE', \\\`/tasks/\\\${id}\\\`)
    },
    announcements: {
        getAll: async (): Promise<Announcement[]> => {
            try {
                const response = await request<{ announcements: any[] }>('GET', '/announcements');
                return (response.announcements || []).map((a: any) => ({
                    ...a,
                    readBy: a.read_by || a.readBy || [],
                    createdAt: a.created_at || a.createdAt
                }));
            } catch (error) {
                console.error('Failed to get announcements', error);
                return [];
            }
        },
        create: (ann: Announcement) => request<Announcement>('POST', '/announcements', ann),
        markRead: (id: string, userId: string) => request<void>('POST', \\\`/announcements/\\\${id}/read\\\`, { userId })
    },
    reports: {
        getAll: async (): Promise<Report[]> => {
            try {
                const response = await request<{ reports: any[] }>('GET', '/reports');
                return (response.reports || []).map((r: any) => ({
                    ...r,
                    createdAt: r.created_at || r.createdAt,
                    userId: r.user_id || r.userId
                }));
            } catch (error) {
                console.error('Failed to get reports', error);
                return [];
            }
        },
        create: (report: Report) => request<Report>('POST', '/reports', report),
        update: (id: string, content: any) => request<Report>('PUT', \\\`/reports/\\\${id}\\\`, { content }),
        delete: (id: string) => request<void>('DELETE', \\\`/reports/\\\${id}\\\`)
    },
    finance: {
        getAll: async (): Promise<FinanceRecord[]> => {
            try {
                const response = await request<{ records: any[] }>('GET', '/finance');
                return (response.records || []).map((r: any) => ({
                    ...r,
                    departmentId: r.department_id || r.departmentId,
                    ownerId: r.owner_id || r.ownerId,
                    recordedBy: r.recorded_by || r.recordedBy
                }));
            } catch (error) {
                console.error('Failed to get finance', error);
                return [];
            }
        },
        create: (record: FinanceRecord) => request<FinanceRecord>('POST', '/finance', record),
        confirm: (id: string) => request<void>('POST', \\\`/finance/\\\${id}/confirm\\\`),
        delete: (id: string) => request<void>('DELETE', \\\`/finance/\\\${id}\\\`)
    },
    forum: {
        getAll: async (): Promise<Suggestion[]> => {
            try {
                const response = await request<{ suggestions: any[] }>('GET', '/forum');
                return (response.suggestions || []).map((s: any) => ({
                    ...s,
                    authorId: s.author_id || s.authorId,
                    targetDeptId: s.target_dept_id || s.targetDeptId,
                    isAnonymous: s.is_anonymous === 1 || s.isAnonymous,
                    createdAt: s.created_at || s.createdAt,
                    upvotes: s.upvotes || [],
                    comments: s.comments || []
                }));
            } catch (error) {
                console.error('Failed to get forum', error);
                return [];
            }
        },
        create: (sug: Suggestion) => request<Suggestion>('POST', '/forum', sug),
        update: (sug: Suggestion) => request<Suggestion>('PUT', \\\`/forum/\\\${sug.id}\\\`, sug),
        addComment: (suggestionId: string, content: string, isOfficial: boolean) => 
            request<{ comment: any }>('POST', \\\`/forum/\\\${suggestionId}/comments\\\`, { content, is_official: isOfficial })
    },
    memos: {
        getAll: async (userId: string): Promise<Memo[]> => {
            try {
                const response = await request<{ memos: any[] }>('GET', \`/memos\`);
                return (response.memos || []).map((m: any) => ({
                    ...m,
                    userId: m.user_id || m.userId,
                    createdAt: m.created_at || m.createdAt,
                    todos: m.todos || []
                }));
            } catch (error) {
                console.error('Failed to get memos', error);
                return [];
            }
        },
        create: (memo: Memo) => request<Memo>('POST', '/memos', memo),
        update: (memo: Memo) => request<Memo>('PUT', \\\`/memos/\\\${memo.id}\\\`, memo),
        delete: (id: string) => request<void>('DELETE', \\\`/memos/\\\${id}\\\`)
    },
    routines: {
        getTemplates: () => request<RoutineTemplate[]>('GET', '/routines/templates'),
        saveTemplate: (tpl: RoutineTemplate) => request<RoutineTemplate>('POST', '/routines/templates', tpl),
        deleteTemplate: (id: string) => request<void>('DELETE', \\\`/routines/templates/\\\${id}\\\`),
        markAsRead: (userId: string, templateId: string) => request<void>('POST', \\\`/routines/templates/\\\${templateId}/read\\\`, { userId }),
        getTodayRecord: (userId: string, deptId: string) => request<RoutineRecord | null>('GET', \\\`/routines/today?userId=\\\${userId}&deptId=\\\${deptId}\\\`),
        getHistory: () => request<RoutineRecord[]>('GET', '/routines/history'),
        toggleItem: (recordId: string, index: number, isCompleted: boolean) => request<void>('POST', \\\`/routines/records/\\\${recordId}/toggle\\\`, { index, isCompleted })
    },
    attendance: {
        getTodayStatus: async (userId: string): Promise<AttendanceRecord | null> => {
            try {
                const response = await request<{ today: { record: any } }>('GET', \`/attendance/status\`);
                const record = response.today?.record;
                if (!record) return null;
                return {
                    id: record.id,
                    userId: record.user_id,
                    date: record.date,
                    clockIn: record.clock_in,
                    clockOut: record.clock_out || null,
                    durationMinutes: record.duration_minutes || 0,
                    status: record.status
                };
            } catch (error) {
                console.error('Failed to get attendance status', error);
                return null;
            }
        },
        getHistory: async (): Promise<AttendanceRecord[]> => {
            const response = await request<{ records: any[] }>('GET', \`/attendance\`);
            return (response.records || []).map((r: any) => ({
                id: r.id,
                userId: r.user_id,
                date: r.date,
                clockIn: r.clock_in,
                clockOut: r.clock_out,
                durationMinutes: r.duration_minutes,
                status: r.status
            }));
        },
        clockIn: async (userId: string): Promise<AttendanceRecord> => {
            const response = await request<{ record: any }>('POST', '/attendance/clock-in', {});
            const record = response.record;
            return {
                id: record.id,
                userId: userId,
                date: record.date,
                clockIn: record.clock_in,
                clockOut: record.clock_out || null,
                durationMinutes: record.duration_minutes || 0,
                status: record.status || 'ONLINE'
            };
        },
        clockOut: async (recordId: string): Promise<AttendanceRecord> => {
            const response = await request<{ record: any }>('POST', '/attendance/clock-out', { id: recordId });
            const record = response.record;
            return {
                id: record.id,
                userId: record.user_id,
                date: record.date,
                clockIn: record.clock_in,
                clockOut: record.clock_out,
                durationMinutes: record.duration_minutes,
                status: record.status || 'OFFLINE'
            };
        }
    },
    chat: {
        getChannels: async (userId: string): Promise<ChatChannel[]> => {
            try {
                const response = await request<{ channels: any[] }>('GET', '/chat/channels');
                return (response.channels || []).map((ch: any) => ({
                    id: ch.id,
                    type: ch.type,
                    name: ch.name,
                    participants: ch.participants || [],
                    lastMessage: ch.lastMessage || ch.last_message ? {
                        id: (ch.lastMessage || ch.last_message).id,
                        channelId: (ch.lastMessage || ch.last_message).channel_id || (ch.lastMessage || ch.last_message).channelId,
                        userId: (ch.lastMessage || ch.last_message).user_id || (ch.lastMessage || ch.last_message).userId,
                        userName: (ch.lastMessage || ch.last_message).user_name || (ch.lastMessage || ch.last_message).userName,
                        avatar: (ch.lastMessage || ch.last_message).avatar,
                        content: (ch.lastMessage || ch.last_message).content,
                        timestamp: (ch.lastMessage || ch.last_message).timestamp,
                        readBy: (ch.lastMessage || ch.last_message).read_by || (ch.lastMessage || ch.last_message).readBy || []
                    } : undefined,
                    unreadCount: ch.unreadCount || ch.unread_count || 0,
                    participantDetails: ch.participantDetails || ch.participant_details,
                    created_at: ch.created_at
                }));
            } catch (error) {
                console.error('Failed to get channels', error);
                return [];
            }
        },
        getMessages: async (channelId: string, options?: { limit?: number; before?: string; after?: string }): Promise<{ messages: ChatMessage[]; hasMore: boolean }> => {
            const params = new URLSearchParams();
            if (options?.limit) params.append('limit', options.limit.toString());
            if (options?.before) params.append('before', options.before);
            if (options?.after) params.append('after', options.after);
            const queryString = params.toString();
            const response = await request<{ messages: any[]; hasMore?: boolean }>('GET', \\\`/chat/channels/\\\${channelId}/messages\\\${queryString ? \\\`?\\\${queryString}\\\` : ''}\\\`);
            return {
                messages: (response.messages || []).map((m: any) => ({
                    id: m.id,
                    channelId: m.channelId || m.channel_id,
                    userId: m.userId || m.user_id,
                    userName: m.userName || m.user_name,
                    avatar: m.avatar,
                    content: m.content,
                    timestamp: m.timestamp || m.created_at,
                    readBy: m.read_by || m.readBy || []
                })),
                hasMore: response.hasMore || false
            };
        },
        sendMessage: async (channelId: string, userId: string, content: string, sender: User): Promise<ChatMessage> => {
            const response = await request<{ message: any }>('POST', \\\`/chat/channels/\\\${channelId}/messages\\\`, { content });
            const m = response.message;
            return {
                id: m.id,
                channelId: m.channelId || m.channel_id,
                userId: m.userId || m.user_id,
                userName: m.userName || m.user_name,
                avatar: m.avatar,
                content: m.content,
                timestamp: m.timestamp,
                readBy: m.read_by || m.readBy || []
            };
        },
        markRead: async (channelId: string, userId: string): Promise<void> => {
            await request('POST', \\\`/chat/channels/\\\${channelId}/read\\\`, {});
        },
        createDirectChannel: async (userId1: string, userId2: string): Promise<ChatChannel> => {
            const response = await request<any>('POST', '/chat/channels/direct', { user1: userId1, user2: userId2 });
            const ch = response.channel || response;
            return {
                id: ch.id,
                type: ch.type || 'DIRECT',
                name: ch.name || '',
                participants: Array.isArray(ch.participants) ? ch.participants : [],
                unreadCount: ch.unreadCount || ch.unread_count || 0
            };
        },
        createGroupChannel: async (name: string, participantIds: string[]): Promise<ChatChannel> => {
            const response = await request<any>('POST', '/chat/channels', {
                type: 'GROUP',
                name: name,
                participant_ids: participantIds
            });
            const ch = response.channel || response;
            return {
                id: ch.id,
                type: ch.type || 'GROUP',
                name: ch.name || name,
                participants: Array.isArray(ch.participants) ? ch.participants : participantIds,
                unreadCount: ch.unreadCount || ch.unread_count || 0
            };
        },
        getUsers: async (): Promise<User[]> => {
            try {
                const response = await request<{ users: any[] }>('GET', '/chat/users');
                return (response.users || []).map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    avatar: u.avatar,
                    department: u.department,
                    role: u.role,
                    username: u.username || '',
                    password: '', 
                    permissions: u.permissions || []
                }));
            } catch (error) {
                console.error('Failed to get chat users', error);
                return [];
            }
        },
        recallMessage: async (channelId: string, messageId: string): Promise<void> => {
            await request('POST', \\\`/chat/channels/\\\${channelId}/messages/\\\${messageId}/recall\\\`, {});
        },
        leaveChannel: async (channelId: string): Promise<void> => {
            await request('POST', \\\`/chat/channels/\\\${channelId}/leave\\\`, {});
        },
        editChannel: async (channelId: string, name: string, participantIds: string[]): Promise<ChatChannel> => {
            const response = await request<{ channel: any }>('PUT', \\\`/chat/channels/\\\${channelId}\\\`, {
                name: name,
                participant_ids: participantIds
            });
            const ch = response.channel;
            return {
                id: ch.id,
                type: ch.type,
                name: ch.name,
                participants: ch.participants,
                unreadCount: 0
            };
        }
    },
    performance: {
        getReviews: (period: string, userId?: string) => request<PerformanceReview[]>(\\\`GET\\\`, \\\`/performance/reviews?period=\\\${period}\\\${userId ? \\\`&userId=\\\${userId}\\\` : ''}\\\`),
        getUserStats: (userId: string, period: string) => request<ReviewMetrics>('GET', \\\`/performance/stats?userId=\\\${userId}&period=\\\${period}\\\`),
        saveReview: (review: PerformanceReview) => request<PerformanceReview>('POST', '/performance/reviews', review)
    },
    system: {
        resetFactoryDefault: () => request<void>('POST', '/system/reset'),
        exportData: () => request<string>('GET', '/system/export'),
        importData: (json: string) => request<boolean>('POST', '/system/import', { json }),
        getSettings: () => request<{menuGroups?: MenuGroup[]}>('GET', '/system/settings'),
        saveSettings: (settings: {menuGroups?: MenuGroup[]}) => request<void>('POST', '/system/settings', settings)
    },
    logs: {
        getAll: async (): Promise<SystemLog[]> => {
            try {
                const response = await request<{ logs: any[] }>('GET', '/system/logs');
                return (response.logs || []).map((l: any) => ({
                    id: l.id,
                    timestamp: l.timestamp,
                    userId: l.user_id || l.userId,
                    userName: l.user_name || l.userName,
                    action: l.action,
                    details: l.details,
                    level: l.level
                }));
            } catch (error) {
                console.error('Failed to get logs', error);
                return [];
            }
        }
    }
};

const MockApi = {
    auth: {
        login: async (username: string, password: string): Promise<User | undefined> => {
            await delay();
            const user = MOCK_DB.users.find(u => u.username === username);
            if (user) {
                // In mock mode, we might ignore password or check it if we had it stored safely. 
                // For simplicity, let's just log them in if user exists.
                const token = 'mock_token_' + Date.now();
                localStorage.setItem('auth_token', token);
                return user;
            }
            return undefined;
        },
        verify: async (): Promise<User | null> => {
            await delay();
            const token = localStorage.getItem('auth_token');
            if (!token) return null;
            return MOCK_DB.users.length > 0 ? MOCK_DB.users[0] : null;
        },
        setup: async (userData: any): Promise<User> => {
            await delay(1000);
            const adminUser: User = {
                ...userData,
                id: \\\`u-admin-\\\${Date.now()}\\\`,
                role: Role.BOSS,
                department: 'Management',
            };
            MOCK_DB.users.push(adminUser);
            saveToStorage();
            return adminUser;
        },
        logout: () => {
            localStorage.removeItem('auth_token');
        },
        checkSetup: async (): Promise<{ needsSetup: boolean; userCount: number }> => {
            await delay();
            return { needsSetup: MOCK_DB.users.length === 0, userCount: MOCK_DB.users.length };
        },
        changePassword: async (userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean }> => {
            await delay();
            return { success: true };
        }
    },
    users: {
        getAll: async (): Promise<User[]> => {
            await delay();
            return [...MOCK_DB.users];
        },
        create: async (user: User, operator?: User): Promise<User> => {
            await delay();
            MOCK_DB.users.push(user);
            saveToStorage();
            return user;
        },
        update: async (user: User, operator?: User): Promise<User> => {
            await delay();
            const idx = MOCK_DB.users.findIndex(u => u.id === user.id);
            if (idx !== -1) {
                MOCK_DB.users[idx] = user;
                saveToStorage();
            }
            return user;
        },
        delete: async (id: string, operator?: User): Promise<void> => {
            await delay();
            const user = MOCK_DB.users.find(u => u.id === id);
            MOCK_DB.users = MOCK_DB.users.filter(u => u.id !== id);
            saveToStorage();
        },
        updateAvatar: async (userId: string, avatar: string, operator?: User): Promise<{ avatar: string }> => {
            await delay();
            const user = MOCK_DB.users.find(u => u.id === userId);
            if (user) {
                user.avatar = avatar;
                saveToStorage();
                return { avatar };
            }
            throw new Error('User not found');
        }
    },
    departments: {
        getAll: async (): Promise<DepartmentDef[]> => {
            await delay();
            return [...MOCK_DB.departments];
        },
        create: async (dept: DepartmentDef, operator?: User): Promise<DepartmentDef> => {
            await delay();
            MOCK_DB.departments.push(dept);
            saveToStorage();
            return dept;
        },
        update: async (dept: DepartmentDef, operator?: User): Promise<DepartmentDef> => {
            await delay();
            const idx = MOCK_DB.departments.findIndex(d => d.id === dept.id);
            if (idx !== -1) {
                MOCK_DB.departments[idx] = dept;
                saveToStorage();
                return dept;
            }
            throw new Error('Department not found');
        },
        delete: async (id: string, operator?: User): Promise<void> => {
            await delay();
            MOCK_DB.departments = MOCK_DB.departments.filter(d => d.id !== id);
            saveToStorage();
        }
    },
    tasks: {
        getAll: async (): Promise<Task[]> => {
            await delay();
            return [...MOCK_DB.tasks];
        },
        create: async (task: Task): Promise<Task> => {
            await delay();
            MOCK_DB.tasks.unshift(task);
            saveToStorage();
            return task;
        },
        update: async (task: Task): Promise<Task> => {
            await delay();
            const idx = MOCK_DB.tasks.findIndex(t => t.id === task.id);
            if (idx !== -1) {
                MOCK_DB.tasks[idx] = task;
                saveToStorage();
            }
            return task;
        },
        updateProgress: async (id: string, updates: Partial<Task>): Promise<void> => {
             await delay();
             const idx = MOCK_DB.tasks.findIndex(t => t.id === id);
             if (idx !== -1) {
                 MOCK_DB.tasks[idx] = { ...MOCK_DB.tasks[idx], ...updates };
                 saveToStorage();
             }
        },
        delete: async (id: string): Promise<void> => {
            await delay();
            MOCK_DB.tasks = MOCK_DB.tasks.filter(t => t.id !== id);
            saveToStorage();
        },
        accept: async (id: string): Promise<Task> => {
            await delay();
            const idx = MOCK_DB.tasks.findIndex(t => t.id === id);
            if (idx !== -1) {
                MOCK_DB.tasks[idx] = { ...MOCK_DB.tasks[idx], status: 'IN_PROGRESS' as TaskStatus };
                saveToStorage();
                return MOCK_DB.tasks[idx];
            }
            throw new Error('Task not found');
        }
    },
    announcements: {
        getAll: async (): Promise<Announcement[]> => {
            await delay();
            return [...MOCK_DB.announcements];
        },
        create: async (ann: Announcement): Promise<Announcement> => {
            await delay();
            MOCK_DB.announcements.unshift(ann);
            saveToStorage();
            return ann;
        },
        markRead: async (id: string, userId: string): Promise<void> => {
            await delay();
            const ann = MOCK_DB.announcements.find(a => a.id === id);
            if (ann && !ann.readBy.includes(userId)) {
                ann.readBy.push(userId);
                saveToStorage();
            }
        }
    },
    reports: {
        getAll: async (): Promise<Report[]> => {
            await delay();
            return [...MOCK_DB.reports];
        },
        create: async (report: Report): Promise<Report> => {
            await delay();
            MOCK_DB.reports.unshift(report);
            saveToStorage();
            return report;
        },
        update: async (id: string, content: any): Promise<Report> => {
            await delay();
            const idx = MOCK_DB.reports.findIndex(r => r.id === id);
            if (idx !== -1) {
                MOCK_DB.reports[idx] = { ...MOCK_DB.reports[idx], content };
                saveToStorage();
                return MOCK_DB.reports[idx];
            }
            throw new Error('Report not found');
        },
        delete: async (id: string): Promise<void> => {
            await delay();
            MOCK_DB.reports = MOCK_DB.reports.filter(r => r.id !== id);
            saveToStorage();
        }
    },
    finance: {
        getAll: async (): Promise<FinanceRecord[]> => {
            await delay();
            return [...MOCK_DB.finance];
        },
        create: async (record: FinanceRecord): Promise<FinanceRecord> => {
            await delay();
            MOCK_DB.finance.unshift(record);
            saveToStorage();
            return record;
        },
        confirm: async (id: string): Promise<void> => {
            await delay();
            const rec = MOCK_DB.finance.find(r => r.id === id);
            if (rec) {
                rec.status = 'COMPLETED';
                saveToStorage();
            }
        },
        delete: async (id: string, operator?: User): Promise<void> => {
             await delay();
             MOCK_DB.finance = MOCK_DB.finance.filter(r => r.id !== id);
             saveToStorage();
        }
    },
    forum: {
        getAll: async (): Promise<Suggestion[]> => {
            await delay();
            return [...MOCK_DB.suggestions];
        },
        create: async (suggestion: Suggestion): Promise<Suggestion> => {
            await delay();
            MOCK_DB.suggestions.unshift(suggestion);
            saveToStorage();
            return suggestion;
        },
        update: async (suggestion: Suggestion): Promise<Suggestion> => {
            await delay();
            const idx = MOCK_DB.suggestions.findIndex(s => s.id === suggestion.id);
            if (idx !== -1) {
                MOCK_DB.suggestions[idx] = suggestion;
                saveToStorage();
            }
            return suggestion;
        },
        addComment: async (suggestionId: string, content: string, isOfficial: boolean): Promise<{ comment: any }> => {
            await delay();
            const suggestion = MOCK_DB.suggestions.find(s => s.id === suggestionId);
            if (suggestion) {
                const comment = {
                    id: \\\`c-\\\${Date.now()}\\\`,
                    userId: 'mock-user-id',
                    content,
                    createdAt: new Date().toISOString(),
                    isOfficialReply: isOfficial
                };
                // suggestion.comments.push(comment); // In a real mock this would work, but types need to match.
                // Simplified for Mock
                return { comment };
            }
            return { comment: null };
        }
    },
    memos: {
        getAll: async (userId: string): Promise<Memo[]> => {
            await delay();
            return MOCK_DB.memos.filter(m => m.userId === userId);
        },
        create: async (memo: Memo): Promise<Memo> => {
            await delay();
            MOCK_DB.memos.unshift(memo);
            saveToStorage();
            return memo;
        },
        update: async (memo: Memo): Promise<Memo> => {
            await delay();
            const idx = MOCK_DB.memos.findIndex(m => m.id === memo.id);
            if (idx !== -1) {
                MOCK_DB.memos[idx] = memo;
                saveToStorage();
            }
            return memo;
        },
        delete: async (id: string): Promise<void> => {
            await delay();
            MOCK_DB.memos = MOCK_DB.memos.filter(m => m.id !== id);
            saveToStorage();
        }
    },
    routines: {
        getTemplates: async (): Promise<RoutineTemplate[]> => {
            await delay();
            return [...MOCK_DB.routineTemplates];
        },
        saveTemplate: async (tpl: RoutineTemplate): Promise<RoutineTemplate> => {
            await delay();
            const idx = MOCK_DB.routineTemplates.findIndex(t => t.id === tpl.id);
            if (idx !== -1) {
                MOCK_DB.routineTemplates[idx] = tpl;
            } else {
                MOCK_DB.routineTemplates.push(tpl);
            }
            saveToStorage();
            return tpl;
        },
        deleteTemplate: async (id: string): Promise<void> => {
            await delay();
            MOCK_DB.routineTemplates = MOCK_DB.routineTemplates.filter(t => t.id !== id);
            saveToStorage();
        },
        markAsRead: async (userId: string, templateId: string): Promise<void> => {
            await delay();
            const tpl = MOCK_DB.routineTemplates.find(t => t.id === templateId);
            if (tpl) {
                if (!tpl.readBy) tpl.readBy = [];
                if (!tpl.readBy.includes(userId)) {
                    tpl.readBy.push(userId);
                    saveToStorage();
                }
            }
        },
        getTodayRecord: async (userId: string, deptId: string): Promise<RoutineRecord | null> => {
            await delay();
            // Simplified mock
            return null; 
        },
        getHistory: async (): Promise<RoutineRecord[]> => {
            await delay();
            return [];
        },
        toggleItem: async (recordId: string, index: number, isCompleted: boolean): Promise<void> => {
            await delay();
        }
    },
    attendance: {
        getTodayStatus: async (userId: string): Promise<AttendanceRecord | null> => {
            await delay();
            // Simplified
            return null;
        },
        getHistory: async (): Promise<AttendanceRecord[]> => {
            await delay();
            return [...MOCK_DB.attendance];
        },
        clockIn: async (userId: string): Promise<AttendanceRecord> => {
            await delay();
            const record: AttendanceRecord = {
                id: \\\`att-\\\${Date.now()}\\\`,
                userId,
                date: new Date().toISOString().split('T')[0],
                clockIn: new Date().toISOString(),
                status: 'ONLINE'
            };
            MOCK_DB.attendance.unshift(record);
            saveToStorage();
            return record;
        },
        clockOut: async (recordId: string): Promise<AttendanceRecord> => {
            await delay();
            const idx = MOCK_DB.attendance.findIndex(r => r.id === recordId);
            if (idx !== -1) {
                MOCK_DB.attendance[idx].clockOut = new Date().toISOString();
                MOCK_DB.attendance[idx].status = 'OFFLINE';
                // Calc duration...
                saveToStorage();
                return MOCK_DB.attendance[idx];
            }
            throw new Error('Record not found');
        }
    },
    chat: {
        getChannels: async (userId: string): Promise<ChatChannel[]> => {
            await delay();
            return [...MOCK_DB.chatChannels];
        },
        getMessages: async (channelId: string, options?: { limit?: number; before?: string; after?: string }): Promise<{ messages: ChatMessage[]; hasMore: boolean }> => {
            await delay();
            return { messages: [], hasMore: false };
        },
        sendMessage: async (channelId: string, userId: string, content: string, sender: User): Promise<ChatMessage> => {
            await delay();
            const msg: ChatMessage = {
                id: \\\`msg-\\\${Date.now()}\\\`,
                channelId,
                userId,
                userName: sender.name,
                avatar: sender.avatar,
                content,
                timestamp: new Date().toISOString(),
                readBy: [userId]
            };
            MOCK_DB.chatMessages.push(msg);
            saveToStorage();
            return msg;
        },
        markRead: async (channelId: string, userId: string): Promise<void> => {
            await delay();
        },
        createDirectChannel: async (userId1: string, userId2: string): Promise<ChatChannel> => {
            await delay();
            const ch: ChatChannel = {
                id: \\\`ch-d-\\\${Date.now()}\\\`,
                type: 'DIRECT',
                participants: [userId1, userId2],
                unreadCount: 0
            };
            MOCK_DB.chatChannels.push(ch);
            saveToStorage();
            return ch;
        },
        createGroupChannel: async (name: string, participantIds: string[]): Promise<ChatChannel> => {
            await delay();
            const ch: ChatChannel = {
                id: \\\`ch-g-\\\${Date.now()}\\\`,
                type: 'GROUP',
                name,
                participants: participantIds,
                unreadCount: 0
            };
            MOCK_DB.chatChannels.push(ch);
            saveToStorage();
            return ch;
        },
        getUsers: async (): Promise<User[]> => {
            await delay();
            return [...MOCK_DB.users];
        },
        recallMessage: async (channelId: string, messageId: string): Promise<void> => {
            await delay();
        },
        leaveChannel: async (channelId: string): Promise<void> => {
            await delay();
        },
        editChannel: async (channelId: string, name: string, participantIds: string[]): Promise<ChatChannel> => {
            await delay();
            const idx = MOCK_DB.chatChannels.findIndex(c => c.id === channelId);
            if (idx !== -1) {
                MOCK_DB.chatChannels[idx] = { ...MOCK_DB.chatChannels[idx], name, participants: participantIds };
                saveToStorage();
                return MOCK_DB.chatChannels[idx];
            }
            throw new Error('Channel not found');
        }
    },
    performance: {
        getReviews: async (period: string, userId?: string): Promise<PerformanceReview[]> => {
            await delay();
            if (userId) return MOCK_DB.performance.filter(r => r.period === period && r.targetUserId === userId);
            return MOCK_DB.performance.filter(r => r.period === period);
        },
        getUserStats: async (userId: string, period: string): Promise<ReviewMetrics> => {
            await delay();
            return { taskCompletionRate: 85, sopCompletionRate: 90, attendanceRate: 100 };
        },
        saveReview: async (review: PerformanceReview): Promise<PerformanceReview> => {
            await delay();
            const idx = MOCK_DB.performance.findIndex(r => r.id === review.id);
            if (idx !== -1) {
                MOCK_DB.performance[idx] = review;
            } else {
                MOCK_DB.performance.push(review);
            }
            saveToStorage();
            return review;
        }
    },
    system: {
        resetFactoryDefault: async (): Promise<void> => {
            await delay(1000);
            localStorage.removeItem(STORAGE_KEY);
            // Reset in-memory
            MOCK_DB.users = [];
            // ... reset others
        },
        exportData: async (): Promise<string> => {
            await delay();
            return JSON.stringify(MOCK_DB);
        },
        importData: async (json: string): Promise<boolean> => {
            await delay();
            try {
                const data = JSON.parse(json);
                // Validate...
                Object.assign(MOCK_DB, data);
                saveToStorage();
                return true;
            } catch (e) {
                return false;
            }
        },
        getSettings: async (): Promise<{menuGroups?: MenuGroup[]}> => {
            await delay();
            return MOCK_DB.settings;
        },
        saveSettings: async (settings: {menuGroups?: MenuGroup[]}): Promise<void> => {
            await delay();
            if (settings.menuGroups) MOCK_DB.settings.menuGroups = settings.menuGroups;
            saveToStorage();
        }
    },
    logs: {
        getAll: async (): Promise<SystemLog[]> => {
            await delay();
            return [...MOCK_DB.logs];
        }
    }
};

export const api = USE_MOCK_API ? MockApi : RealApi;
`;

try {
    fs.writeFileSync(path.join(rootDir, 'services', 'api.ts'), apiContent);
    console.log('Successfully wrote services/api.ts');
} catch (err) {
    console.error('Error writing services/api.ts:', err);
}

// --- components/ReportView.tsx ---
const reportViewContent = \`
import React, { useState, useEffect } from 'react';
import { User, Report, ReportType, DailyReportContent } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface ReportViewProps {
  currentUser: User;
  users: User[];
  onCreateReport: (content: DailyReportContent, type: ReportType) => Promise<void>;
}

export const ReportView: React.FC<ReportViewProps> = ({ currentUser, users, onCreateReport }) => {
  const toast = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  
  // Edit State
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editContent, setEditContent] = useState<DailyReportContent | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.reports.getAll();
      // Sort by date desc
      setReports(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to load reports', error);
      toast.error('載入報表失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (report: Report) => {
      setEditingReport(report);
      setEditContent(report.content);
  };

  const handleSaveEdit = async () => {
      if (!editingReport || !editContent) return;
      try {
          await api.reports.update(editingReport.id, editContent);
          setReports(reports.map(r => r.id === editingReport.id ? { ...r, content: editContent } : r));
          setEditingReport(null);
          setEditContent(null);
          toast.success('報表已更新');
      } catch (error) {
          console.error('Failed to update report', error);
          toast.error('更新失敗');
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm('確定要刪除此報表嗎？')) return;
      try {
          await api.reports.delete(id);
          setReports(reports.filter(r => r.id !== id));
          toast.success('報表已刪除');
      } catch (error) {
          console.error('Failed to delete report', error);
          toast.error('刪除失敗');
      }
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
        <div className="flex justify-between items-end border-b border-slate-200 pb-4">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span>📝</span> 工作報表中心
                </h2>
                <p className="text-slate-500 text-sm mt-1">查看與管理每日營運報表</p>
            </div>
        </div>

        {loading ? (
            <div className="p-8 text-center text-slate-400">載入中...</div>
        ) : (
            <div className="space-y-4">
                {reports.length === 0 && (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        尚無報表紀錄
                    </div>
                )}
                
                {reports.slice(0, visibleCount).map(report => (
                    <div key={report.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
                        {/* Report Header */}
                        <div 
                            className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition"
                            onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                    {getUserName(report.userId).charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        {report.createdAt} 日報
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-normal">
                                            {getUserName(report.userId)}
                                        </span>
                                    </h3>
                                    <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                        <span>淨入: <span className={report.content.netIncome >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{formatCurrency(report.content.netIncome)}</span></span>
                                        <span>•</span>
                                        <span>LINE: {report.content.lineLeads}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-slate-400">
                                {expandedReportId === report.id ? '▲' : '▼'}
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {(expandedReportId === report.id || editingReport?.id === report.id) && (
                            <div className="p-6 animate-fade-in">
                                {editingReport?.id === report.id ? (
                                    // Edit Mode
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">LINE 導入數</label>
                                                <input 
                                                    type="number"
                                                    value={editContent?.lineLeads}
                                                    onChange={e => setEditContent({...editContent!, lineLeads: Number(e.target.value)})}
                                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">註冊數</label>
                                                <input 
                                                    type="number"
                                                    value={editContent?.registrations}
                                                    onChange={e => setEditContent({...editContent!, registrations: Number(e.target.value)})}
                                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">充值金額</label>
                                                <input 
                                                    type="number"
                                                    value={editContent?.depositAmount}
                                                    onChange={e => setEditContent({...editContent!, depositAmount: Number(e.target.value)})}
                                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">提現金額</label>
                                                <input 
                                                    type="number"
                                                    value={editContent?.withdrawalAmount}
                                                    onChange={e => setEditContent({...editContent!, withdrawalAmount: Number(e.target.value)})}
                                                    className="w-full p-2 border border-slate-300 rounded-lg"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 block mb-1">備註 / 說明</label>
                                            <textarea 
                                                value={editContent?.notes}
                                                onChange={e => setEditContent({...editContent!, notes: e.target.value})}
                                                className="w-full p-2 border border-slate-300 rounded-lg h-24"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button 
                                                onClick={() => setEditingReport(null)}
                                                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                                            >
                                                取消
                                            </button>
                                            <button 
                                                onClick={handleSaveEdit}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                儲存變更
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // View Mode
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="text-xs text-slate-400">LINE 導入</div>
                                                <div className="text-xl font-bold text-slate-700">{report.content.lineLeads}</div>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="text-xs text-slate-400">註冊人數</div>
                                                <div className="text-xl font-bold text-slate-700">{report.content.registrations}</div>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="text-xs text-slate-400">首充人數</div>
                                                <div className="text-xl font-bold text-slate-700">{report.content.firstDeposits}</div>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="text-xs text-slate-400">淨入金額</div>
                                                <div className={\\\`text-xl font-bold \\\${report.content.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}\\\`}>
                                                    {formatCurrency(report.content.netIncome)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">財務明細</h4>
                                            <div className="flex gap-6 text-sm">
                                                <span className="text-slate-500">充值: <span className="text-slate-800 font-medium">{formatCurrency(report.content.depositAmount)}</span></span>
                                                <span className="text-slate-500">提現: <span className="text-slate-800 font-medium">{formatCurrency(report.content.withdrawalAmount)}</span></span>
                                            </div>
                                        </div>

                                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-sm text-slate-700 whitespace-pre-wrap">
                                            <h4 className="font-bold text-amber-700 mb-1">備註事項</h4>
                                            {report.content.notes || "無備註"}
                                        </div>

                                        {report.userId === currentUser.id && (
                                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                                <button 
                                                    onClick={() => handleEditClick(report)}
                                                    className="text-sm text-blue-600 hover:underline font-bold"
                                                >
                                                    編輯報表
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(report.id)}
                                                    className="text-sm text-red-500 hover:underline font-bold"
                                                >
                                                    刪除
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {reports.length > visibleCount && (
                    <button 
                        onClick={() => setVisibleCount(prev => prev + 5)}
                        className="w-full py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-slate-200"
                    >
                        載入更多
                    </button>
                )}
            </div>
        )}
    </div>
  );
};
\`;

try {
    fs.writeFileSync(path.join(rootDir, 'components', 'ReportView.tsx'), reportViewContent);
    console.log('Successfully wrote components/ReportView.tsx');
} catch (err) {
    console.error('Error writing components/ReportView.tsx:', err);
}

try {
    fs.writeFileSync(path.join(rootDir, 'types.ts'), typesContent);
    console.log('Successfully wrote types.ts');
} catch (err) {
    console.error('Error writing types.ts:', err);
}

try {
    fs.writeFileSync(path.join(rootDir, 'utils', 'websocketClient.ts'), wsContent);
    console.log('Successfully wrote utils/websocketClient.ts');
} catch (err) {
    console.error('Error writing utils/websocketClient.ts:', err);
}
