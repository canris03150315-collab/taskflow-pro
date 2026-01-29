
export enum Role {
  BOSS = 'BOSS',
  MANAGER = 'MANAGER', // 新增總經理/大主管層級
  SUPERVISOR = 'SUPERVISOR',
  EMPLOYEE = 'EMPLOYEE',
}

// 定義細部權限
export type Permission = 
  | 'CREATE_TASK'       // 建立任務
  | 'MANAGE_FINANCE'    // 管理公費/新增紀錄
  | 'POST_ANNOUNCEMENT' // 發布公告
  | 'MANAGE_FORUM'      // 管理論壇提案
  | 'MANAGE_USERS'      // 管理使用者帳號 (新增/修改員工)
  | 'MANAGE_DEPARTMENTS' // 管理部門 (新增/修改/刪除部門)
  | 'APPROVE_LEAVES'    // 審核假期 (主管權限)
  | 'MANAGE_LEAVE_RULES' // 設定部門排假規則 (主管權限)
  | 'SYSTEM_RESET';     // 系統重置/格式化 (危險權限)

export interface DepartmentDef {
  id: string;
  name: string;
  theme: 'slate' | 'blue' | 'purple' | 'rose' | 'emerald' | 'orange' | 'cyan';
  icon: string;
  parent_department_id?: string | null;
  subdepartments?: DepartmentDef[];
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
  OPEN = 'Open',         // Available to be picked up
  ASSIGNED = 'Assigned', // Assigned to someone but not started/accepted yet
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export interface User {
  id: string;
  name: string;
  role: Role;
  department: string; // Changed from enum to string ID
  avatar: string;
  username: string; 
  password: string;
  permissions?: Permission[]; // Optional custom permissions
}

// 權限檢查輔助函式
export const hasPermission = (user: User, perm: Permission): boolean => {
  // Boss, Manager, Supervisor 預設擁有所有管理權限
  if (user.role === Role.BOSS || user.role === Role.MANAGER || user.role === Role.SUPERVISOR) {
    // SYSTEM_RESET 只有 BOSS 預設擁有，其他人必須明確被授權
    if (perm === 'SYSTEM_RESET' && user.role !== Role.BOSS) {
        return user.permissions?.includes(perm) || false;
    }
    return true;
  }
  // 員工則檢查是否有被特別授權
  return user.permissions?.includes(perm) || false;
};

export interface TaskTimelineEntry {
  timestamp: string;
  userId: string;
  content: string;
  progress: number; // Snapshot of progress
}

export interface Task {
  id: string;
  title: string;
  description: string;
  urgency: Urgency;
  deadline?: string; 
  createdAt: string;
  status: TaskStatus;
  
  // Assignment Logic
  targetDepartment?: string; // Changed from enum to string ID
  assignedToDepartment?: string; // Department task is assigned to
  assignedToUserId?: string; 
  
  // Execution
  acceptedByUserId?: string; 
  completionNotes?: string;
  
  // Progress Tracking
  progress: number; // 0-100
  timeline: TaskTimelineEntry[];

  // Metadata
  createdBy: string;
  isArchived?: boolean; // 新增：是否已封存
  
  // Notification Logic
  unreadUpdatesForUserIds?: string[]; // List of UserIDs (e.g. Creator) who haven't seen the latest update
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'IMPORTANT';
  createdAt: string;
  createdBy: string; // User ID
  readBy: string[]; // List of User IDs who have read this
  images?: string[]; // Base64 encoded images
}

// --- Chat / Messenger Types ---

export interface ChatMessage {
  id: string;
  channelId: string; // Relation to ChatChannel
  userId: string;
  userName: string;
  avatar: string;
  content: string;
  timestamp: string;
  readBy: string[]; // For read receipts
}

export interface ChatChannel {
  id: string;
  type: 'DIRECT' | 'GROUP' | 'DEPARTMENT';
  name?: string; // For Group/Dept
  participants: string[]; // User IDs
  lastMessage?: ChatMessage;
  unreadCount?: number; // Calculated dynamically usually
  created_at?: string; // Added to fix type error
}

export interface ChatRequest {
  id: string;
  fromUserId: string;
  toUserId: string; // Superior
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  timestamp: string;
}

// --- Report System Types ---

export enum ReportType {
  DAILY = 'DAILY',
}

// Updated to match "Daily Operational Record" Excel structure
export interface DailyReportContent {
  // User Growth Metrics
  lineLeads: number;      // LINE 導入數量
  registrations: number;  // 註冊人數
  firstDeposits: number;  // 首充人數

