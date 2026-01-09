
import React, { useState, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import { Role, Task, TaskStatus, Urgency, User, DepartmentDef, Announcement, UNASSIGNED_DEPT_ID, Report, ReportType, DailyReportContent, TaskTimelineEntry, FinanceRecord, Suggestion, SuggestionStatus, SuggestionComment, hasPermission, MenuItemId, DEFAULT_MENU_GROUPS, MENU_LABELS, MenuGroup } from './types';
import { CreateTaskModal } from './components/CreateTaskModal';
import { Badge } from './components/Badge';
import { TaskCard } from './components/TaskCard';
import { LoginPage } from './components/LoginPage';
import { SetupPage } from './components/SetupPage';
import { UserModal } from './components/UserModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { api } from './services/api';
import { NotificationToast, Notification } from './components/NotificationToast';
import { ToastProvider, useToast } from './components/Toast';
import { WebSocketClient, WebSocketMessage } from './utils/websocketClient';

// 動態載入大型組件 - 程式碼分割優化
const SubordinateView = lazy(() => import('./components/SubordinateView').then(m => ({ default: m.SubordinateView })));
const SubordinateRoutineView = lazy(() => import('./components/SubordinateRoutineView').then(m => ({ default: m.SubordinateRoutineView })));
const PersonnelView = lazy(() => import('./components/PersonnelView').then(m => ({ default: m.PersonnelView })));
const BulletinView = lazy(() => import('./components/BulletinView').then(m => ({ default: m.BulletinView })));
const ReportView = lazy(() => import('./components/ReportView').then(m => ({ default: m.ReportView })));
const CreateReportView = lazy(() => import('./components/CreateReportView').then(m => ({ default: m.CreateReportView })));
const FinanceView = lazy(() => import('./components/FinanceView').then(m => ({ default: m.FinanceView })));
const ForumView = lazy(() => import('./components/ForumView').then(m => ({ default: m.ForumView })));
const ChatSystem = lazy(() => import('./components/ChatSystem').then(m => ({ default: m.ChatSystem })));
const MemoView = lazy(() => import('./components/MemoView').then(m => ({ default: m.MemoView })));
const CalendarView = lazy(() => import('./components/CalendarView').then(m => ({ default: m.CalendarView })));
const SystemSettingsView = lazy(() => import('./components/SystemSettingsView').then(m => ({ default: m.SystemSettingsView })));
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const PerformanceView = lazy(() => import('./components/PerformanceView').then(m => ({ default: m.PerformanceView })));
const SOPView = lazy(() => import('./components/SOPView').then(m => ({ default: m.SOPView })));
const LeaveManagementView = lazy(() => import('./components/LeaveManagementView').then(m => ({ default: m.LeaveManagementView })));
const DepartmentDataView = lazy(() => import('./components/DepartmentDataView').then(m => ({ default: m.DepartmentDataView })));

// 載入中骨架屏組件
const PageSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 bg-slate-200 rounded-lg w-1/3"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="h-32 bg-slate-200 rounded-xl"></div>
      <div className="h-32 bg-slate-200 rounded-xl"></div>
      <div className="h-32 bg-slate-200 rounded-xl"></div>
    </div>
    <div className="h-64 bg-slate-200 rounded-xl"></div>
  </div>
);

