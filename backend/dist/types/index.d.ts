export declare enum Role {
    BOSS = "BOSS",
    MANAGER = "MANAGER",
    SUPERVISOR = "SUPERVISOR",
    EMPLOYEE = "EMPLOYEE"
}
export declare enum TaskStatus {
    OPEN = "OPEN",
    ASSIGNED = "ASSIGNED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum TaskUrgency {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}
export interface User {
    id: string;
    name: string;
    role: Role;
    department: string;
    avatar?: string;
    username: string;
    password: string;
    permissions: string[];
    created_at: string;
    updated_at: string;
}
export interface Department {
    id: string;
    name: string;
    theme: string;
    icon: string;
    created_at: string;
    updated_at: string;
}
export interface Task {
    id: string;
    title: string;
    description: string;
    urgency: TaskUrgency;
    deadline?: string;
    status: TaskStatus;
    progress: number;
    created_by: string;
    target_department?: string;
    assigned_to_user_id?: string;
    assigned_to_department?: string;
    offline_pending: boolean;
    last_synced_at?: string;
    version: number;
    created_at: string;
    updated_at: string;
}
export interface AttendanceRecord {
    id: string;
    user_id: string;
    date: string;
    clock_in: string;
    clock_out?: string;
    duration_minutes?: number;
    status: 'ONLINE' | 'OFFLINE';
    location_lat?: number;
    location_lng?: number;
    location_address?: string;
    is_offline: boolean;
    created_at: string;
}
export interface SyncQueueItem {
    id: string;
    user_id: string;
    action: 'create' | 'update' | 'delete';
    table: string;
    record_id: string;
    data: any;
    status: 'pending' | 'synced' | 'failed';
    retry_count: number;
    created_at: string;
    updated_at: string;
}
export interface SystemLog {
    id: string;
    timestamp: string;
    user_id: string;
    user_name: string;
    action: string;
    details: string;
    level: 'INFO' | 'WARNING' | 'DANGER';
}
declare global {
    namespace Express {
        interface Request {
            user?: User;
            db?: any;
        }
    }
}
export declare const __types_module__ = true;
