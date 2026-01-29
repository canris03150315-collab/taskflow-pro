import React, { useState, useMemo } from 'react';
import { User, Role, DepartmentDef, hasPermission } from '../types';
import { api } from '../services/api';
import { useToast } from './Toast';

interface LeaveRequest {
  id: string;
  user_id: string;
  department_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  start_period: string;
  end_period: string;
  days: number;
  reason: string;
  status: string;
  has_conflict: number;
  conflict_details: string | null;
  conflict_override: number;
  approver_id: string | null;
  approval_notes: string | null;
  approved_at: string | null;
  proxy_user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface LeaveManagementViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
  leaves: LeaveRequest[];
  onRefresh: () => void;
}

const LEAVE_TYPES = [
  { value: 'SICK', label: '病假', color: 'bg-red-100 text-red-800' },
  { value: 'PERSONAL', label: '事假', color: 'bg-blue-100 text-blue-800' },
  { value: 'ANNUAL', label: '特休', color: 'bg-green-100 text-green-800' },
  { value: 'MARRIAGE', label: '婚假', color: 'bg-pink-100 text-pink-800' },
  { value: 'BEREAVEMENT', label: '喪假', color: 'bg-gray-100 text-gray-800' },
  { value: 'MATERNITY', label: '產假', color: 'bg-purple-100 text-purple-800' },
  { value: 'MENSTRUAL', label: '生理假', color: 'bg-rose-100 text-rose-800' },
];