function AppContent() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [isProcessingSetup, setIsProcessingSetup] = useState(false);

  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<DepartmentDef[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]); 
  const [reports, setReports] = useState<Report[]>([]); 
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]); 
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [backendVersion, setBackendVersion] = useState<string>('載入中...'); 
  
  // WebSocket Client
  const wsClientRef = useRef<WebSocketClient | null>(null); 
  
  // UI States
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isUserModalOpen, setUserModalOpen] = useState(false);
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [isReportProcessing, setReportProcessing] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [currentPage, setCurrentPage] = useState<MenuItemId>('dashboard'); 
  const [boardTab, setBoardTab] = useState<'my_tasks' | 'available' | 'all' | 'archived'>('all');
  const [selectedTaskCategory, setSelectedTaskCategory] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [teamViewTab, setTeamViewTab] = useState<'tasks' | 'routines'>('tasks');
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [isSearchFilterOpen, setIsSearchFilterOpen] = useState(false);
  
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>(DEFAULT_MENU_GROUPS);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isChangePasswordOpen, setChangePasswordOpen] = useState(false);

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasShownInitialNotifications, setHasShownInitialNotifications] = useState(false);

  const taskListRef = useRef<HTMLDivElement>(null);

  const loadData = async (skipUserRestore = false) => {
        setIsLoading(true);
        try {
            // First check if setup is needed
            const setupStatus = await api.auth.checkSetup();
            if (setupStatus.needsSetup) {
                setIsSetupMode(true);
                setIsLoading(false);
                return;
            }

            // Try to restore login session from token (only on initial load)
            if (!skipUserRestore) {
                const token = localStorage.getItem('auth_token');
                if (token) {
                    try {
                        // Decode token to get user ID
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        console.log('[App] Restoring session for user:', payload.id);
                        
                        // Fetch all users to find current user
                        const users = await api.users.getAll();
                        const currentUserData = users.find(u => u.id === payload.id);
                        
                        if (currentUserData) {
                            console.log('[App] Session restored:', currentUserData.name);
                            setCurrentUser(currentUserData);
                        } else {
                            console.warn('[App] User not found in database, clearing token');
                            localStorage.removeItem('auth_token');
                        }
                    } catch (error) {
                        // Only clear token if it's a 401 (unauthorized)
                        if (error instanceof Error && error.message.includes('401')) {
                            console.error('[App] Token invalid (401), clearing');
                            localStorage.removeItem('auth_token');
                        } else {
                            // For other errors (network, etc), keep token and try again later
                            console.warn('[App] Failed to restore session, but keeping token:', error);
                        }
                    }
                }
            }

            // If setup is complete, load all data
            // Use Promise.allSettled to allow partial failures
            const results = await Promise.allSettled([
                api.users.getAll(),
                api.departments.getAll(),
                api.tasks.getAll(),
                api.announcements.getAll(),
                api.reports.getAll(),
                api.finance.getAll(),
                api.forum.getAll(),
                api.leaves.getAll(),
                api.system.getSettings(),
                fetch('/api/version').then(r => r.json())
            ]);
            
            // Extract successful results - 確保所有值都是陣列
            if (results[0].status === 'fulfilled') setUsers(Array.isArray(results[0].value) ? results[0].value : []);
            if (results[1].status === 'fulfilled') setDepartments(Array.isArray(results[1].value) ? results[1].value : []);
            if (results[2].status === 'fulfilled') setTasks(Array.isArray(results[2].value) ? results[2].value : []);
            if (results[3].status === 'fulfilled') setAnnouncements(Array.isArray(results[3].value) ? results[3].value : []);
            if (results[4].status === 'fulfilled') setReports(Array.isArray(results[4].value) ? results[4].value : []);
            if (results[5].status === 'fulfilled') setFinanceRecords(Array.isArray(results[5].value) ? results[5].value : []);
            if (results[6].status === 'fulfilled') setSuggestions(Array.isArray(results[6].value) ? results[6].value : []);
            if (results[7].status === 'fulfilled') setLeaves(Array.isArray(results[7].value) ? results[7].value : []);
            if (results[8].status === 'fulfilled' && results[8].value.menuGroups) {
                setMenuGroups(results[8].value.menuGroups);
            }
            if (results[9].status === 'fulfilled') {
                setBackendVersion(results[9].value.version || '未知');
            }
        } catch (err) {
            console.error("Failed to load initial data", err);
        } finally {
            setIsLoading(false);
        }
  };

  useEffect(() => {
    loadData();
  }, []);

  // WebSocket 即時更新監聽
  useEffect(() => {
    if (!currentUser) return;

    // 初始化 WebSocket 連接
    // 使用 Cloudflare Tunnel 提供有效的 HTTPS/WSS
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://robust-managing-stay-largely.trycloudflare.com/ws';
    console.log('[WebSocket] 連接到:', wsUrl);
    const wsClient = new WebSocketClient(wsUrl);
    wsClientRef.current = wsClient;

    const token = localStorage.getItem('auth_token');
    
    wsClient.connect(token || undefined).then(() => {
      console.log('[WebSocket] 已連接');
      
      // 發送認證訊息
      wsClient.sendMessage('AUTH', { userId: currentUser.id });
      
      // 添加訊息處理器
      const handleMessage = async (msg: WebSocketMessage) => {
        console.log('[WebSocket] 收到事件:', msg.type);
        
        // 人員管理事件
        if (msg.type === 'USER_CREATED' || msg.type === 'USER_UPDATED' || msg.type === 'USER_DELETED') {
          try {
            const updatedUsers = await api.users.getAll();
            setUsers(Array.isArray(updatedUsers) ? updatedUsers : []);
            toast.success('人員資料已更新');
          } catch (error) {
            console.error('更新人員資料失敗:', error);
          }
        }
        
        // 任務管理事件
        if (msg.type === 'TASK_CREATED' || msg.type === 'TASK_UPDATED' || msg.type === 'TASK_DELETED') {
          try {
            const updatedTasks = await api.tasks.getAll();
            setTasks(Array.isArray(updatedTasks) ? updatedTasks : []);
            toast.success('任務資料已更新');
          } catch (error) {
            console.error('更新任務資料失敗:', error);
          }
        }
        
        // 財務管理事件
        if (msg.type === 'FINANCE_CREATED' || msg.type === 'FINANCE_UPDATED' || msg.type === 'FINANCE_DELETED') {
          try {
            const updatedFinance = await api.finance.getAll();
            setFinanceRecords(Array.isArray(updatedFinance) ? updatedFinance : []);
            toast.success('財務資料已更新');
          } catch (error) {
            console.error('更新財務資料失敗:', error);
          }
        }
        
        // 部門管理事件
        if (msg.type === 'DEPARTMENT_CREATED' || msg.type === 'DEPARTMENT_UPDATED' || msg.type === 'DEPARTMENT_DELETED') {
          try {
            const updatedDepts = await api.departments.getAll();
            setDepartments(Array.isArray(updatedDepts) ? updatedDepts : []);
            toast.success('部門資料已更新');
          } catch (error) {
            console.error('更新部門資料失敗:', error);
          }
        }
        
        // 公告系統事件
        if (msg.type === 'ANNOUNCEMENT_CREATED' || msg.type === 'ANNOUNCEMENT_UPDATED' || msg.type === 'ANNOUNCEMENT_DELETED') {
          try {
            const updatedAnnouncements = await api.announcements.getAll();
            setAnnouncements(Array.isArray(updatedAnnouncements) ? updatedAnnouncements : []);
            toast.success('公告資料已更新');
          } catch (error) {
            console.error('更新公告資料失敗:', error);
          }
        }
        
        // 報表系統事件
        if (msg.type === 'REPORT_CREATED' || msg.type === 'REPORT_UPDATED' || msg.type === 'REPORT_DELETED') {
          try {
            const updatedReports = await api.reports.getAll();
            setReports(Array.isArray(updatedReports) ? updatedReports : []);
            toast.success('報表資料已更新');
          } catch (error) {
            console.error('更新報表資料失敗:', error);
          }
        }
        
        // 建議系統事件
        if (msg.type === 'SUGGESTION_CREATED' || msg.type === 'SUGGESTION_UPDATED' || msg.type === 'SUGGESTION_DELETED') {
          try {
            const updatedSuggestions = await api.forum.getAll();
            setSuggestions(Array.isArray(updatedSuggestions) ? updatedSuggestions : []);
            toast.success('建議資料已更新');
          } catch (error) {
            console.error('更新建議資料失敗:', error);
          }
        }
      };
      
      wsClient.addMessageHandler(handleMessage);
    }).catch(error => {
      console.error('[WebSocket] 連接失敗:', error);
    });

    // 清理函數
    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
    };
  }, [currentUser, toast]);

  useEffect(() => {
    if (currentUser) {
        const fetchChatCount = async () => {
            // Optimization: Skip polling if tab is hidden
            if (document.hidden) return;
            
            try {
                const channels = await api.chat.getChannels(currentUser.id);
                const channelArray = Array.isArray(channels) ? channels : [];
                const total = channelArray.reduce((acc, ch) => acc + (ch.unreadCount || 0), 0);
                setUnreadChatCount(total);
            } catch (error) {
                console.error('Failed to fetch chat count', error);
                setUnreadChatCount(0);
            }
        };
        fetchChatCount();
        // Optimization: Increase interval to 15s
        const interval = setInterval(fetchChatCount, 15000);
        return () => clearInterval(interval);
    }
  }, [currentUser]);

  // 檢查任務通知
  useEffect(() => {
    if (!currentUser || !tasks.length || hasShownInitialNotifications) return;
    
    const newNotifications: Notification[] = [];
    
    // 檢查指派給當前用戶的任務
    const assignedTasks = tasks.filter(t => 
      !t.isArchived && 
      t.status === TaskStatus.ASSIGNED && 
      t.assignedToUserId === currentUser.id
    );
    
    if (assignedTasks.length > 0) {
      newNotifications.push({
        id: 'assigned-' + Date.now(),
        type: 'assigned',
        title: `您有 ${assignedTasks.length} 個任務待接取`,
        message: assignedTasks.length === 1 
          ? `任務「${assignedTasks[0].title}」已指派給您`
          : `包含：${assignedTasks.slice(0, 2).map(t => t.title).join('、')}${assignedTasks.length > 2 ? '...' : ''}`,
        onClick: () => {
          setCurrentPage('tasks');
          setBoardTab('available');
        }
      });
    }
    
    // 檢查公開的可接取任務（排除已指定特定人員的任務）
    const openTasks = tasks.filter(t => 
      !t.isArchived && 
      t.status === TaskStatus.OPEN &&
      !t.assignedToUserId  // 只通知真正公開的任務，不包含已指定人員的任務
    );
    
    if (openTasks.length > 0) {
      newNotifications.push({
        id: 'available-' + Date.now(),
        type: 'available',
        title: `有 ${openTasks.length} 個公開任務可接取`,
        message: openTasks.length === 1 
          ? `任務「${openTasks[0].title}」等待認領`
          : `包含：${openTasks.slice(0, 2).map(t => t.title).join('、')}${openTasks.length > 2 ? '...' : ''}`,
        onClick: () => {
          setCurrentPage('tasks');
          setBoardTab('available');
        }
      });
    }
    
    if (newNotifications.length > 0) {
      setNotifications(newNotifications);
      setHasShownInitialNotifications(true);
      
      // 10秒後自動清除通知
      setTimeout(() => {
        setNotifications([]);
      }, 10000);
    }
  }, [currentUser, tasks, hasShownInitialNotifications]);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const newNotification = { ...notification, id: Date.now().toString() };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 8000);
  };

  const handleSetupComplete = async (adminData: any) => {
      setIsProcessingSetup(true);
      try {
          const user = await api.auth.setup(adminData);
          setUsers([user]);
          setCurrentUser(user);
          setIsSetupMode(false);
          setCurrentPage('dashboard');
      } catch (err) {
          alert('初始化失敗');
      } finally {
          setIsProcessingSetup(false);
      }
  };

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    setCurrentPage('dashboard');
    
    // Load all data after login
    try {
      const results = await Promise.allSettled([
        api.users.getAll(),
        api.departments.getAll(),
        api.tasks.getAll(),
        api.announcements.getAll(),
        api.reports.getAll(),
        api.finance.getAll(),
        api.forum.getAll(),
        api.system.getSettings()
      ]);
      
      if (results[0].status === 'fulfilled') setUsers(results[0].value);
      if (results[1].status === 'fulfilled') setDepartments(results[1].value);
      if (results[2].status === 'fulfilled') setTasks(results[2].value);
      if (results[3].status === 'fulfilled') setAnnouncements(results[3].value);
      if (results[4].status === 'fulfilled') setReports(results[4].value);
      if (results[5].status === 'fulfilled') setFinanceRecords(results[5].value);
      if (results[6].status === 'fulfilled') setSuggestions(results[6].value);
      if (results[7].status === 'fulfilled' && results[7].value.menuGroups) {
        setMenuGroups(results[7].value.menuGroups);
      }
    } catch (err) {
      console.error("Failed to load data after login", err);
    }
  };

  const handleLogout = () => {
    api.auth.logout(); // 清除 token
    setCurrentUser(null);
    setCurrentPage('dashboard');
    setBoardTab('all');
    setSelectedTaskCategory(null);
    loadData(); 
  };

  const handleAddTask = async (newTaskData: any) => {
    // Convert camelCase to snake_case for backend API
    const backendData = {
      title: newTaskData.title,
      description: newTaskData.description,
      urgency: newTaskData.urgency,
      deadline: newTaskData.deadline,
      target_department: newTaskData.targetDepartment,
      assigned_to_user_id: newTaskData.assignedToUserId,
      assigned_to_department: newTaskData.assignedToDepartment
    };
    
    // 判斷是編輯還是新建
    if (newTaskData.id) {
      // 編輯模式
      try {
        await api.tasks.update({ id: newTaskData.id, ...backendData } as any);
        setTasks(tasks.map(t => t.id === newTaskData.id ? {
          ...t,
          title: newTaskData.title,
          description: newTaskData.description,
          urgency: newTaskData.urgency,
          deadline: newTaskData.deadline,
          targetDepartment: newTaskData.targetDepartment,
          assignedToUserId: newTaskData.assignedToUserId
        } : t));
        setEditingTask(null);
        alert('任務已更新');
      } catch (error: any) {
        alert(error?.message || '更新任務失敗');
      }
    } else {
      // 新建模式
      const response = await api.tasks.create(backendData as any);
      // 轉換後端返回的 snake_case 到 camelCase
      const taskData = (response as any).task || response;
      const createdTask: Task = {
        id: taskData.id,
        title: taskData.title,
        description: taskData.description,
        urgency: taskData.urgency,
        deadline: taskData.deadline,
        createdAt: taskData.created_at,
        status: taskData.status,
        targetDepartment: taskData.target_department,
        assignedToUserId: taskData.assigned_to_user_id,
        acceptedByUserId: taskData.accepted_by_user_id,
        completionNotes: taskData.completion_notes,
        progress: taskData.progress || 0,
        createdBy: taskData.created_by,
        isArchived: taskData.is_archived === 1 || taskData.is_archived === true,
        timeline: taskData.timeline || [],
        unreadUpdatesForUserIds: taskData.unread_updates_for_user_ids || []
      };
      setTasks([createdTask, ...tasks]);
    }
  };

  const handleAcceptTask = async (taskId: string) => {
    if (!currentUser) return;
    try {
      const response = await api.tasks.accept(taskId);
      // 轉換後端返回的 snake_case 到 camelCase
      const taskData = (response as any).task || response;
      const updatedTask: Task = {
        id: taskData.id,
        title: taskData.title,
        description: taskData.description,
        urgency: taskData.urgency,
        deadline: taskData.deadline,
        createdAt: taskData.created_at,
        status: taskData.status,
        targetDepartment: taskData.target_department,
        assignedToUserId: taskData.assigned_to_user_id,
        assignedToDepartment: taskData.assigned_to_department,
        acceptedByUserId: taskData.accepted_by_user_id,
        completionNotes: taskData.completion_notes,
        progress: taskData.progress || 0,
        createdBy: taskData.created_by,
        isArchived: taskData.is_archived === 1 || taskData.is_archived === true,
        timeline: taskData.timeline || [],
        unreadUpdatesForUserIds: taskData.unread_updates_for_user_ids || []
      };
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    } catch (error: any) {
      alert(error?.message || '接取任務失敗');
    }
  };

  const handleUpdateProgress = async (taskId: string, progress: number, note: string, isComplete: boolean) => {
    if (!currentUser) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newEntry: TaskTimelineEntry = {
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        content: note || (isComplete ? '任務結案' : '進度更新'),
        progress: progress
    };

    const unreadList = new Set(task.unreadUpdatesForUserIds || []);
    if (task.createdBy !== currentUser.id) unreadList.add(task.createdBy);
    if (currentUser.role === Role.EMPLOYEE) {
         const supervisor = users.find(u => u.role === Role.SUPERVISOR && u.department === currentUser.department);
         if(supervisor && supervisor.id !== currentUser.id) unreadList.add(supervisor.id);
    }

    const updatedTask = { 
        ...task, 
        status: isComplete ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS, 
        completionNotes: isComplete ? note : task.completionNotes,
        progress: progress,
        timeline: [newEntry, ...(task.timeline || [])],
        unreadUpdatesForUserIds: Array.from(unreadList),
        note: note
    };

    console.log('[App] 更新進度 - 發送數據:', {
        taskId,
        progress,
        note,
        isComplete,
        updatedTask
    });
    
    await api.tasks.update(updatedTask);
    
    // 重新從後端獲取完整的任務數據（包含 timeline）
    try {
        console.log('[App] 重新獲取任務數據:', taskId);
        const refreshedTask = await api.tasks.getById(taskId);
        console.log('[App] 獲取到的任務數據:', {
            taskId: refreshedTask.id,
            hasTimeline: !!refreshedTask.timeline,
            timelineLength: refreshedTask.timeline?.length || 0,
            timeline: refreshedTask.timeline
        });
        setTasks(tasks.map(t => t.id === taskId ? refreshedTask : t));
    } catch (error) {
        console.error('[App] 重新獲取任務失敗:', error);
        // 如果獲取失敗，使用本地更新的數據
        setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    }
  };

  const handleArchiveTask = async (taskId: string) => {
      try {
          const task = tasks.find(t => t.id === taskId);
          if (!task) return;
          
          // 使用 PUT 路由更新任務
          const updatedTask = { ...task, isArchived: true, is_archived: true };
          await api.tasks.update(updatedTask);
          setTasks(tasks.map(t => t.id === taskId ? { ...t, isArchived: true } : t));
          console.log('✅ 任務封存成功:', taskId);
      } catch (error) {
          console.error('❌ 封存任務失敗:', error);
          alert('封存任務失敗，請重試');
      }
  };

  const handleEditTask = (task: Task) => {
      setEditingTask(task);
      setCreateModalOpen(true);
  };

  const handleCancelTask = async (taskId: string) => {
      if (!confirm('確定要撤銷此任務嗎？撤銷後任務將移至已封存分頁，可隨時重新開啟。')) return;
      try {
          await api.tasks.updateProgress(taskId, { status: TaskStatus.CANCELLED });
          setTasks(tasks.map(t => t.id === taskId ? { ...t, status: TaskStatus.CANCELLED } : t));
          alert('任務已撤銷，可在「已封存」分頁中重新開啟');
      } catch (error: any) {
          alert(error?.message || '撤銷任務失敗');
      }
  };

  const handleReopenTask = async (taskId: string) => {
      if (!confirm('確定要重新開啟此任務嗎？')) return;
      try {
          await api.tasks.updateProgress(taskId, { status: TaskStatus.OPEN });
          setTasks(tasks.map(t => t.id === taskId ? { ...t, status: TaskStatus.OPEN, progress: 0 } : t));
          alert('任務已重新開啟');
      } catch (error: any) {
          alert(error?.message || '重新開啟任務失敗');
      }
  };

  const handleDeleteTask = async (taskId: string) => {
      try {
          await api.tasks.delete(taskId);
          setTasks(tasks.filter(t => t.id !== taskId));
          alert('任務已刪除');
      } catch (error: any) {
          alert(error?.message || '刪除任務失敗');
      }
  };

  const handleAddUser = async (userData: any) => {
    try {
      const newUser: User = { ...userData, id: `u-${Date.now()}` };
      const createdUser = await api.users.create(newUser);
      setUsers([...users, createdUser]);
      alert('用戶創建成功！');
    } catch (error: any) {
      const errorMessage = error?.message || '創建用戶失敗';
      alert(errorMessage);
      throw error; // 重新拋出錯誤，防止模態框關閉
    }
  };

  const handleUpdateUser = async (userData: any) => {
    if (!editingUser) return;
    const isSelf = currentUser && currentUser.id === editingUser.id;
    
    // 編輯自己時只發送允許的欄位，不合併原始資料中的敏感欄位
    const dataToSend = isSelf 
      ? { id: editingUser.id, name: userData.name, avatar: userData.avatar }
      : { ...editingUser, ...userData };
    
    console.log('[DEBUG] Sending to API:', dataToSend);
    console.log('[DEBUG] Permissions in dataToSend:', dataToSend.permissions);
    
    // 使用後端返回的完整用戶數據（包含 permissions）
    const response = await api.users.update(dataToSend);
    const updatedUser = response.user || response;
    
    console.log('[DEBUG] Received from API:', updatedUser);
    console.log('[DEBUG] Permissions in updatedUser:', updatedUser.permissions);
    
    setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
    if (isSelf) {
        setCurrentUser(updatedUser);
    }
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('確定要刪除此使用者嗎？')) {
      await api.users.delete(userId);
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleAddDepartment = async (dept: DepartmentDef) => {
     try {
         const createdDept = await api.departments.create(dept);
         setDepartments([...departments, createdDept]);
     } catch (error: any) {
         alert(error?.message || '創建部門失敗');
     }
  };

  const handleUpdateDepartment = async (dept: DepartmentDef) => {
      try {
          const updatedDept = await api.departments.update(dept);
          setDepartments(prev => prev.map(d => d.id === dept.id ? updatedDept : d));
      } catch (error: any) {
          alert(error?.message || '更新部門失敗');
      }
  };

  const handleDeleteDepartment = async (id: string) => {
     const hasUsers = users.some(u => u.department === id);
     if (hasUsers) {
         alert('無法刪除：該部門尚有員工，請先轉移人員。');
         return;
     }
     if (id === UNASSIGNED_DEPT_ID) {
         alert('無法刪除系統預設部門。');
         return;
     }
     await api.departments.delete(id);
     setDepartments(departments.filter(d => d.id !== id));
  };

  const handleCreateAnnouncement = async (data: any) => {
      if(!currentUser) return;
      console.log('[App] Creating announcement with data:', data);
      console.log('[App] Images from modal:', data.images);
      const newAnn: Announcement = {
          id: `ann-${Date.now()}`,
          ...data,
          createdAt: new Date().toISOString().split('T')[0],
          createdBy: currentUser.id,
          readBy: []
      };
      console.log('[App] Final announcement object:', newAnn);
      console.log('[App] Images in final object:', newAnn.images);
      await api.announcements.create(newAnn);
      setAnnouncements([newAnn, ...announcements]);
  };

  const handleConfirmRead = async (annId: string) => {
      if(!currentUser) return;
      try {
          await api.announcements.markRead(annId, currentUser.id);
          // 重新加載公告列表以確保前後端狀態同步
          const updatedAnnouncements = await api.announcements.getAll();
          setAnnouncements(Array.isArray(updatedAnnouncements) ? updatedAnnouncements : []);
          toast.success('已確認閱讀');
      } catch (error) {
          console.error('標記已讀失敗:', error);
          toast.error('標記已讀失敗');
      }
  };

  const handleUpdateAnnouncement = async (id: string, data: Partial<Announcement>) => {
      if(!currentUser) return;
      try {
          const updated = await api.announcements.update(id, data);
          setAnnouncements(announcements.map(a => a.id === id ? updated : a));
          toast.success('公告已更新');
      } catch (error) {
          console.error('Update announcement error:', error);
          toast.error('更新公告失敗');
      }
  };

  const handleDeleteAnnouncement = async (id: string) => {
      if(!currentUser) return;
      if(!window.confirm('確定要刪除此公告嗎？')) return;
      try {
          await api.announcements.delete(id);
          setAnnouncements(announcements.filter(a => a.id !== id));
          toast.success('公告已刪除');
      } catch (error) {
          console.error('Delete announcement error:', error);
          toast.error('刪除公告失敗');
      }
  };

  const handleCreateReport = async (content: DailyReportContent, type: ReportType) => {
      if(!currentUser) return;
      setReportProcessing(true);
      const newReport: Report = {
          id: `rep-${Date.now()}`,
          type,
          userId: currentUser.id,
          createdAt: new Date().toISOString().split('T')[0],
          content
      };
      const savedReport = await api.reports.create(newReport);
      // 使用後端返回的完整報表對象（已在 api.ts 中處理）
      setReports([savedReport, ...reports]);
      setReportProcessing(false);
      setIsCreatingReport(false);
  };

  const handleAddFinanceRecord = async (record: Omit<FinanceRecord, 'id'>) => {
      const result = await api.finance.create(record as FinanceRecord);
      // 使用後端返回的記錄（包含正確的 ID）
      const newRecord: FinanceRecord = {
          ...record,
          id: result.id || `fr-${Date.now()}`,
          status: result.status || record.status
      };
      setFinanceRecords([newRecord, ...financeRecords]);
  };

  const handleConfirmFinanceRecord = async (id: string) => {
      await api.finance.confirm(id);
      setFinanceRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'COMPLETED' } : r));
  };

  const handleDeleteFinanceRecord = async (id: string) => {
      await api.finance.delete(id);
      setFinanceRecords(financeRecords.filter(r => r.id !== id));
  };

  const handleAddSuggestion = async (suggestion: Omit<Suggestion, 'id' | 'status' | 'upvotes' | 'comments' | 'createdAt'>) => {
      const newSuggestion: Suggestion = {
          ...suggestion,
          id: `sug-${Date.now()}`,
          status: SuggestionStatus.OPEN,
          upvotes: [],
          comments: [],
          createdAt: new Date().toISOString().split('T')[0]
      };
      await api.forum.create(newSuggestion);
      setSuggestions([newSuggestion, ...suggestions]);
  };

  const handleUpdateSuggestionStatus = async (id: string, status: SuggestionStatus) => {
      const sug = suggestions.find(s => s.id === id);
      if (sug) {
          const updated = { ...sug, status };
          await api.forum.update(updated);
          setSuggestions(prev => prev.map(s => s.id === id ? updated : s));
      }
  };

  const handleToggleUpvote = async (id: string) => {
      if (!currentUser) return;
      const sug = suggestions.find(s => s.id === id);
      if (sug) {
          const hasUpvoted = sug.upvotes.includes(currentUser.id);
          const newUpvotes = hasUpvoted 
              ? sug.upvotes.filter(uid => uid !== currentUser.id) 
              : [...sug.upvotes, currentUser.id];
          const updated = { ...sug, upvotes: newUpvotes };
          await api.forum.update(updated);
          setSuggestions(prev => prev.map(s => s.id === id ? updated : s));
      }
  };

  const handleAddSuggestionComment = async (suggestionId: string, content: string) => {
      if (!currentUser) return;
      let isOfficial = false;
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER) {
          isOfficial = true;
      } else if (currentUser.role === Role.SUPERVISOR && suggestion?.targetDeptId === currentUser.department) {
          isOfficial = true;
      }
      
      // 使用專門的評論 API
      const result = await api.forum.addComment(suggestionId, content, isOfficial);
      
      // 使用後端返回的評論資料更新本地狀態
      const newComment: SuggestionComment = {
          id: result.comment?.id || `c-${Date.now()}`,
          userId: result.comment?.author_id || currentUser.id,
          content,
          createdAt: result.comment?.created_at || new Date().toISOString().split('T')[0],
          isOfficialReply: isOfficial
      };
      
      if (suggestion) {
          const updated = { ...suggestion, comments: [...suggestion.comments, newComment] };
          setSuggestions(prev => prev.map(s => s.id === suggestionId ? updated : s));
      }
  };

  const handleNotificationClick = () => {
    setCurrentPage('tasks');
    setBoardTab('my_tasks');
    setSearchQuery('');
    setSearchStartDate('');
    setSearchEndDate('');
    
    const target = tasks.find(t => (t.assignedToUserId === currentUser?.id || t.acceptedByUserId === currentUser?.id) && !t.isArchived);
    if (target) {
        setHighlightId(target.id);
        setExpandedTaskId(target.id);
        setTimeout(() => {
            if (taskListRef.current) taskListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        setTimeout(() => setHighlightId(null), 2500);
    }
  };

  const toggleExpandTask = (taskId: string) => {
     if (expandedTaskId !== taskId && currentUser) {
         setTasks(prevTasks => prevTasks.map(t => {
             if (t.id === taskId && t.unreadUpdatesForUserIds?.includes(currentUser.id)) {
                 return {
                     ...t,
                     unreadUpdatesForUserIds: t.unreadUpdatesForUserIds.filter(id => id !== currentUser.id)
                 };
             }
             return t;
         }));
     }
     setExpandedTaskId(prev => prev === taskId ? null : taskId);
  };

  const displayedTasks = useMemo(() => {
    if (!currentUser) return [];
    if (!Array.isArray(tasks)) return [];
    let filtered = tasks;

    console.log('[App] displayedTasks 計算:', {
        boardTab,
        totalTasks: tasks.length,
        tasksWithArchiveStatus: tasks.map(t => ({
            id: t.id,
            title: t.title,
            isArchived: t.isArchived,
            status: t.status
        }))
    });

    if (boardTab === 'archived') {
        // 已封存或已取消的任務都顯示在此分頁
        filtered = filtered.filter(t => t.isArchived || t.status === TaskStatus.CANCELLED);
        console.log('[App] 封存頁篩選結果:', {
            filteredCount: filtered.length,
            filtered: filtered.map(t => ({
                id: t.id,
                title: t.title,
                isArchived: t.isArchived,
                status: t.status
            }))
        });
    } else {
        // 排除已封存和已取消的任務
        filtered = filtered.filter(t => !t.isArchived && t.status !== TaskStatus.CANCELLED);
        if (boardTab === 'my_tasks') {
            filtered = filtered.filter(t => t.assignedToUserId === currentUser.id || t.acceptedByUserId === currentUser.id || t.createdBy === currentUser.id);
        } else if (boardTab === 'available') {
            // 待接取：公開任務 + 指派給我的任務 + 指派給我部門的任務
            filtered = filtered.filter(t => {
                // 公開任務（未指派給任何人或部門）
                if (t.status === TaskStatus.OPEN && !t.assignedToUserId && !t.assignedToDepartment) {
                    return true;
                }
                // 指派給我的任務
                if (t.assignedToUserId === currentUser.id && t.status !== TaskStatus.COMPLETED) {
                    return true;
                }
                // 指派給我部門的任務（員工和主管都可以接取）
                if (t.assignedToDepartment === currentUser.department && t.status !== TaskStatus.COMPLETED) {
                    return true;
                }
                return false;
            });
        }
    }
    
    if (selectedDate) filtered = filtered.filter(t => t.deadline && t.deadline.startsWith(selectedDate));
    if (searchQuery) filtered = filtered.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    if (boardTab === 'all' && selectedTaskCategory) {
        if (selectedTaskCategory === 'OPEN') filtered = filtered.filter(t => !t.targetDepartment);
        else filtered = filtered.filter(t => t.targetDepartment === selectedTaskCategory);
    }
    return filtered;
  }, [tasks, boardTab, currentUser, searchQuery, selectedTaskCategory, selectedDate]);

  const deptGroups = useMemo(() => {
     if (boardTab !== 'all' || !currentUser) return { openTasks: [], groups: [] };
     if (!Array.isArray(displayedTasks) || !Array.isArray(departments)) return { openTasks: [], groups: [] };
     const openTasks = displayedTasks.filter(t => !t.targetDepartment);
     let visibleDepts = departments;
     if (currentUser.role === Role.EMPLOYEE) visibleDepts = departments.filter(d => d.id === currentUser.department);
     const groups = visibleDepts.map(d => ({ def: d, tasks: displayedTasks.filter(t => t.targetDepartment === d.id) }));
     return { openTasks, groups };
  }, [displayedTasks, boardTab, departments, currentUser]);

  // 計算任務通知數量
  const taskNotificationCount = useMemo(() => {
    if (!currentUser) return 0;
    return tasks.filter(t => 
      !t.isArchived && (
        // 新分配給我的任務（ASSIGNED 狀態且尚未接受）
        (t.status === TaskStatus.ASSIGNED && t.assignedToUserId === currentUser.id) ||
        // 公開任務（OPEN 狀態且未指定特定人員，任何人都可以接取）
        (t.status === TaskStatus.OPEN && !t.assignedToUserId) ||
        // 有未讀更新的任務
        (t.unreadUpdatesForUserIds?.includes(currentUser.id))
      )
    ).length;
  }, [tasks, currentUser]);

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  const renderSidebarItem = (id: MenuItemId) => {
      const config = MENU_LABELS[id];
      if (!config) return null;
      if (id === 'team' && !(hasPermission(currentUser!, 'CREATE_TASK') || currentUser!.role === Role.BOSS || currentUser!.role === Role.MANAGER || currentUser!.role === Role.SUPERVISOR)) return null;
      if (id === 'personnel' && !(hasPermission(currentUser!, 'MANAGE_USERS') || currentUser!.role === Role.BOSS || currentUser!.role === Role.MANAGER || currentUser!.role === Role.SUPERVISOR)) return null;
      if (id === 'settings' && !(currentUser!.role === Role.BOSS || hasPermission(currentUser!, 'SYSTEM_RESET'))) return null;
      if (id === 'data_center' && !(currentUser!.role === Role.BOSS || currentUser!.role === Role.MANAGER || currentUser!.role === Role.SUPERVISOR)) return null;

      return (
        <button 
            key={id}
            onClick={() => { setCurrentPage(id); setIsCreatingReport(false); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-bold ${currentPage === id ? (id === 'settings' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700 shadow-sm') : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
        >
            <span className="text-lg">{config.icon}</span>
            {config.label}
            {id === 'tasks' && taskNotificationCount > 0 && <span className="ml-auto bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-black">{taskNotificationCount}</span>}
            {id === 'chat' && unreadChatCount > 0 && <span className="ml-auto bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-black">{unreadChatCount}</span>}
        </button>
      );
  };

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 font-bold">載入中...</p>
          </div>
      );
  }

  if (isSetupMode) {
      return <SetupPage onComplete={handleSetupComplete} isProcessing={isProcessingSetup} />;
  }

  if (!currentUser) {
    return <LoginPage users={users} onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans bg-slate-50 text-slate-900">
      
      {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <aside className={`w-72 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-50 fixed inset-y-0 left-0 transform transition-transform duration-300 md:translate-x-0 md:static ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-xl">🏢</div>
            <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">企業管理系統</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                loadData(true);
                toast.success('資料已更新');
              }} 
              className="hidden md:flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition active:scale-95"
              title="手動更新所有資料"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm font-bold">更新資料</span>
            </button>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
          </div>
        </div>

        <div className="p-6">
          <button onClick={() => { setEditingUser(currentUser); setUserModalOpen(true); }} className="w-full text-left bg-slate-50 rounded-2xl border border-slate-200 p-4 shadow-sm group hover:border-blue-300 transition">
            <div className="flex items-center gap-3">
               <img src={currentUser.avatar} className="w-12 h-12 rounded-full border border-slate-200" />
               <div className="min-w-0">
                  <h2 className="font-bold text-slate-800 truncate">{currentUser.name}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{getDeptName(currentUser.department)}</p>
               </div>
            </div>
          </button>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto pb-4 space-y-4">
          {Array.isArray(menuGroups) && menuGroups.map(group => {
              if (!group || !Array.isArray(group.items)) return null;
              const items = group.items.map(id => renderSidebarItem(id)).filter(Boolean);
              if (items.length === 0) return null;
              return (
                  <div key={group.id} className="space-y-1">
                      <h3 className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 mt-2">{group.label}</h3>
                      {items}
                  </div>
              );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
           <button onClick={() => setChangePasswordOpen(true)} className="w-full py-3 bg-slate-50 text-slate-500 rounded-xl font-bold hover:bg-blue-50 hover:text-blue-600 transition flex items-center justify-center gap-2">🔐 修改密碼</button>
           <button onClick={handleLogout} className="w-full py-3 bg-slate-50 text-slate-500 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition flex items-center justify-center gap-2">登出系統</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-white md:bg-slate-50">
        <header className="bg-white border-b border-slate-200 py-3 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
           <div className="flex items-center gap-3">
              <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 active:scale-95 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"></path></svg></button>
              <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight truncate">{MENU_LABELS[currentPage]?.label}</h2>
           </div>
           <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  loadData(true);
                  toast.success('資料已更新');
                }} 
                className="md:hidden p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition active:scale-95"
                title="更新資料"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <div className="hidden md:flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-400">已連線</span>
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-8 pb-20 md:pb-8">
           <Suspense fallback={<PageSkeleton />}>
             {currentPage === 'dashboard' && <DashboardView currentUser={currentUser} tasks={tasks} announcements={announcements} reports={reports} departments={departments} onChangePage={setCurrentPage} />}
             {currentPage === 'bulletin' && <BulletinView currentUser={currentUser} announcements={announcements} users={users} departments={departments} onCreateAnnouncement={handleCreateAnnouncement} onUpdateAnnouncement={handleUpdateAnnouncement} onDeleteAnnouncement={handleDeleteAnnouncement} onConfirmRead={handleConfirmRead} />}
             {currentPage === 'leaves' && <LeaveManagementView currentUser={currentUser} users={users} departments={departments} leaves={leaves} onRefresh={() => loadData(true)} />}
             {currentPage === 'personnel' && <PersonnelView currentUser={currentUser} users={users} departments={departments} onAddUser={() => { setEditingUser(null); setUserModalOpen(true); }} onEditUser={(u) => { setEditingUser(u); setUserModalOpen(true); }} onDeleteUser={handleDeleteUser} onAddDepartment={handleAddDepartment} onUpdateDepartment={handleUpdateDepartment} onDeleteDepartment={handleDeleteDepartment} />}
             {currentPage === 'team' && (
               <div className="space-y-4">
                 <div className="flex gap-2 border-b border-slate-200 pb-2">
                   <button
                     onClick={() => setTeamViewTab('tasks')}
                     className={`px-4 py-2 rounded-lg font-bold transition ${
                       teamViewTab === 'tasks'
                         ? 'bg-blue-600 text-white'
                         : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                     }`}
                   >
                     📋 任務狀況
                   </button>
                   <button
                     onClick={() => setTeamViewTab('routines')}
                     className={`px-4 py-2 rounded-lg font-bold transition ${
                       teamViewTab === 'routines'
                         ? 'bg-blue-600 text-white'
                         : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                     }`}
                   >
                     ✓ 每日任務執行狀況
                   </button>
                 </div>
                 {teamViewTab === 'tasks' && <SubordinateView currentUser={currentUser} users={users} tasks={tasks} departments={departments} />}
                 {teamViewTab === 'routines' && <SubordinateRoutineView currentUser={currentUser} users={users} departments={departments} />}
               </div>
             )}
             {currentPage === 'reports' && (isCreatingReport ? <CreateReportView onCancel={() => setIsCreatingReport(false)} onSubmit={handleCreateReport} isProcessing={isReportProcessing} /> : <ReportView currentUser={currentUser} users={users} reports={reports} departments={departments} onCreateClick={() => setIsCreatingReport(true)} onOpenReportModal={() => setIsCreatingReport(true)} />)}
             {currentPage === 'finance' && <FinanceView currentUser={currentUser} users={users} departments={departments} records={financeRecords} onAddRecord={handleAddFinanceRecord} onConfirmRecord={handleConfirmFinanceRecord} onDeleteRecord={handleDeleteFinanceRecord} />}
             {currentPage === 'data_center' && <DepartmentDataView currentUser={currentUser} users={users} departments={departments} tasks={tasks} reports={reports} financeRecords={financeRecords} />}
             {currentPage === 'forum' && <ForumView currentUser={currentUser} users={users} suggestions={suggestions} departments={departments} onAddSuggestion={handleAddSuggestion} onUpdateStatus={handleUpdateSuggestionStatus} onToggleUpvote={handleToggleUpvote} onAddComment={handleAddSuggestionComment} />}
             {currentPage === 'chat' && <ChatSystem currentUser={currentUser} users={users} departments={departments} />}
             {currentPage === 'memo' && <MemoView currentUser={currentUser} />}
             {currentPage === 'performance' && <PerformanceView currentUser={currentUser} users={users} departments={departments} />}
             {currentPage === 'sop' && <SOPView currentUser={currentUser} users={users} departments={departments} />}
             {currentPage === 'settings' && <SystemSettingsView currentUser={currentUser} onLogout={handleLogout} />}
           </Suspense>
           
           {currentPage === 'tasks' && (
             <div className="max-w-6xl mx-auto pb-20">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">任務看板</h2>
                  {(hasPermission(currentUser, 'CREATE_TASK') || currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER || currentUser.role === Role.SUPERVISOR) && (
                    <button onClick={() => { setEditingTask(null); setCreateModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition">＋ 建立任務</button>
                  )}
               </div>
               {/* 搜尋欄 */}
               <div className="mb-6">
                 <div className="relative">
                   <input
                     type="text"
                     placeholder="🔍 搜尋任務標題或描述..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full px-4 py-3 pl-12 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                   />
                   <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                   </svg>
                   {searchQuery && (
                     <button
                       onClick={() => setSearchQuery('')}
                       className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                     >
                       ✕
                     </button>
                   )}
                 </div>
                 {searchQuery && (
                   <div className="mt-2 text-sm text-slate-500">
                     找到 <span className="font-bold text-blue-600">{displayedTasks.length}</span> 個符合「{searchQuery}」的任務
                   </div>
                 )}
               </div>

               <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                 {['all', 'my_tasks', 'available', 'archived'].map(tab => (
                   <button key={tab} onClick={() => { setBoardTab(tab as any); setSelectedTaskCategory(null); }} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${boardTab === tab ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                      {tab === 'all' ? '總覽' : tab === 'my_tasks' ? '我的任務' : tab === 'available' ? '📋 待接取' : '已封存'}
                   </button>
                 ))}
               </div>
               <div className="grid grid-cols-1 gap-6">
                 {displayedTasks.map(t => <TaskCard key={t.id} task={t} currentUser={currentUser} users={users} departments={departments} onAccept={handleAcceptTask} onUpdateProgress={handleUpdateProgress} onArchive={handleArchiveTask} onEdit={handleEditTask} onDelete={handleDeleteTask} onCancel={handleCancelTask} onReopen={handleReopenTask} isHighlighted={t.id === highlightId} isExpanded={expandedTaskId === t.id} onToggleExpand={() => toggleExpandTask(t.id)} />)}
                 {displayedTasks.length === 0 && <div className="text-center py-20 text-slate-400 font-bold border-2 border-dashed rounded-2xl">目前沒有任務</div>}
               </div>
             </div>
           )}
        </div>
      </main>

      <CreateTaskModal isOpen={isCreateModalOpen} onClose={() => { setCreateModalOpen(false); setEditingTask(null); }} onSubmit={handleAddTask} users={users} currentUser={currentUser} departments={departments} editingTask={editingTask} />
      <UserModal isOpen={isUserModalOpen} onClose={() => { setUserModalOpen(false); setEditingUser(null); }} onSubmit={editingUser ? handleUpdateUser : handleAddUser} currentUser={currentUser} editingUser={editingUser} departments={departments} />
      {isChangePasswordOpen && <ChangePasswordModal userId={currentUser.id} userName={currentUser.name} onClose={() => setChangePasswordOpen(false)} onSuccess={() => {}} />}
      
      {/* 任務通知 */}
      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />
      
      {/* 手機底部導航欄 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          <button
            onClick={() => { setCurrentPage('dashboard'); setIsMobileMenuOpen(false); }}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition active:scale-95 ${currentPage === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <span className="text-xl">{MENU_LABELS['dashboard']?.icon}</span>
            <span className="text-[10px] font-bold">首頁</span>
          </button>
          <button
            onClick={() => { setCurrentPage('tasks'); setIsMobileMenuOpen(false); }}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition active:scale-95 ${currentPage === 'tasks' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <span className="text-xl">{MENU_LABELS['tasks']?.icon}</span>
            <span className="text-[10px] font-bold">任務</span>
          </button>
          <button
            onClick={() => { setCurrentPage('chat'); setIsMobileMenuOpen(false); }}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition active:scale-95 relative ${currentPage === 'chat' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <span className="text-xl">{MENU_LABELS['chat']?.icon}</span>
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
            <span className="text-[10px] font-bold">聊天</span>
          </button>
          <button
            onClick={() => { setCurrentPage('data_center'); setIsMobileMenuOpen(false); }}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition active:scale-95 ${currentPage === 'data_center' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <span className="text-xl">{MENU_LABELS['data_center']?.icon}</span>
            <span className="text-[10px] font-bold">數據</span>
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition active:scale-95 text-slate-400"
          >
            <span className="text-xl">☰</span>
            <span className="text-[10px] font-bold">更多</span>
          </button>
        </div>
      </nav>

      {/* 版本號顯示 */}
      <div className="hidden md:block fixed bottom-2 right-2 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded shadow-sm">
        後端版本: {backendVersion}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