  // Financial Metrics
  depositAmount: number;    // 今日充值金額
  withdrawalAmount: number; // 今日提現金額
  netIncome: number;        // 淨入金額 (充值 - 提現) (Calculated or Input)
  
  // Rates (Calculated usually, but can be stored)
  conversionRate?: number;    // 轉化率 (註冊/導入)
  firstDepositRate?: number;  // 首充率 (首充/註冊)

  notes: string;          // 備註 / 今日線路盤虧等文字說明
}

export interface Report {
  id: string;
  type: ReportType;
  userId: string;
  createdAt: string; // Date string
  
  content: DailyReportContent;

  // AI Generated Fields
  aiSummary?: string;  // AI 針對營運數據的分析摘要
  aiMood?: 'POSITIVE' | 'NEUTRAL' | 'STRESSED'; // AI 根據盈虧判斷
  
  managerFeedback?: string;
  reviewedBy?: string;
}

// --- Report Authorization Types (雙重審核系統) ---

export interface ReportAuthorization {
  id: string;
  
  // 第一審核者
  firstApproverId: string;
  firstApproverName: string;
  firstApproverDept: string;
  firstApprovedAt: string;
  firstApprovalReason: string;
  firstApprovalIp?: string;
  
  // 第二審核者
  secondApproverId: string;
  secondApproverName: string;
  secondApproverDept: string;
  secondApprovedAt: string;
  secondApprovalReason: string;
  secondApprovalIp?: string;
  
  // 授權資訊
  authorizedAt: string;
  expiresAt: string;
  isActive: boolean;
  sessionId: string;
  
  // 審計追蹤
  userAgent?: string;
  createdAt: string;
}

export interface ApprovalRequest {
  approverId: string;  // 選擇的第二審核者 ID
  reason: string;      // 審核原因（至少10字）
}

export interface ApprovalStatus {
  isAuthorized: boolean;
  authorization?: ReportAuthorization;
  remainingTime?: number;  // 剩餘秒數
}

export interface EligibleApprover {
  id: string;
  name: string;
  role: Role;
  department: string;
}

// --- Finance / Petty Cash Types ---

export interface FinanceRecord {
  id: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE'; // 撥款(IN) vs 支出(OUT)
  status: 'PENDING' | 'COMPLETED'; // 新增狀態：待確認 vs 已入帳
  category: string; // e.g. 餐費, 交通, 文具, 撥款
  description: string;
  
  scope: 'DEPARTMENT' | 'PERSONAL';
  departmentId: string; // The context dept
  
  ownerId?: string; // If PERSONAL, which user owns this fund. If DEPARTMENT, usually managed by Supervisor.
  recordedBy: string; // Who entered the record
  
  attachment?: string; // Base64 or URL of receipt/invoice image
}

// --- Forum / Suggestion Types ---

export enum SuggestionStatus {
  OPEN = 'OPEN',         // 提出
  REVIEWING = 'REVIEWING', // 審核中
  APPROVED = 'APPROVED',   // 已採納
  REJECTED = 'REJECTED',   // 暫不考慮
}

export interface SuggestionComment {
  id: string;
  userId: string; // Commenter ID
  content: string;
  createdAt: string;
  isOfficialReply?: boolean; // If true, highlights as an official response from management
}

export interface Suggestion {
  id: string;
  title: string;
  content: string;
  category: string; // e.g., 薪資福利, 工作流程, 設施修繕
  
  isAnonymous: boolean;
  authorId: string;
  
