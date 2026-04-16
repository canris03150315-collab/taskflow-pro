import { 
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
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const request = async <T>(method: string, endpoint: string, body?: any): Promise<T> => {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers: getAuthHeaders(),
            body: body ? JSON.stringify(body) : undefined,
        });
        
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        
        if (!response.ok) {
            const errorMessage = data.error || `API Error: ${response.statusText}`;
            const err = new Error(errorMessage);
            (err as any).status = response.status;
            throw err;
        }

        return data;
    } catch (error) {
        // Suppress console noise for 403 (expected for EMPLOYEE role on restricted endpoints)
        if (!((error as any).status === 403)) {
            console.error(`Request failed: ${method} ${endpoint}`, error);
        }
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
        changePassword: (userId: string, currentPassword: string, newPassword: string) => request<{ success: boolean }>('POST', `/users/${userId}/change-password`, { currentPassword, newPassword })
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
                // 403 is expected for EMPLOYEE role — silently return empty
                if ((error as any).status !== 403) {
                    console.error('Failed to get users', error);
                }
                return [];
            }
        },
        create: async (user: User) => {
            const response = await request<{ user: User, message: string }>('POST', '/users', user);
            return response.user;
        },
        update: (user: User) => request<User>('PUT', `/users/${user.id}`, user),
        getById: async (id: string): Promise<User | null> => {
            try {
                const response = await request<any>('GET', `/users/${id}`);
                return response ? { ...response, password: response.password || '', permissions: response.permissions || [] } : null;
            } catch (error) {
                console.error('Failed to get user by id', error);
                return null;
            }
        },
        delete: (id: string) => request<void>('DELETE', `/users/${id}`),
        updateAvatar: async (userId: string, avatar: string) => {
            return await request<{ avatar: string, message: string }>('POST', `/users/${userId}/avatar`, { avatar });
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
            const response = await request<{ department: DepartmentDef, message: string }>('PUT', `/departments/${dept.id}`, dept);
            return response.department;
        },
        delete: (id: string) => request<void>('DELETE', `/departments/${id}`)
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
        update: (task: Task) => request<Task>('PUT', `/tasks/${task.id}`, task),
        updateProgress: (id: string, updates: Partial<Task>) => request<void>('PATCH', `/tasks/${id}`, updates),
        accept: (id: string) => request<{ task: any }>('POST', `/tasks/${id}/accept`, {}),
        delete: (id: string) => request<void>('DELETE', `/tasks/${id}`)
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
        update: (id: string, ann: Partial<Announcement>) => request<Announcement>('PUT', `/announcements/${id}`, ann),
        delete: (id: string) => request<void>('DELETE', `/announcements/${id}`),
        markRead: (id: string, userId: string) => request<void>('POST', `/announcements/${id}/read`, { userId })
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
        update: (id: string, content: any) => request<Report>('PUT', `/reports/${id}`, { content }),
        delete: (id: string) => request<void>('DELETE', `/reports/${id}`),
        approval: {
            checkStatus: async (authId: string): Promise<{ isAuthorized: boolean; authorization: any | null }> => {
                try {
                    return await request<{ isAuthorized: boolean; authorization: any | null }>('GET', '/reports/approval/status');
                } catch (error) {
                    console.error('Failed to check approval status', error);
                    return { isAuthorized: false, authorization: null };
                }
            },
            getPending: async (): Promise<{ pending: any[] }> => {
                try {
                    return await request<{ pending: any[] }>('GET', '/reports/approval/pending');
                } catch (error) {
                    console.error('Failed to get pending approvals', error);
                    return { pending: [] };
                }
            },
            revoke: async (authId: string | undefined): Promise<void> => {
                return request<void>('POST', `/reports/approval/revoke`, { authorizationId: authId });
            },
            getAuditLog: async (params: { action?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }): Promise<{ logs: any[]; total: number }> => {
                try {
                    const query = new URLSearchParams();
                    if (params.action && params.action !== 'ALL') query.append('action', params.action);
                    if (params.startDate) query.append('startDate', params.startDate);
                    if (params.endDate) query.append('endDate', params.endDate);
                    if (params.limit) query.append('limit', params.limit.toString());
                    if (params.offset) query.append('offset', params.offset.toString());
                    const qs = query.toString();
                    return await request<{ logs: any[]; total: number }>('GET', `/reports/approval/audit-log${qs ? '?' + qs : ''}`);
                } catch (error) {
                    console.error('Failed to get audit log', error);
                    return { logs: [], total: 0 };
                }
            }
        }
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
        confirm: (id: string) => request<void>('POST', `/finance/${id}/confirm`),
        delete: (id: string) => request<void>('DELETE', `/finance/${id}`)
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
        update: (sug: Suggestion) => request<Suggestion>('PUT', `/forum/${sug.id}`, sug),
        addComment: (suggestionId: string, content: string, isOfficial: boolean) => 
            request<{ comment: any }>('POST', `/forum/${suggestionId}/comments`, { content, is_official: isOfficial })
    },
    memos: {
        getAll: async (userId: string): Promise<Memo[]> => {
            try {
                const response = await request<{ memos: any[] }>('GET', `/memos`);
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
        update: (memo: Memo) => request<Memo>('PUT', `/memos/${memo.id}`, memo),
        delete: (id: string) => request<void>('DELETE', `/memos/${id}`)
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
            try {
                const response = await request<{ today: { record: any } }>('GET', `/attendance/status`);
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
            const response = await request<{ records: any[] }>('GET', `/attendance`);
            return (response.records || []).map((r: any) => ({
                id: r.id,
                userId: r.user_id,
                date: r.date,
                clockIn: r.clock_in,
                clockOut: r.clock_out,
                durationMinutes: r.duration_minutes,
                status: r.status,
                isManual: Boolean(r.is_manual),
                manualReason: r.manual_reason || null,
                manualBy: r.manual_by || null,
                manualAt: r.manual_at || null
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
        },
        manualEntry: async (userId: string, date: string, clockIn: string, clockOut: string, reason: string): Promise<any> => {
            const response = await request<{ success: boolean; mode: string; record: any }>('POST', '/attendance/manual', {
                userId,
                date,
                clockIn,
                clockOut,
                reason
            });
            return response;
        },
        updateManualEntry: async (id: string, clockIn: string, clockOut: string, reason: string): Promise<any> => {
            const response = await request<{ success: boolean; record: any }>('PUT', `/attendance/manual/${id}`, {
                clockIn,
                clockOut,
                reason
            });
            return response;
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
            const response = await request<{ messages: any[]; hasMore?: boolean }>('GET', `/chat/channels/${channelId}/messages${queryString ? `?${queryString}` : ''}`);
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
            const response = await request<{ message: any }>('POST', `/chat/channels/${channelId}/messages`, { content });
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
            await request('POST', `/chat/channels/${channelId}/read`, {});
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
            await request('POST', `/chat/channels/${channelId}/messages/${messageId}/recall`, {});
        },
        leaveChannel: async (channelId: string): Promise<void> => {
            await request('POST', `/chat/channels/${channelId}/leave`, {});
        },
        editChannel: async (channelId: string, name: string, participantIds: string[]): Promise<ChatChannel> => {
            const response = await request<{ channel: any }>('PUT', `/chat/channels/${channelId}`, {
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
        getReviews: async (period: string, userId?: string): Promise<PerformanceReview[]> => {
            let endpoint = `/performance/reviews?period=${encodeURIComponent(period)}`;
            if (userId) endpoint += `&userId=${encodeURIComponent(userId)}`;
            return await request<PerformanceReview[]>('GET', endpoint);
        },
        getUserStats: async (userId: string, period: string): Promise<ReviewMetrics> => {
            await delay();
            return { taskCompletionRate: 85, sopCompletionRate: 90, attendanceRate: 100 };
        },
        saveReview: async (review: PerformanceReview): Promise<PerformanceReview> => {
            return await request<PerformanceReview>('POST', '/performance/reviews', review);
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
        },
        downloadBackup: async (): Promise<void> => {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_BASE_URL}/system/backup/download`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '下載備份失敗');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${new Date().toISOString().slice(0,10)}.db`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        },
        uploadBackup: async (file: File): Promise<void> => {
            const token = localStorage.getItem('auth_token');
            const formData = new FormData();
            formData.append('backup', file);
            const response = await fetch(`${API_BASE_URL}/system/backup/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '上傳備份失敗');
            }
        }
    },
    logs: {
        getAll: async (): Promise<SystemLog[]> => {
            await delay();
            return [...MOCK_DB.logs];
        }
    },
    leaves: {
        getAll: async (): Promise<any[]> => {
            try {
                const response = await request<any[] | { leaves: any[] }>('GET', '/leaves');
                return Array.isArray(response) ? response : (response.leaves || []);
            } catch (error) {
                console.error('Failed to get leaves', error);
                return [];
            }
        },
        create: async (data: any) => request<any>('POST', '/leaves', data),
        update: async (id: string, data: any) => request<any>('PUT', `/leaves/${id}`, data),
        delete: async (id: string) => request<void>('DELETE', `/leaves/${id}`),
        approve: async (id: string, data?: any) => request<any>('POST', `/leaves/${id}/approve`, data || {}),
        reject: async (id: string, data?: any) => request<any>('POST', `/leaves/${id}/reject`, data || {})
    },
    schedules: {
        getAll: async (): Promise<any[]> => {
            try {
                const response = await request<any[] | { schedules: any[] }>('GET', '/schedules');
                return Array.isArray(response) ? response : (response.schedules || []);
            } catch (error) {
                console.error('Failed to get schedules', error);
                return [];
            }
        },
        submit: async (data: any) => request<any>('POST', '/schedules', data),
        update: async (id: string, data: any) => request<any>('PUT', `/schedules/${id}`, data),
        delete: async (id: string) => request<void>('DELETE', `/schedules/${id}`),
        approve: async (id: string, data: any) => request<any>('POST', `/schedules/${id}/approve`, data),
        reject: async (id: string, data: any) => request<any>('POST', `/schedules/${id}/reject`, data),
        getRules: async (departmentId: string): Promise<any> => {
            try {
                return await request<any>('GET', `/schedules/rules/${departmentId}`);
            } catch (error) {
                console.error('Failed to get schedule rules', error);
                return null;
            }
        },
        updateRules: async (departmentId: string, rules: any) => request<any>('PUT', `/schedules/rules/${departmentId}`, rules)
    },
    workLogs: {
        getAll: async (params?: any): Promise<any> => {
            try {
                const query = params ? '?' + new URLSearchParams(params).toString() : '';
                const response = await request<any>('GET', `/work-logs${query}`);
                return response;
            } catch (error) {
                console.error('Failed to get work logs', error);
                return [];
            }
        },
        create: async (data: { date: string; todayTasks: string; tomorrowTasks: string; notes?: string; specialNotes?: string }) => {
            return request<any>('POST', '/work-logs', {
                date: data.date,
                todayTasks: data.todayTasks,
                tomorrowTasks: data.tomorrowTasks,
                notes: data.notes || data.specialNotes || ''
            });
        },
        update: async (id: string, data: { todayTasks: string; tomorrowTasks: string; notes?: string; specialNotes?: string }) => {
            return request<any>('PUT', `/work-logs/${id}`, {
                todayTasks: data.todayTasks,
                tomorrowTasks: data.tomorrowTasks,
                notes: data.notes || data.specialNotes || ''
            });
        },
        delete: async (id: string) => request<void>('DELETE', `/work-logs/${id}`)
    },
    platformAccounts: {
        uploadPreview: async (file: File, yearMonth: string): Promise<any> => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('yearMonth', yearMonth);
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${API_BASE_URL}/platform-accounts/upload-preview`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || res.statusText); }
            return res.json();
        },
        uploadConfirm: async (pendingData: string, fileName: string): Promise<any> => {
            return request<any>('POST', '/platform-accounts/upload-confirm', { pendingData, fileName });
        },
        getRecords: async (params: { month?: string; platform?: string; startDate?: string; endDate?: string }): Promise<any> => {
            const qs = new URLSearchParams(params as any).toString();
            return request<any>('GET', `/platform-accounts/records?${qs}`);
        },
        getPlatforms: async (): Promise<any> => {
            return request<any>('GET', '/platform-accounts/platforms');
        },
        getSummary: async (month: string): Promise<any> => {
            return request<any>('GET', `/platform-accounts/summary?month=${month}`);
        },
        getGrandTotal: async (month: string): Promise<any> => {
            return request<any>('GET', `/platform-accounts/grand-total?month=${month}`);
        },
        getUploadHistory: async (): Promise<any> => {
            return request<any>('GET', '/platform-accounts/upload-history');
        },
        deleteMonth: async (month: string): Promise<any> => {
            return request<any>('DELETE', `/platform-accounts/records/${month}`);
        },
        getVersions: async (month: string): Promise<any> => {
            return request<any>('GET', `/platform-accounts/versions?month=${month}`);
        },
        getDiff: async (batchA: string, batchB: string): Promise<any> => {
            return request<any>('GET', `/platform-accounts/diff?batchA=${batchA}&batchB=${batchB}`);
        }
    },
    kol: {
        getProfiles: async (params?: { status?: string; search?: string; departmentId?: string }): Promise<{ profiles: any[] }> => {
            const qs = new URLSearchParams(Object.entries(params || {}).filter(([_, v]) => v !== undefined) as [string, string][]).toString();
            return request<{ profiles: any[] }>('GET', `/kol/profiles${qs ? '?' + qs : ''}`);
        },
        getStats: async (params?: { departmentId?: string }): Promise<any> => {
            const qs = new URLSearchParams(Object.entries(params || {}).filter(([_, v]) => v !== undefined) as [string, string][]).toString();
            return request<any>('GET', `/kol/stats${qs ? '?' + qs : ''}`);
        },
        createProfile: async (data: any): Promise<any> => {
            return request<any>('POST', '/kol/profiles', data);
        },
        updateProfile: async (id: string, data: any): Promise<any> => {
            return request<any>('PUT', `/kol/profiles/${id}`, data);
        },
        deleteProfile: async (id: string): Promise<void> => {
            return request<void>('DELETE', `/kol/profiles/${id}`);
        },
        getKolPayments: async (kolId: string, params?: { startDate?: string; endDate?: string }): Promise<{ payments: any[]; total: number }> => {
            const qs = new URLSearchParams(Object.entries(params || {}).filter(([_, v]) => v !== undefined) as [string, string][]).toString();
            return request<{ payments: any[]; total: number }>('GET', `/kol/profiles/${kolId}/payments${qs ? '?' + qs : ''}`);
        },
        createKolPayment: async (data: { kolId: string; amount: number; paymentDate: string; notes?: string }): Promise<any> => {
            return request<any>('POST', `/kol/profiles/${data.kolId}/payments`, data);
        },
        updateKolPayment: async (paymentId: string, data: any): Promise<any> => {
            return request<any>('PUT', `/kol/payments/${paymentId}`, data);
        },
        deleteKolPayment: async (paymentId: string): Promise<void> => {
            return request<void>('DELETE', `/kol/payments/${paymentId}`);
        },
        getPaymentStats: async (params?: any): Promise<any> => {
            const qs = new URLSearchParams(Object.entries(params || {}).filter(([_, v]) => v !== undefined) as [string, string][]).toString();
            return request<any>('GET', `/kol/payment-stats${qs ? '?' + qs : ''}`);
        },
        importExcel: async (data: any[]): Promise<any> => {
            return request<any>('POST', '/kol/import', { profiles: data });
        },
        exportExcel: async (): Promise<{ profiles: any[] }> => {
            return request<{ profiles: any[] }>('GET', '/kol/export');
        }
    },
    aiAssistant: {
        getConversations: async (): Promise<{ conversations: any[] }> => {
            return request<{ conversations: any[] }>('GET', '/ai-assistant/conversations');
        },
        sendQuery: async (message: string): Promise<any> => {
            const isCentral = (import.meta as any).env?.VITE_INSTANCE_MODE === 'central';
            return request<any>('POST', isCentral ? '/central/super-ai/query' : '/ai-assistant/query', { message });
        },
        confirmAction: async (pendingActionId: string): Promise<any> => {
            const isCentral = (import.meta as any).env?.VITE_INSTANCE_MODE === 'central';
            return request<any>('POST', isCentral ? '/central/super-ai/confirm' : '/ai-assistant/confirm', { pendingActionId });
        },
        cancelAction: async (pendingActionId: string): Promise<any> => {
            const isCentral = (import.meta as any).env?.VITE_INSTANCE_MODE === 'central';
            return request<any>('POST', isCentral ? '/central/super-ai/cancel' : '/ai-assistant/cancel', { pendingActionId });
        },
        getAlerts: async (): Promise<{ alerts: any[] }> => {
            const isCentral = (import.meta as any).env?.VITE_INSTANCE_MODE === 'central';
            return request<{ alerts: any[] }>('GET', isCentral ? '/central/super-ai/alerts' : '/ai-assistant/alerts');
        },
        getMemory: async (): Promise<{ memory: any[] }> => {
            return request<{ memory: any[] }>('GET', '/ai-assistant/memory');
        },
        deleteMemory: async (key: string): Promise<void> => {
            return request<void>('DELETE', `/ai-assistant/memory/${key}`);
        },
        generateReport: async (params: any): Promise<any> => {
            return request<any>('POST', '/ai-assistant/generate-report', params);
        },
        deleteConversation: async (id: string): Promise<void> => {
            return request<void>('DELETE', `/ai-assistant/conversations/${id}`);
        },
        clearConversations: async (): Promise<void> => {
            return request<void>('DELETE', '/ai-assistant/conversations');
        }
    }
};

const MockApi = RealApi;

export const api = USE_MOCK_API ? MockApi : RealApi;