const STATUS_CONFIG = {
  PENDING: { label: '待審核', color: 'bg-yellow-100 text-yellow-800' },
  CONFLICT: { label: '有衝突', color: 'bg-orange-100 text-orange-800' },
  APPROVED: { label: '已批准', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: '已駁回', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
};

export function LeaveManagementView({ currentUser, users, departments, leaves, onRefresh }: LeaveManagementViewProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'leave' | 'schedule'>('schedule'); // 預設顯示排班
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'rules'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduleViewMode, setScheduleViewMode] = useState<'list' | 'calendar'>('calendar');
  const [selectedDepartment, setSelectedDepartment] = useState<string>(currentUser.department);
  const [selectedMonth, setSelectedMonth] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [editSelectedDays, setEditSelectedDays] = useState<number[]>([]);
  const [showFullCalendar, setShowFullCalendar] = useState(false); // 手機版月曆展開狀態
  
  // Apply form state
  const [applyForm, setApplyForm] = useState({
    leave_type: 'ANNUAL',
    start_date: '',
    end_date: '',
    days: 1,
    reason: ''
  });
  
  // Rules form state
  const [rulesForm, setRulesForm] = useState({
    max_days_per_month: 8,
    submission_deadline: 3,
    min_on_duty_staff: 3,
    max_concurrent_leaves: 2,
    min_advance_days: 3
  });
  
  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState(() => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return {
      month: nextMonth.getMonth() + 1,
      year: nextMonth.getFullYear(),
      selectedDays: [] as number[],
      maxDays: 8 // 預設每月8天
    };
  });

  // Permission checks
  const canApprove = currentUser.role === 'BOSS' || 
                     currentUser.role === 'MANAGER' || 
                     currentUser.role === 'SUPERVISOR' ||
                     hasPermission(currentUser, 'APPROVE_LEAVES');
  
  const canManageRules = currentUser.role === 'BOSS' || 
                         currentUser.role === 'MANAGER' ||
                         currentUser.role === 'SUPERVISOR' ||
                         hasPermission(currentUser, 'MANAGE_LEAVE_RULES');

  // Filter leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter(leave => {
      if (filterStatus !== 'all' && leave.status !== filterStatus) return false;
      if (filterType !== 'all' && leave.leave_type !== filterType) return false;
      return true;
    });
  }, [leaves, filterStatus, filterType]);

  // Get user name
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || '未知用戶';
  };

  // Get department name
  const getDeptName = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || '未知部門';
  };

  // Handle approve
  const handleApprove = async (leaveId: string, overrideConflict: boolean = false) => {
    try {
      const result = await api.leaves.approve(leaveId, {
        approval_notes: overrideConflict ? '主管覆蓋衝突批准' : '',
        conflict_override: overrideConflict
      });
      console.log('批准成功:', result);
      toast.success('假期已批准');
      onRefresh();
    } catch (error: any) {
      console.error('批准失敗:', error);
      toast.error(error?.message || '批准失敗');
    }
  };

  // Handle reject
  const handleReject = async (leaveId: string, notes: string) => {
    try {
      const result = await api.leaves.reject(leaveId, { approval_notes: notes });
      console.log('駁回成功:', result);
      toast.success('假期已駁回');
      onRefresh();
    } catch (error: any) {
      console.error('駁回失敗:', error);
      toast.error(error?.message || '駁回失敗');
    }
  };

  // Handle cancel
  const handleCancel = async (leaveId: string) => {
    if (!confirm('確定要取消這個假期申請嗎？')) return;
    
    try {
      await api.leaves.delete(leaveId);
      console.log('取消成功');
      toast.success('假期已取消');
      onRefresh();
    } catch (error: any) {
      console.error('取消失敗:', error);
      toast.error(error?.message || '取消失敗');
    }
  };

  // Handle apply leave
  const handleApplyLeave = async () => {
    if (!applyForm.start_date || !applyForm.end_date) {
      toast.error('請選擇開始和結束日期');
      return;
    }
    
    try {
      await api.leaves.create(applyForm);
      toast.success('假期申請已提交');
      setShowApplyModal(false);
      setApplyForm({
        leave_type: 'ANNUAL',
        start_date: '',
        end_date: '',
        days: 1,
        reason: ''
      });
      onRefresh();
    } catch (error: any) {
      console.error('申請失敗:', error);
      toast.error(error?.message || '申請失敗');
    }
  };

  // Handle update rules
  const handleUpdateRules = async () => {
    try {
      await api.leaves.updateRules(currentUser.department, rulesForm);
      toast.success('規則已更新');
      setShowRulesModal(false);
    } catch (error: any) {
      console.error('更新失敗:', error);
      toast.error(error?.message || '更新失敗');
    }
  };

  // Calculate days between dates
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Toggle schedule day
  const toggleScheduleDay = (day: number) => {
    const newSelectedDays = scheduleForm.selectedDays.includes(day)
      ? scheduleForm.selectedDays.filter(d => d !== day)
      : [...scheduleForm.selectedDays, day];
    
    setScheduleForm({ ...scheduleForm, selectedDays: newSelectedDays });
  };

  // Change schedule month
  const changeScheduleMonth = (direction: 'prev' | 'next') => {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const selectedMonth = new Date(scheduleForm.year, scheduleForm.month - 1, 1);
    
    let newMonth: Date;
    if (direction === 'prev') {
      newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
      // 不能選擇當月之前的月份
      if (newMonth < currentMonth) {
        toast.error('不能選擇當月之前的月份');
        return;
      }
    } else {
      newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
      // 最多只能選擇未來 3 個月
      const maxMonth = new Date(today.getFullYear(), today.getMonth() + 3, 1);
      if (newMonth > maxMonth) {
        toast.error('最多只能選擇未來 3 個月');
        return;
      }
    }
    
    setScheduleForm({
      ...scheduleForm,
      year: newMonth.getFullYear(),
      month: newMonth.getMonth() + 1,
      selectedDays: [] // 切換月份時清空已選日期
    });
  };

  // Handle submit schedule
  const handleSubmitSchedule = async () => {
    if (scheduleForm.selectedDays.length === 0) {
      toast.error('請至少選擇一天休息日');
      return;
    }
    
    if (scheduleForm.selectedDays.length > scheduleForm.maxDays) {
      toast.error(`最多只能選擇 ${scheduleForm.maxDays} 天`);
      return;
    }
    
    try {
      await api.schedules.submit({
        year: scheduleForm.year,
        month: scheduleForm.month,
        selectedDays: scheduleForm.selectedDays
      });
      console.log('提交排班成功');
      toast.success('排班已提交，等待主管審核');
      setShowScheduleModal(false);
      setScheduleForm({
        ...scheduleForm,
        selectedDays: []
      });
      onRefresh();
    } catch (error: any) {
      console.error('提交失敗:', error);
      toast.error(error?.message || '提交失敗');
    }
  };

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  // Load schedules
  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await api.schedules.getAll();
      setSchedules(data);
    } catch (error: any) {
      console.error('載入排班失敗:', error);
      toast.error('載入排班失敗');
    } finally {
      setLoading(false);
    }
  };

  // Load schedule rules
  const loadScheduleRules = async (deptId?: string) => {
    const targetDept = deptId || selectedDepartment || currentUser.department;
    
    try {
      const rules = await api.schedules.getRules(targetDept);
      if (rules) {
        setRulesForm({
          max_days_per_month: rules.max_days_per_month || 8,
          submission_deadline: rules.submission_deadline || 3,
          min_on_duty_staff: rules.min_on_duty_staff || 3
        });
      }
    } catch (error: any) {
      console.error('載入規則失敗:', error);
    }
  };

  // Save schedule rules
  const handleSaveScheduleRules = async () => {
    try {
      // 使用 selectedDepartment 而非 currentUser.department，支持跨部門修改
      const targetDept = canApprove ? selectedDepartment : currentUser.department;
      await api.schedules.updateRules(targetDept, rulesForm);
      toast.success('規則設定已保存');
      setShowRulesModal(false);
    } catch (error: any) {
      console.error('保存規則失敗:', error);
      toast.error(error?.message || '保存規則失敗');
    }
  };

  // Handle approve schedule
  const handleApproveSchedule = async (scheduleId: string) => {
    try {
      await api.schedules.approve(scheduleId, {});
      toast.success('排班已批准');
      loadSchedules();
    } catch (error: any) {
      console.error('批准失敗:', error);
      toast.error(error?.message || '批准失敗');
    }
  };

  // Handle reject schedule
  const handleRejectSchedule = async (scheduleId: string) => {
    const notes = prompt('請輸入駁回原因:');
    if (!notes) return;
    
    try {
      await api.schedules.reject(scheduleId, { review_notes: notes });
      toast.success('排班已駁回');
      loadSchedules();
    } catch (error: any) {
      console.error('駁回失敗:', error);
      toast.error(error?.message || '駁回失敗');
    }
  };

  // Handle edit schedule
  const handleEditSchedule = (schedule: any) => {
    setEditingSchedule(schedule);
    const selectedDays = JSON.parse(schedule.selected_days || '[]');
    setEditSelectedDays(selectedDays);
    setShowEditScheduleModal(true);
  };

  // Toggle edit day
  const toggleEditDay = (day: number) => {
    if (editSelectedDays.includes(day)) {
      setEditSelectedDays(editSelectedDays.filter(d => d !== day));
    } else {
      setEditSelectedDays([...editSelectedDays, day]);
    }
  };

  // Handle save edited schedule
  const handleSaveEditedSchedule = async () => {
    if (!editingSchedule) return;
    
    if (editSelectedDays.length === 0) {
      toast.error('請至少選擇一天休息日');
      return;
    }
    
    try {
      await api.schedules.update(editingSchedule.id, {
        selectedDays: editSelectedDays
      });
      toast.success('排班已調整並重新檢查衝突');
      setShowEditScheduleModal(false);
      setEditingSchedule(null);
      setEditSelectedDays([]);
      loadSchedules();
    } catch (error: any) {
      console.error('調整失敗:', error);
      toast.error(error?.message || '調整失敗');
    }
  };

  // Load schedules and rules when tab changes
  React.useEffect(() => {
    if (activeTab === 'schedule') {
      loadSchedules();
      loadScheduleRules();
    }
  }, [activeTab]);

  // Update schedule form maxDays when rules change
  React.useEffect(() => {
    setScheduleForm(prev => ({
      ...prev,
      maxDays: rulesForm.max_days_per_month
    }));
  }, [rulesForm.max_days_per_month]);

  // Load rules when department changes
  React.useEffect(() => {
    if (activeTab === 'schedule') {
      loadScheduleRules(canApprove ? selectedDepartment : currentUser.department);
    }
  }, [selectedDepartment, activeTab]);

  // Get approved schedules for calendar view
  const getApprovedSchedules = () => {
    return schedules.filter(s => 
      s.status === 'APPROVED' && 
      s.year === selectedMonth.year && 
      s.month === selectedMonth.month &&
      (canApprove 
        ? s.department_id === selectedDepartment 
        : (s.user_id === currentUser.id || s.department_id === currentUser.department)
      )
    );
  };

  // Memoized approved schedules
  const approvedSchedules = useMemo(() => {
    return getApprovedSchedules();
  }, [schedules, selectedMonth.year, selectedMonth.month, selectedDepartment, canApprove, currentUser.id, currentUser.department]);

  // Memoized department users
  const deptUsers = useMemo(() => {
    return users.filter(u => u.department === selectedDepartment);
  }, [users, selectedDepartment]);

  // Get users on duty for a specific day (use memoized data)
  const getUsersOnDuty = (day: number) => {
    const targetDate = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return deptUsers.filter(user => {
      // 檢查排班休息日
      const userSchedule = approvedSchedules.find(s => s.user_id === user.id);
      if (userSchedule) {
        const offDays = JSON.parse(userSchedule.selected_days || '[]');
        if (offDays.includes(day)) return false; // 在排班休息日，不上班
      }
      
      // 檢查請假狀態
      const userLeaves = leaves.filter(leave => 
        leave.user_id === user.id && 
        leave.status === 'APPROVED' &&
        leave.start_date <= targetDate &&
        leave.end_date >= targetDate
      );
      if (userLeaves.length > 0) return false; // 有批准的請假，不上班
      
      return true; // 沒有休息也沒有請假，視為上班
    });
  };

  // Get users off duty for a specific day (use memoized data)
  const getUsersOffDuty = (day: number) => {
    const targetDate = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return deptUsers.filter(user => {
      // 檢查排班休息日
      const userSchedule = approvedSchedules.find(s => s.user_id === user.id);
      if (userSchedule) {
        const offDays = JSON.parse(userSchedule.selected_days || '[]');
        if (offDays.includes(day)) return true; // 在排班休息日
      }
      
      // 檢查請假狀態
      const userLeaves = leaves.filter(leave => 
        leave.user_id === user.id && 
        leave.status === 'APPROVED' &&
        leave.start_date <= targetDate &&
        leave.end_date >= targetDate
      );
      if (userLeaves.length > 0) return true; // 有批准的請假
      
      return false; // 既沒有休息也沒有請假
    });
  };

  // Memoized daily stats for calendar rendering
  const dailyStats = useMemo(() => {
    const getDaysInMonth = (year: number, month: number) => {
      return new Date(year, month, 0).getDate();
    };
    const daysInMonth = getDaysInMonth(selectedMonth.year, selectedMonth.month);
    const stats: Record<number, { onDuty: User[]; offDuty: User[] }> = {};
    
    for (let day = 1; day <= daysInMonth; day++) {
      stats[day] = {
        onDuty: getUsersOnDuty(day),
        offDuty: getUsersOffDuty(day)
      };
    }
    return stats;
  }, [approvedSchedules, deptUsers, selectedMonth, leaves]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">假表管理</h1>
            <p className="text-sm text-slate-500 mt-1">管理假期申請與排班</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'schedule' && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold"
              >
                📅 提交排班
              </button>
            )}
            {activeTab === 'leave' && (
              <button
                onClick={() => setShowApplyModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold"
              >
                + 申請假期
              </button>
            )}
            {canManageRules && (
              <button
                onClick={() => {
                  setShowRulesModal(true);
                  loadScheduleRules();
                }}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition font-bold"
              >
                ⚙️ 規則設定
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-6 py-3 font-bold transition border-b-2 ${
              activeTab === 'schedule'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            📅 月度排班
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            className={`px-6 py-3 font-bold transition border-b-2 ${
              activeTab === 'leave'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            🏖️ 請假管理
          </button>
        </div>

        {/* Schedule View Mode and Department Selector */}
        {activeTab === 'schedule' && (
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              <button
                onClick={() => setScheduleViewMode('calendar')}
                className={`px-4 py-2 rounded-lg font-bold transition ${
                  scheduleViewMode === 'calendar'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                📅 月曆查看
              </button>
              <button
                onClick={() => setScheduleViewMode('list')}
                className={`px-4 py-2 rounded-lg font-bold transition ${
                  scheduleViewMode === 'list'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                📋 假表審核
              </button>
            </div>
            
            {canApprove && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-slate-700">部門:</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* View mode tabs - only for leave tab */}
        {activeTab === 'leave' && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              viewMode === 'list' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📋 列表
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              viewMode === 'calendar' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📅 行事曆
          </button>
        </div>
        )}
      </div>

      {/* Filters - only for leave tab */}
      {activeTab === 'leave' && (
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex gap-4">
          <div>
            <label className="text-sm text-slate-600 mr-2">狀態:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">全部</option>
              <option value="PENDING">待審核</option>
              <option value="CONFLICT">有衝突</option>
              <option value="APPROVED">已批准</option>
              <option value="REJECTED">已駁回</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600 mr-2">假別:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">全部</option>
              {LEAVE_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      )}

      {/* Content */}
      <div className="flex-1 p-3 sm:p-6">
        {/* Schedule Tab Content */}
        {activeTab === 'schedule' && scheduleViewMode === 'calendar' && (
          <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-6">
            {/* Rules Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-700 font-bold text-sm sm:text-base">📋 部門規則：</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <span className="text-blue-800">
                      每月最多 <span className="font-bold text-base sm:text-lg">{rulesForm.max_days_per_month}</span> 天休息
                    </span>
                    <span className="text-slate-400 hidden sm:inline">|</span>
                    <span className="text-blue-800">
                      每月 <span className="font-bold">{rulesForm.submission_deadline}</span> 號前提交
                    </span>
                    <span className="text-slate-400 hidden sm:inline">|</span>
                    <span className="text-blue-800">
                      最少 <span className="font-bold">{rulesForm.min_on_duty_staff}</span> 人在職
                    </span>
                  </div>
                </div>
                {canManageRules && (
                  <button
                    onClick={() => {
                      setShowRulesModal(true);
                      loadScheduleRules();
                    }}
                    className="text-xs sm:text-sm px-3 py-1.5 sm:py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition w-full sm:w-auto"
                  >
                    修改規則
                  </button>
                )}
              </div>
            </div>

            {/* Today Card View - All screen sizes */}
            <div className="mb-4">
              {(() => {
                const today = new Date();
                const todayDay = today.getDate();
                const onDuty = getUsersOnDuty(todayDay);
                const offDuty = getUsersOffDuty(todayDay);
                const deptUsers = users.filter(u => u.department === selectedDepartment);
                const minOnDuty = rulesForm.min_on_duty_staff;
                const hasConflict = onDuty.length < minOnDuty;

                return (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-4 shadow-lg min-h-[400px]">
                    {/* Header */}
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {today.getDate()}
                      </div>
                      <div className="text-sm text-slate-600">
                        {today.getFullYear()} 年 {today.getMonth() + 1} 月 {['日', '一', '二', '三', '四', '五', '六'][today.getDay()]}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">今日排班狀態</div>
                    </div>

                    {/* Status Cards */}
                    <div className="space-y-3 mb-4">
                      {/* Conflict Warning */}
                      {hasConflict && (
                        <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">⚠️</span>
                            <span className="font-bold text-orange-800 text-lg">人力不足警告</span>
                          </div>
                          <div className="text-orange-700 text-sm">
                            需要 <span className="font-bold text-lg">{minOnDuty}</span> 人，目前僅 <span className="font-bold text-lg">{onDuty.length}</span> 人上班
                          </div>
                        </div>
                      )}

                      {/* Off Duty */}
                      {offDuty.length > 0 && (
                        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🏖️</span>
                            <span className="font-bold text-red-800 text-lg">休息人員 ({offDuty.length})</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {offDuty.map(user => (
                              <span key={user.id} className="bg-red-200 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                                {user.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* On Duty */}
                      {onDuty.length > 0 && (
                        <div className={`border-2 rounded-lg p-3 ${
                          hasConflict ? 'bg-orange-50 border-orange-300' : 'bg-green-50 border-green-300'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">✓</span>
                            <span className={`font-bold text-lg ${hasConflict ? 'text-orange-800' : 'text-green-800'}`}>
                              上班人員 ({onDuty.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {onDuty.map(user => (
                              <span key={user.id} className={`px-3 py-1 rounded-full text-sm font-medium ${
                                hasConflict ? 'bg-orange-200 text-orange-800' : 'bg-green-200 text-green-800'
                              }`}>
                                {user.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* View Full Calendar Button */}
                    <div className="sticky bottom-0 bg-gradient-to-t from-indigo-50 pt-3 -mx-4 px-4 -mb-4 pb-4">
                      <button
                        onClick={() => setShowFullCalendar(!showFullCalendar)}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg"
                      >
                        <span>{showFullCalendar ? '收起' : '查看'}完整月曆</span>
                        <span>{showFullCalendar ? '▲' : '▼'}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Month Selector - Only visible when calendar is expanded */}
            <div className={`flex items-center justify-between mb-4 sm:mb-6 gap-2 ${showFullCalendar ? '' : 'hidden'}`}>
              <button
                onClick={() => {
                  const newMonth = selectedMonth.month === 1 ? 12 : selectedMonth.month - 1;
                  const newYear = selectedMonth.month === 1 ? selectedMonth.year - 1 : selectedMonth.year;
                  setSelectedMonth({ year: newYear, month: newMonth });
                }}
                className="px-2 sm:px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition text-sm sm:text-base flex-shrink-0"
              >
                <span className="hidden sm:inline">← 上個月</span>
                <span className="sm:hidden">←</span>
              </button>
              <h2 className="text-base sm:text-xl font-bold text-slate-800 text-center">
                {selectedMonth.year} 年 {selectedMonth.month} 月
                <span className="hidden sm:inline">排班表</span>
                {!canApprove && <span className="text-xs sm:text-sm text-slate-500 block sm:inline sm:ml-2">（我的排班）</span>}
              </h2>
              <button
                onClick={() => {
                  const newMonth = selectedMonth.month === 12 ? 1 : selectedMonth.month + 1;
                  const newYear = selectedMonth.month === 12 ? selectedMonth.year + 1 : selectedMonth.year;
                  setSelectedMonth({ year: newYear, month: newMonth });
                }}
                className="px-2 sm:px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition text-sm sm:text-base flex-shrink-0"
              >
                <span className="hidden sm:inline">下個月 →</span>
                <span className="sm:hidden">→</span>
              </button>
            </div>

            {/* Calendar Grid - Only visible when expanded */}
            <div className={`space-y-2 ${showFullCalendar ? '' : 'hidden'}`}>
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                  <div key={day} className="text-center font-bold text-slate-600 py-1 sm:py-2 text-sm sm:text-base">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {(() => {
                  const daysInMonth = getDaysInMonth(selectedMonth.year, selectedMonth.month);
                  const firstDay = getFirstDayOfMonth(selectedMonth.year, selectedMonth.month);
                  const days = [];
                  const today = new Date();
                  const isCurrentMonth = today.getFullYear() === selectedMonth.year && 
                                        today.getMonth() + 1 === selectedMonth.month;

                  // Empty cells
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`empty-${i}`} className="aspect-square" />);
                  }

                  // Days
                  for (let day = 1; day <= daysInMonth; day++) {
                    const isToday = isCurrentMonth && today.getDate() === day;
                    const onDuty = dailyStats[day]?.onDuty || [];
                    const offDuty = dailyStats[day]?.offDuty || [];
                    const isWeekend = (firstDay + day - 1) % 7 === 0 || (firstDay + day - 1) % 7 === 6;

                    days.push(
                      <div
                        key={day}
                        className={`border rounded-lg p-1 sm:p-2 min-h-[80px] sm:min-h-[120px] ${
                          isToday ? 'border-blue-500 border-2 bg-blue-50' :
                          isWeekend ? 'bg-slate-50' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-bold text-sm sm:text-base ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                            {day}
                          </span>
                          {isToday && <span className="text-[10px] sm:text-xs text-blue-600">今天</span>}
                        </div>
                        
                        <div className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs">
                          {(() => {
                            const deptUsers = users.filter(u => u.department === selectedDepartment);
                            const totalStaff = deptUsers.length;
                            const minOnDuty = rulesForm.min_on_duty_staff; // 使用規則中的值
                            const hasConflict = onDuty.length < minOnDuty;
                            
                            return (
                              <>
                                {hasConflict && (
                                  <div className="bg-orange-50 border border-orange-300 rounded px-1 py-0.5">
                                    <p className="text-orange-700 font-bold text-[10px] sm:text-xs">
                                      <span className="hidden sm:inline">⚠️ 人力不足</span>
                                      <span className="sm:hidden">⚠️ {onDuty.length}/{minOnDuty}</span>
                                    </p>
                                    <p className="text-orange-600 text-[9px] sm:text-[10px] hidden sm:block">需{minOnDuty}人，僅{onDuty.length}人</p>
                                  </div>
                                )}
                                {offDuty.length > 0 && (
                                  <div className="bg-red-50 border border-red-200 rounded px-1 py-0.5">
                                    <p className="text-red-700 font-bold text-[10px] sm:text-xs mb-1">
                                      <span className="hidden sm:inline">休息 {offDuty.length}人</span>
                                      <span className="sm:hidden">🏖️ {offDuty.length}</span>
                                    </p>
                                    <div className="flex flex-wrap gap-1 hidden sm:flex">
                                      {offDuty.map(u => (
                                        <span key={u.id} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] sm:text-xs font-medium">
                                          {u.name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {onDuty.length > 0 && !hasConflict && (
                                  <div className="bg-green-50 border border-green-200 rounded px-1 py-0.5">
                                    <p className="text-green-700 font-bold text-[10px] sm:text-xs mb-1">
                                      <span className="hidden sm:inline">上班 {onDuty.length}人</span>
                                      <span className="sm:hidden">✓ {onDuty.length}</span>
                                    </p>
                                    <div className="flex flex-wrap gap-1 hidden sm:flex">
                                      {onDuty.map(u => (
                                        <span key={u.id} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[9px] sm:text-xs font-medium">
                                          {u.name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  }

                  return days;
                })()}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 sm:mt-6 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-50 border border-red-200 rounded"></div>
                <span>休息</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-50 border border-green-200 rounded"></div>
                <span>上班</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-50 border border-orange-300 rounded"></div>
                <span className="hidden sm:inline">人力不足</span>
                <span className="sm:hidden">不足</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-blue-500 rounded"></div>
                <span>今天</span>
              </div>
            </div>
          </div>
        )}

        {/* Schedule List View */}
        {activeTab === 'schedule' && scheduleViewMode === 'list' && (
          <div className="space-y-4">
            {/* Rules Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-700 font-bold">📋 部門規則：</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-blue-800">
                      每月最多 <span className="font-bold text-lg">{rulesForm.max_days_per_month}</span> 天休息
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-blue-800">
                      每月 <span className="font-bold">{rulesForm.submission_deadline}</span> 號前提交
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-blue-800">
                      最少 <span className="font-bold">{rulesForm.min_on_duty_staff}</span> 人在職
                    </span>
                  </div>
                </div>
                {canManageRules && (
                  <button
                    onClick={() => {
                      setShowRulesModal(true);
                      loadScheduleRules();
                    }}
                    className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    修改規則
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-slate-500">載入中...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="text-center py-12">
                  <p className="text-2xl mb-4">📅</p>
                  <p className="text-lg font-bold text-slate-800 mb-2">月度排班系統</p>
                  <p className="text-slate-600 mb-4">點擊「提交排班」開始規劃下個月的休息日</p>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold"
                  >
                    📅 提交排班
                  </button>
                </div>
              </div>
            ) : (
              schedules
                .filter(schedule => !canApprove || schedule.department_id === selectedDepartment)
                .map(schedule => {
                const user = users.find(u => u.id === schedule.user_id);
                const dept = departments.find(d => d.id === schedule.department_id);
                const selectedDays = JSON.parse(schedule.selected_days || '[]');
                const canReview = canApprove && schedule.status === 'PENDING';
                
                return (
                  <div key={schedule.id} className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-slate-800">{user?.name || '未知用戶'}</h3>
                          <span className="text-sm text-slate-500">{dept?.name || '未知部門'}</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            schedule.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            schedule.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {schedule.status === 'PENDING' ? '待審核' :
                             schedule.status === 'APPROVED' ? '已批准' : '已駁回'}
                          </span>
                          {schedule.has_conflict === 1 && (
                            <span className="px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-800">
                              ⚠️ 有衝突
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-slate-600">
                          <p>📅 排班月份: {schedule.year} 年 {schedule.month} 月</p>
                          <p>🗓️ 休息天數: {schedule.total_days} 天</p>
                          <p>📆 休息日期: {selectedDays.sort((a: number, b: number) => a - b).join(', ')}</p>
                          <p>⏰ 提交時間: {new Date(schedule.submitted_at).toLocaleString('zh-TW')}</p>
                          {schedule.has_conflict === 1 && schedule.conflict_details && (
                            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                              <p className="font-bold text-orange-800 mb-1">⚠️ 衝突詳情：</p>
                              {(() => {
                                try {
                                  const conflicts = JSON.parse(schedule.conflict_details);
                                  return (
                                    <ul className="text-xs text-orange-700 space-y-1">
                                      {conflicts.map((c: any, idx: number) => (
                                        <li key={idx}>
                                          • {schedule.month}/{c.day}: 僅 {c.onDuty} 人上班（需要 {c.required} 人）
                                        </li>
                                      ))}
                                    </ul>
                                  );
                                } catch (e) {
                                  return <p className="text-xs text-orange-700">衝突信息解析失敗</p>;
                                }
                              })()}
                            </div>
                          )}
                          {schedule.reviewed_by && (
                            <>
                              <p>👤 審核人: {users.find(u => u.id === schedule.reviewed_by)?.name || '未知'}</p>
                              <p>⏰ 審核時間: {new Date(schedule.reviewed_at).toLocaleString('zh-TW')}</p>
                              {schedule.review_notes && (
                                <p>💬 審核備註: {schedule.review_notes}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {canReview && (
                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => handleEditSchedule(schedule)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                          >
                            ✏️ 調整
                          </button>
                          <button
                            onClick={() => handleApproveSchedule(schedule.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                          >
                            ✓ 批准
                          </button>
                          <button
                            onClick={() => handleRejectSchedule(schedule.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                          >
                            ✗ 駁回
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Leave Tab Content */}
        {activeTab === 'leave' && viewMode === 'list' && (
          <div className="space-y-4">
            {filteredLeaves.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg">📭 目前沒有假期記錄</p>
                <p className="text-sm mt-2">點擊「申請假期」開始使用</p>
              </div>
            ) : (
              filteredLeaves.map(leave => {
                const leaveType = LEAVE_TYPES.find(t => t.value === leave.leave_type);
                const status = STATUS_CONFIG[leave.status as keyof typeof STATUS_CONFIG];
                const isOwn = leave.user_id === currentUser.id;
                // Allow approving own leaves for testing if user has approve permission
                const canApproveThis = canApprove && (leave.status === 'PENDING' || leave.status === 'CONFLICT');
                const canCancelThis = isOwn && (leave.status === 'PENDING' || leave.status === 'CONFLICT');

                return (
                  <div key={leave.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${leaveType?.color}`}>
                            {leaveType?.label}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${status?.color}`}>
                            {status?.label}
                          </span>
                          {leave.has_conflict === 1 && (
                            <span className="px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-800">
                              ⚠️ 衝突
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">申請人:</span>
                            <span className="ml-2 font-bold">{getUserName(leave.user_id)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">部門:</span>
                            <span className="ml-2 font-bold">{getDeptName(leave.department_id)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">開始:</span>
                            <span className="ml-2 font-bold">{leave.start_date}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">結束:</span>
                            <span className="ml-2 font-bold">{leave.end_date}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">天數:</span>
                            <span className="ml-2 font-bold">{leave.days} 天</span>
                          </div>
                          {leave.reason && (
                            <div className="col-span-2">
                              <span className="text-slate-500">原因:</span>
                              <span className="ml-2">{leave.reason}</span>
                            </div>
                          )}
                        </div>

                        {leave.conflict_details && (
                          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded text-sm">
                            <p className="font-bold text-orange-800 mb-1">⚠️ 衝突詳情:</p>
                            <p className="text-orange-700">
                              {(() => {
                                try {
                                  const conflicts = JSON.parse(leave.conflict_details);
                                  return conflicts.map((c: any) => c.message || `與假期 ${c.start_date} - ${c.end_date} 衝突`).join(', ');
                                } catch (e) {
                                  return leave.conflict_details;
                                }
                              })()}
                            </p>
                          </div>
                        )}

                        {leave.approval_notes && (
                          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded text-sm">
                            <p className="font-bold text-slate-700 mb-1">審核備註:</p>
                            <p className="text-slate-600">{leave.approval_notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {canApproveThis && (
                          <>
                            <button
                              onClick={() => handleApprove(leave.id, false)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                            >
                              ✓ 批准
                            </button>
                            {leave.has_conflict === 1 && (
                              <button
                                onClick={() => handleApprove(leave.id, true)}
                                className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition"
                              >
                                ⚠️ 覆蓋批准
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const notes = prompt('請輸入駁回原因:');
                                if (notes) handleReject(leave.id, notes);
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                            >
                              ✗ 駁回
                            </button>
                          </>
                        )}
                        {canCancelThis && (
                          <button
                            onClick={() => handleCancel(leave.id)}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition"
                          >
                            取消
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'leave' && viewMode === 'calendar' && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <p className="text-center text-slate-500">📅 行事曆視圖開發中...</p>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">申請假期</h2>
            
            <div className="space-y-4">
              {/* Leave Type */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">假別</label>
                <select
                  value={applyForm.leave_type}
                  onChange={(e) => setApplyForm({ ...applyForm, leave_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {LEAVE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">開始日期</label>
                <input
                  type="date"
                  value={applyForm.start_date}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setApplyForm({ 
                      ...applyForm, 
                      start_date: newStart,
                      days: calculateDays(newStart, applyForm.end_date)
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">結束日期</label>
                <input
                  type="date"
                  value={applyForm.end_date}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    setApplyForm({ 
                      ...applyForm, 
                      end_date: newEnd,
                      days: calculateDays(applyForm.start_date, newEnd)
                    });
                  }}
                  min={applyForm.start_date}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Days */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">天數</label>
                <input
                  type="number"
                  value={applyForm.days}
                  onChange={(e) => setApplyForm({ ...applyForm, days: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">請假原因</label>
                <textarea
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="請簡述請假原因..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleApplyLeave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold"
              >
                提交申請
              </button>
              <button
                onClick={() => setShowApplyModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-bold"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">
              {activeTab === 'schedule' ? '部門排班規則設定' : '部門請假規則設定'}
            </h2>
            
            {activeTab === 'schedule' ? (
              <div className="space-y-6">
                {/* Max Days Per Month */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    每月最多休息天數
                  </label>
                  <input
                    type="number"
                    value={rulesForm.max_days_per_month}
                    onChange={(e) => setRulesForm({ ...rulesForm, max_days_per_month: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">員工每月最多可以選擇多少天休息</p>
                </div>

                {/* Submission Deadline */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    提交截止日期
                  </label>
                  <input
                    type="number"
                    value={rulesForm.submission_deadline}
                    onChange={(e) => setRulesForm({ ...rulesForm, submission_deadline: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">每月幾號前必須提交排班（例如：3 表示每月3號前）</p>
                </div>

                {/* Min On Duty Staff */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    最少在職人數
                  </label>
                  <input
                    type="number"
                    value={rulesForm.min_on_duty_staff}
                    onChange={(e) => setRulesForm({ ...rulesForm, min_on_duty_staff: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">部門每天必須保持的最少在職人數</p>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-bold">💡 提示：</span>
                    這些規則將應用於整個部門的排班管理。修改後將立即生效。
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Max Concurrent Leaves */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    最大同時請假人數
                  </label>
                  <input
                    type="number"
                    value={rulesForm.max_concurrent_leaves}
                    onChange={(e) => setRulesForm({ ...rulesForm, max_concurrent_leaves: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">同一時間最多允許多少人請假</p>
                </div>

                {/* Min On Duty Staff */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    最少在職人數
                  </label>
                  <input
                    type="number"
                    value={rulesForm.min_on_duty_staff}
                    onChange={(e) => setRulesForm({ ...rulesForm, min_on_duty_staff: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">部門必須保持的最少在職人數</p>
                </div>

                {/* Min Advance Days */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    最少提前天數
                  </label>
                  <input
                    type="number"
                    value={rulesForm.min_advance_days}
                    onChange={(e) => setRulesForm({ ...rulesForm, min_advance_days: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">請假需要提前多少天申請</p>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-bold">💡 提示：</span>
                    這些規則將應用於整個部門的請假管理。修改後將立即生效。
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={activeTab === 'schedule' ? handleSaveScheduleRules : handleUpdateRules}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold"
              >
                保存規則
              </button>
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-bold"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">提交月度排班</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <span className="font-bold">📅 說明：</span>
                請選擇 {scheduleForm.year} 年 {scheduleForm.month} 月要休息的日期。已選擇 {scheduleForm.selectedDays.length} 天，最多可選 {scheduleForm.maxDays} 天。
              </p>
            </div>

            {/* Month Selector */}
            <div className="flex items-center justify-between mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <button
                onClick={() => changeScheduleMonth('prev')}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition text-sm font-bold text-slate-700"
              >
                ← 上個月
              </button>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-800">
                  {scheduleForm.year} 年 {scheduleForm.month} 月
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  可選擇：當月至未來 3 個月
                </p>
              </div>
              <button
                onClick={() => changeScheduleMonth('next')}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition text-sm font-bold text-slate-700"
              >
                下個月 →
              </button>
            </div>

            {/* Calendar */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  {scheduleForm.year} 年 {scheduleForm.month} 月
                </h3>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                  <div key={day} className="text-center font-bold text-slate-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {(() => {
                  const daysInMonth = getDaysInMonth(scheduleForm.year, scheduleForm.month);
                  const firstDay = getFirstDayOfMonth(scheduleForm.year, scheduleForm.month);
                  const days = [];

                  // Empty cells for days before month starts
                  for (let i = 0; i < firstDay; i++) {
                    days.push(
                      <div key={`empty-${i}`} className="aspect-square" />
                    );
                  }

                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const isSelected = scheduleForm.selectedDays.includes(day);
                    const isWeekend = (firstDay + day - 1) % 7 === 0 || (firstDay + day - 1) % 7 === 6;
                    
                    days.push(
                      <button
                        key={day}
                        onClick={() => toggleScheduleDay(day)}
                        className={`aspect-square rounded-lg font-bold transition ${
                          isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : isWeekend
                            ? 'bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-300'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  }

                  return days;
                })()}
              </div>

              {/* Selected days summary */}
              {scheduleForm.selectedDays.length > 0 && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-sm font-bold text-slate-700 mb-2">已選擇的休息日：</p>
                  <div className="flex flex-wrap gap-2">
                    {scheduleForm.selectedDays.sort((a, b) => a - b).map(day => (
                      <span
                        key={day}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold"
                      >
                        {scheduleForm.month}/{day}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmitSchedule}
                disabled={scheduleForm.selectedDays.length === 0}
                className={`flex-1 px-4 py-2 rounded-lg transition font-bold ${
                  scheduleForm.selectedDays.length === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                提交排班 ({scheduleForm.selectedDays.length}/{scheduleForm.maxDays} 天)
              </button>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-bold"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Schedule Modal */}
      {showEditScheduleModal && editingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">調整排班</h2>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-orange-800">
                <span className="font-bold">⚠️ 主管調整：</span>
                調整 {users.find(u => u.id === editingSchedule.user_id)?.name} 的 {editingSchedule.year} 年 {editingSchedule.month} 月排班。
                調整後將重新檢查衝突。
              </p>
            </div>

            {/* Calendar */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  {editingSchedule.year} 年 {editingSchedule.month} 月
                </h3>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                  <div key={day} className="text-center font-bold text-slate-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {(() => {
                  const daysInMonth = getDaysInMonth(editingSchedule.year, editingSchedule.month);
                  const firstDay = getFirstDayOfMonth(editingSchedule.year, editingSchedule.month);
                  const days = [];

                  // Empty cells
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`empty-${i}`} className="aspect-square" />);
                  }

                  // Days
                  for (let day = 1; day <= daysInMonth; day++) {
                    const isSelected = editSelectedDays.includes(day);
                    const isWeekend = (firstDay + day - 1) % 7 === 0 || (firstDay + day - 1) % 7 === 6;
                    
                    days.push(
                      <button
                        key={day}
                        onClick={() => toggleEditDay(day)}
                        className={`aspect-square rounded-lg font-bold transition ${
                          isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : isWeekend
                            ? 'bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-300'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  }

                  return days;
                })()}
              </div>

              {/* Selected days summary */}
              {editSelectedDays.length > 0 && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-sm font-bold text-slate-700 mb-2">已選擇的休息日：</p>
                  <div className="flex flex-wrap gap-2">
                    {editSelectedDays.sort((a, b) => a - b).map(day => (
                      <span
                        key={day}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold"
                      >
                        {editingSchedule.month}/{day}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEditedSchedule}
                disabled={editSelectedDays.length === 0}
                className={`flex-1 px-4 py-2 rounded-lg transition font-bold ${
                  editSelectedDays.length === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                保存調整 ({editSelectedDays.length} 天)
              </button>
              <button
                onClick={() => {
                  setShowEditScheduleModal(false);
                  setEditingSchedule(null);
                  setEditSelectedDays([]);
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-bold"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