  targetDeptId?: string; // Specific department (e.g. ask HR) or 'ALL' for General Management
  
  status: SuggestionStatus;
  upvotes: string[]; // List of user IDs who upvoted
  
  comments: SuggestionComment[];
  createdAt: string;
}

// --- Memo / Notes Types ---

export interface MemoTodo {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Memo {
  id: string;
  userId: string;
  type: 'TEXT' | 'CHECKLIST';
  content?: string; // For text type
  todos?: MemoTodo[]; // For checklist type
  color: 'yellow' | 'blue' | 'green' | 'rose' | 'purple';
  createdAt: string;
}

// --- SOP / Daily Routine Types ---

export interface RoutineTemplate {
  id: string;
  departmentId: string; // The department this SOP belongs to
  title: string; // e.g., "Marketing Daily Checklist"
  items: string[]; // List of tasks to do (now treated as content sections)
  lastUpdated: string;
  readBy?: string[]; // List of UserIDs who have read this
  isDaily?: boolean; // 是否為每日任務（勾選清單）
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
  date: string; // YYYY-MM-DD
  items: RoutineItemStatus[];
  completedAt?: string; // When all items were finished
}

// --- Attendance Types ---

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  clockIn: string; // ISO Timestamp
  clockOut?: string; // ISO Timestamp
  durationMinutes?: number; // Calculated after clock out
  status: 'ONLINE' | 'OFFLINE';
}

// --- System Audit Log Types ---

export type LogLevel = 'INFO' | 'WARNING' | 'DANGER';

export interface SystemLog {
  id: string;
  timestamp: string;
  userId: string; // Operator ID
  userName: string; // Snapshot of name at time of log
  action: string; // e.g., "DELETE_USER", "LOGIN", "RESET_SYSTEM"
  details: string; // Description
  level: LogLevel;
}

// --- Performance Review Types ---

export interface ReviewMetrics {
  taskCompletionRate: number; // 0-100
  sopCompletionRate: number; // 0-100
  attendanceRate: number; // 0-100 (Simplified: Days present / Total working days in month so far)
}

export interface PerformanceReview {
  id: string;
  targetUserId: string;
  period: string; // "YYYY-MM"
  reviewerId?: string;
  updatedAt: string;
  
  // Auto-calculated metrics
  metrics: ReviewMetrics;
  
  // Manager Ratings (1-5)
  ratingWorkAttitude: number;
  ratingProfessionalism: number;
  ratingTeamwork: number;
  
  // Feedback
  managerComment: string;
  
  // Result
  totalScore: number; // 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  status: 'DRAFT' | 'PUBLISHED';
}

// --- Menu Navigation Types ---

export type MenuItemId = 
  | 'dashboard' 
  | 'bulletin' 
  | 'tasks' 
  | 'leaves'
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
  | 'ai-assistant'
  | 'backup-monitor'
  | 'settings';

// NEW: Group Structure
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
    items: ['tasks', 'leaves', 'chat', 'reports', 'memo']
  },
  {
    id: 'admin',
    label: '行政與資源',
    items: ['bulletin', 'sop', 'finance', 'performance', 'forum']
  },
  {
    id: 'system',
    label: '系統設定',
    items: ['ai-assistant', 'backup-monitor', 'settings']
  }
];

// Fallback for old compatibility (Flat list to Groups)
export const DEFAULT_MENU_ORDER: MenuItemId[] = [
  'dashboard', 'chat', 'bulletin', 'tasks', 'leaves', 'sop', 
  'performance', 'team', 'reports', 'finance', 'data_center', 
  'forum', 'memo', 'personnel', 'ai-assistant', 'backup-monitor', 'settings'
];

