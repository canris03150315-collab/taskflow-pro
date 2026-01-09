import { 
  User, Role, DepartmentDef, DEFAULT_DEPARTMENTS, Task, Announcement, 
  Report, FinanceRecord, Suggestion, Memo, RoutineTemplate, AttendanceRecord, 
  SystemLog, PerformanceReview, ChatChannel, ChatMessage, TaskStatus, Urgency,
  MenuItemId, DEFAULT_MENU_GROUPS, MenuGroup, RoutineRecord, ReviewMetrics, WorkLog
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

const request = async <T>(method: string, endpoint: string, body?: any): Promise<T> => {
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
            throw new Error(errorMessage);
        }
        
        return data;
    } catch (error) {
        console.error(`Request failed: ${method} ${endpoint}`, error);
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
                console.error('Failed to get users', error);
                return [];
            }
        },
        create: async (user: User) => {
            const response = await request<{ user: User, message: string }>('POST', '/users', user);
            return response.user;
        },
        update: async (user: User) => {
            const response = await request<{ user: User, message: string }>('PUT', `/users/${user.id}`, user);
            return response.user;
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
            // 獲取所有任務（包含封存的），前端自己篩選
            const [normalResponse, archivedResponse] = await Promise.all([
                request<{ tasks: any[], pagination?: any }>('GET', '/tasks?is_archived=false'),
                request<{ tasks: any[], pagination?: any }>('GET', '/tasks?is_archived=true')
            ]);
            
            const allTasks = [...(normalResponse.tasks || []), ...(archivedResponse.tasks || [])];
            
            console.log('[API] getAll 原始後端數據:', {
                normalTasksLength: normalResponse.tasks?.length || 0,
                archivedTasksLength: archivedResponse.tasks?.length || 0,
                totalTasks: allTasks.length
            });
            
            const response = { tasks: allTasks };
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
                timeline: (task.timeline || []).map((entry: any) => ({
                    userId: entry.user_id,
                    content: entry.content,
                    timestamp: entry.timestamp,
                    progress: entry.progress
                })),
                unreadUpdatesForUserIds: task.unread_updates_for_user_ids || []
            }));
        },
        getById: async (id: string): Promise<Task> => {
            const task = await request<any>('GET', `/tasks/${id}`);
            console.log('[API] getById 原始後端數據:', {
                taskId: task.id,
                hasTimeline: !!task.timeline,
                timelineLength: task.timeline?.length || 0,
                timelineRaw: task.timeline
            });
            
            const transformedTimeline = (task.timeline || []).map((entry: any) => {
                console.log('[API] 轉換 timeline entry:', {
                    原始: entry,
                    轉換後: {
                        userId: entry.user_id,
                        content: entry.content,
                        timestamp: entry.timestamp,
                        progress: entry.progress
                    }
                });
                return {
                    userId: entry.user_id,
                    content: entry.content,
                    timestamp: entry.timestamp,
                    progress: entry.progress
                };
            });
            
            console.log('[API] getById 轉換後 timeline:', transformedTimeline);
            
            return {
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
                timeline: transformedTimeline,
                unreadUpdatesForUserIds: task.unread_updates_for_user_ids || []
            };
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
                    createdAt: a.created_at || a.createdAt,
                    createdBy: a.createdBy || a.created_by
                }));
            } catch (error) {
                console.error('Failed to get announcements', error);
                return [];
            }
        },
        create: (ann: Announcement) => {
            console.log('[API] Creating announcement with data:', ann);
            console.log('[API] Images in request:', ann.images);
            return request<Announcement>('POST', '/announcements', ann);
        },
        update: async (id: string, data: Partial<Announcement>): Promise<Announcement> => {
            const response = await request<any>('PUT', `/announcements/${id}`, data);
            return {
                ...response,
                readBy: response.read_by || response.readBy || [],
                createdAt: response.created_at || response.createdAt,
                createdBy: response.createdBy || response.created_by
            };
        },
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
        create: async (report: Report): Promise<Report> => {
            const response = await request<{ report: Report }>('POST', '/reports', report);
            return response.report || response as any;
        },
        update: (id: string, content: any) => request<Report>('PUT', `/reports/${id}`, { content }),
        delete: (id: string) => request<void>('DELETE', `/reports/${id}`),
        
        // Approval APIs
        approval: {
            request: async (approverId: string, reason: string) => {
                return request<{ success: boolean; authorizationId: string; message: string }>(
                    'POST', 
                    '/reports/approval/request', 
                    { approverId, reason }
                );
            },
            approve: async (authorizationId: string, reason: string) => {
                return request<{ success: boolean; message: string; requesterName: string }>(
                    'POST', 
                    '/reports/approval/approve', 
                    { authorizationId, reason }
                );
            },
            reject: async (authorizationId: string, reason: string) => {
                return request<{ success: boolean; message: string; requesterName: string; rejectReason: string }>(
                    'POST', 
                    '/reports/approval/reject', 
                    { authorizationId, reason }
                );
            },
            checkStatus: async (sessionId: string) => {
                const headers = {
                    ...getAuthHeaders(),
                    'x-session-id': sessionId
                };
                const response = await fetch(`${API_BASE_URL}/reports/approval/status`, {
                    method: 'GET',
                    headers
                });
                const data = await response.json();
                return data;
            },
            getEligibleApprovers: async () => {
                return request<{ success: boolean; approvers: any[] }>(
                    'GET', 
                    '/reports/approval/eligible-approvers'
                );
            },
            getPending: async () => {
                return request<{ success: boolean; pending: any[] }>(
                    'GET', 
                    '/reports/approval/pending'
                );
            },
            revoke: async (authorizationId?: string) => {
                return request<{ success: boolean; message: string }>(
                    'POST', 
                    '/reports/approval/revoke', 
                    { authorizationId }
                );
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
            try {
                const response = await request<{ templates: any[] }>('GET', '/routines/templates');
                return (response.templates || []).map((t: any) => ({
                    ...t,
                    departmentId: t.departmentId || t.department_id,
                    lastUpdated: t.lastUpdated || t.last_updated,
                    isDaily: t.isDaily || t.is_daily,
                    readBy: t.readBy || t.read_by || []
                }));
            } catch (error) {
                console.error('Failed to get routine templates', error);
                return [];
            }
        },
        saveTemplate: async (tpl: RoutineTemplate): Promise<RoutineTemplate> => {
            const response = await request<RoutineTemplate>('POST', '/routines/templates', tpl);
            return response;
        },
        deleteTemplate: async (id: string): Promise<void> => {
            await request<void>('DELETE', `/routines/templates/${id}`);
        },
        markAsRead: async (userId: string, templateId: string): Promise<void> => {
            await request<void>('POST', `/routines/templates/${templateId}/read`, { userId });
        },
        getTodayRecord: async (userId: string, deptId: string): Promise<RoutineRecord | null> => {
            try {
                const response = await request<RoutineRecord | null>('GET', '/routines/today');
                return response;
            } catch (error) {
                console.error('Failed to get today record', error);
                return null;
            }
        },
        getHistory: async (): Promise<RoutineRecord[]> => {
            try {
                const response = await request<{ records: RoutineRecord[] }>('GET', '/routines/history');
                return response.records || [];
            } catch (error) {
                console.error('Failed to get routine history', error);
                return [];
            }
        },
        toggleItem: async (recordId: string, index: number, isCompleted: boolean): Promise<void> => {
            await request<void>('POST', `/routines/records/${recordId}/toggle`, { index, isCompleted });
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
        manualEntry: async (userId: string, date: string, clockIn: string, clockOut: string, reason: string): Promise<void> => {
            await request<{ success: boolean }>('POST', '/attendance/manual', {
                userId,
                date,
                clockIn,
                clockOut,
                reason
            });
        },
        updateManualEntry: async (id: string, clockIn: string, clockOut: string, reason: string): Promise<void> => {
            await request<{ success: boolean }>('PUT', `/attendance/manual/${id}`, {
                clockIn,
                clockOut,
                reason
            });
        },
        delete: async (id: string): Promise<void> => {
            await request<{ success: boolean }>('DELETE', `/attendance/${id}`);
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
                manualBy: r.manual_by,
                manualReason: r.manual_reason
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
        deleteChannel: async (channelId: string): Promise<void> => {
            await request('DELETE', `/chat/channels/${channelId}`, {});
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
            return request<void>('POST', '/system/reset-factory');
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
            
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            const response = await fetch(`${API_BASE_URL}/backup/download`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                let errorMessage = 'Failed to download backup';
                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                } catch (e) {
                    console.error('Failed to parse error response:', e);
                }
                throw new Error(errorMessage);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `taskflow-backup-${new Date().toISOString().split('T')[0]}.db`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        },
        uploadBackup: async (file: File): Promise<void> => {
            const token = localStorage.getItem('auth_token');
            
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            const formData = new FormData();
            formData.append('backup', file);
            
            const response = await fetch(`${API_BASE_URL}/backup/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                let errorMessage = 'Failed to upload backup';
                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                } catch (e) {
                    console.error('Failed to parse error response:', e);
                }
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            return result;
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
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/leaves`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch leaves');
            return response.json();
        },
        create: async (data: any): Promise<any> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/leaves`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to create leave');
            return response.json();
        },
        approve: async (id: string, data: any): Promise<any> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/leaves/${id}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to approve leave' }));
                throw new Error(error.error || 'Failed to approve leave');
            }
            return response.json();
        },
        reject: async (id: string, data: any): Promise<any> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/leaves/${id}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to reject leave' }));
                throw new Error(error.error || 'Failed to reject leave');
            }
            return response.json();
        },
        delete: async (id: string): Promise<any> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/leaves/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to delete leave' }));
                throw new Error(error.error || 'Failed to delete leave');
            }
            return response.json();
        },
        getRules: async (departmentId: string): Promise<any> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/leaves/rules/${departmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch rules');
            return response.json();
        },
        updateRules: async (departmentId: string, data: any): Promise<any> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/leaves/rules/${departmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to update rules');
            return response.json();
        }
    },
    schedules: {
        getAll: async (): Promise<any> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/schedules`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch schedules');
            return response.json();
        },
        submit: async (data: any): Promise<any> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/schedules`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to submit schedule' }));
                throw new Error(error.error || 'Failed to submit schedule');
            }
            return response.json();
        },
        approve: async (id: string, data: any): Promise<any> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/schedules/${id}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to approve schedule' }));
                throw new Error(error.error || 'Failed to approve schedule');
            }
            return response.json();
        },
        reject: async (id: string, data: any): Promise<any> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/schedules/${id}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to reject schedule' }));
                throw new Error(error.error || 'Failed to reject schedule');
            }
            return response.json();
        },
        getRules: async (departmentId: string): Promise<any> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/schedules/rules/${departmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch rules');
            return response.json();
        },
        updateRules: async (departmentId: string, data: any): Promise<any> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/schedules/rules/${departmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to update rules');
            return response.json();
        },
        update: async (id: string, data: any): Promise<any> => {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('Not authenticated');
            
            const response = await fetch(`${API_BASE_URL}/schedules/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to update schedule' }));
                throw new Error(error.error || 'Failed to update schedule');
            }
            return response.json();
        }
    },

    workLogs: {
        getAll: async (params?: { departmentId?: string; userId?: string; date?: string; startDate?: string; endDate?: string }): Promise<{ logs: WorkLog[] }> => {
            const queryParams = new URLSearchParams();
            if (params?.departmentId) queryParams.append('departmentId', params.departmentId);
            if (params?.userId) queryParams.append('userId', params.userId);
            if (params?.date) queryParams.append('date', params.date);
            if (params?.startDate) queryParams.append('startDate', params.startDate);
            if (params?.endDate) queryParams.append('endDate', params.endDate);
            
            const queryString = queryParams.toString();
            return request<{ logs: WorkLog[] }>('GET', `/work-logs${queryString ? '?' + queryString : ''}`);
        },
        
        create: async (data: { date: string; todayTasks: string; tomorrowTasks: string; notes?: string }): Promise<{ success: boolean; log: WorkLog }> => {
            return request<{ success: boolean; log: WorkLog }>('POST', '/work-logs', data);
        },
        
        update: async (id: string, data: { todayTasks?: string; tomorrowTasks?: string; notes?: string }): Promise<{ success: boolean; log: WorkLog }> => {
            return request<{ success: boolean; log: WorkLog }>('PUT', `/work-logs/${id}`, data);
        },
        
        delete: async (id: string): Promise<{ success: boolean; message: string }> => {
            return request<{ success: boolean; message: string }>('DELETE', `/work-logs/${id}`);
        }
    },
};

const MockApi = RealApi;

export const api = USE_MOCK_API ? MockApi : RealApi;