export const MENU_LABELS: Record<MenuItemId, { label: string, icon: string }> = {
  dashboard: { label: '儀表板', icon: '📊' },
  bulletin: { label: '企業公告欄', icon: '📢' },
  tasks: { label: '任務列表', icon: '📋' },
  leaves: { label: '假表管理', icon: '📅' },
  sop: { label: '部門文件與規範', icon: '📑' },
  performance: { label: '績效考核 (KPI)', icon: '🏆' },
  team: { label: '團隊工作概況', icon: '📉' },
  reports: { label: '工作報表中心', icon: '📝' },
  finance: { label: '零用金與KOL', icon: '💰' },
  data_center: { label: '部門數據中心', icon: '📥' }, 
  forum: { label: '提案討論區', icon: '💬' },
  chat: { label: '企業通訊', icon: '📨' },
  memo: { label: '個人備忘錄', icon: '✏️' },
  personnel: { label: '人員帳號管理', icon: '👥' },
  'ai-assistant': { label: 'AI 智能助理', icon: '✨' },
  'backup-monitor': { label: '備份監控', icon: '💾' },
  settings: { label: '系統設定', icon: '⚙️' },
};

// Work Log Types
export interface WorkLog {
  id: string;
  userId: string;
  userName: string;
  departmentId: string;
  departmentName: string;
  date: string; // YYYY-MM-DD
  todayTasks: string; // 今日工作事項
  tomorrowTasks: string; // 明天工作事項
  notes: string; // 特別備註
  createdAt: string;
  updatedAt: string;
}

// --- KOL Management Types ---

export type KOLStatus = 'ACTIVE' | 'STOPPED' | 'NEGOTIATING' | 'LOST_CONTACT';
export type ContractType = 'NORMAL' | 'ADVANCE' | 'ACTIVITY' | 'VIDEO';
export type PaymentType = 'DEPOSIT' | 'SALARY' | 'ADVANCE' | 'ACTIVITY';
export type KOLPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'YOUTUBE' | 'TIKTOK' | 'THREADS' | 'OTHER';

export const KOL_PLATFORMS: { value: KOLPlatform; label: string; icon: string }[] = [
  { value: 'FACEBOOK', label: 'Facebook', icon: '📘' },
  { value: 'INSTAGRAM', label: 'Instagram', icon: '📸' },
  { value: 'YOUTUBE', label: 'YouTube', icon: '🎬' },
  { value: 'TIKTOK', label: 'TikTok', icon: '🎵' },
  { value: 'THREADS', label: 'Threads', icon: '🧵' },
  { value: 'OTHER', label: '其他', icon: '🌐' },
];

export interface KOLProfile {
  id: string;
  platform: KOLPlatform;
  platformId: string;  // 原 facebookId，改為通用平台 ID
  platformAccount: string;
  contactInfo?: string;
  status: KOLStatus;
  statusColor?: 'green' | 'yellow' | 'red';  // 狀態顯示顏色
  weeklyPayNote?: string;  // 週薪備註
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  contractCount?: number;
  activeContracts?: number;
  totalUnpaid?: number;
}

export interface KOLContract {
  id: string;
  kolId: string;
  startDate?: string;
  endDate?: string;
  salaryAmount: number;
  depositAmount: number;
  unpaidAmount: number;
  clearedAmount: number;
  totalPaid: number;
  contractType: ContractType;
  notes?: string;
  weeklyNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  platform?: KOLPlatform;
  platformId?: string;
  platformAccount?: string;
  kolStatus?: KOLStatus;
}

export interface KOLPayment {
  id: string;
  contractId: string;
  paymentDate: string;
  amount: number;
  paymentType: PaymentType;
  notes?: string;
  attachment?: string;
  createdAt: string;
  createdBy: string;
  kolId?: string;
  platform?: KOLPlatform;
  platformId?: string;
  platformAccount?: string;
}

export interface KOLWeeklyPayment {
  id: string;
  kolId: string;
  amount: number;
  paymentDate: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface KOLStats {
  totalKOLs: number;
  activeKOLs: number;
  pausedKOLs?: number;
  stoppedKOLs?: number;
  activeContracts?: number;
  totalUnpaid?: number;
  monthlyPayments?: number;
  monthlyContracts?: number;
}

export interface KOLOperationLog {
  id: string;
  operationType: string;
  targetType: string;
  targetId: string;
  userId: string;
  userName: string;
  changes: string;
  createdAt: string;
}
