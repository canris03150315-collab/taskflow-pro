const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// ============================================================
// CONFIG
// ============================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const requireManager = requireRole(['BOSS', 'MANAGER', 'SUPERVISOR']);

// ============================================================
// HELPERS
// ============================================================
function getRawDb(db) {
  return db.db || db;
}

function getLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function safeQuery(db, sql, params) {
  try { return params ? db.prepare(sql).all(...(Array.isArray(params) ? params : [params])) : db.prepare(sql).all(); }
  catch (e) { return []; }
}

function safeGet(db, sql, params) {
  try { return params ? db.prepare(sql).get(...(Array.isArray(params) ? params : [params])) : db.prepare(sql).get(); }
  catch (e) { return null; }
}

function safeRun(db, sql, params) {
  try { return params ? db.prepare(sql).run(...(Array.isArray(params) ? params : [params])) : db.prepare(sql).run(); }
  catch (e) { console.error('DB run error:', e.message, '| SQL:', sql.substring(0, 80)); return { error: e.message }; }
}

// ============================================================
// DB INIT — create tables if not exist
// ============================================================
function initAITables(db) {
  db = getRawDb(db);

  safeRun(db, `CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    intent TEXT,
    action_taken TEXT,
    action_result TEXT,
    created_at TEXT NOT NULL
  )`);

  safeRun(db, `CREATE TABLE IF NOT EXISTS ai_user_memory (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    learned_from TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  safeRun(db, `CREATE TABLE IF NOT EXISTS ai_conversation_summaries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    message_count INTEGER DEFAULT 0,
    period_start TEXT,
    period_end TEXT,
    created_at TEXT NOT NULL
  )`);

  safeRun(db, `CREATE TABLE IF NOT EXISTS ai_pending_actions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    actions TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`);
}

let tablesInitialized = false;
function ensureTables(db) {
  if (!tablesInitialized) {
    initAITables(db);
    tablesInitialized = true;
  }
}

// ============================================================
// SYSTEM CONTEXT — gather all company data
// ============================================================
function getSystemContext(db) {
  db = getRawDb(db);

  const users = safeQuery(db, 'SELECT id, name, role, department, username, created_at FROM users');
  const departments = safeQuery(db, 'SELECT id, name FROM departments');
  const activeTasks = safeQuery(db, "SELECT id, title, status, urgency, assigned_to_user_id, deadline, description, created_at FROM tasks WHERE status NOT IN ('已完成','已取消') ORDER BY created_at DESC LIMIT 50");
  const completedTasksCount = safeGet(db, "SELECT COUNT(*) as count FROM tasks WHERE status = '已完成'");
  const recentAnnouncements = safeQuery(db, 'SELECT id, title, content, priority, created_at, created_by, read_by FROM announcements ORDER BY created_at DESC LIMIT 15');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const attendanceRecords = safeQuery(db, 'SELECT user_id, date, status, clock_in, clock_out FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 200', [sevenDaysAgo]);
  const recentMemos = safeQuery(db, 'SELECT id, content, created_at, user_id FROM memos ORDER BY created_at DESC LIMIT 15');
  const financeRecords = safeQuery(db, 'SELECT id, type, amount, category, description, created_at FROM finance_records ORDER BY created_at DESC LIMIT 30');
  const recentReports = safeQuery(db, 'SELECT id, title, type, user_id, created_at FROM reports ORDER BY created_at DESC LIMIT 15');
  const workLogs = safeQuery(db, 'SELECT id, user_id, date, today_tasks, tomorrow_tasks, notes, created_at FROM work_logs WHERE date >= ? ORDER BY date DESC LIMIT 50', [sevenDaysAgo]);
  const leaveRequests = safeQuery(db, "SELECT id, user_id, leave_type, start_date, end_date, reason, status, created_at FROM leave_requests WHERE created_at >= ? ORDER BY created_at DESC LIMIT 20", [thirtyDaysAgo]);
  const forumPosts = safeQuery(db, 'SELECT id, title, content, category, status, author_id, created_at FROM suggestions ORDER BY created_at DESC LIMIT 15');

  // Platform data summary
  const currentMonth = new Date().toISOString().substring(0, 7);
  const platformBatches = safeQuery(db, "SELECT record_month, COUNT(*) as versions FROM platform_upload_batches GROUP BY record_month ORDER BY record_month DESC LIMIT 6");
  const latestPlatformBatch = safeGet(db, "SELECT id, record_month FROM platform_upload_batches WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1");
  let platformSummary = [];
  if (latestPlatformBatch) {
    platformSummary = safeQuery(db, "SELECT platform_name, SUM(deposit) as dep, SUM(withdrawal) as wth, SUM(profit) as prf, MAX(balance) as bal FROM platform_daily_records WHERE upload_batch_id = ? GROUP BY platform_name", [latestPlatformBatch.id]);
  }

  return {
    users, departments, activeTasks,
    completedTasksCount: completedTasksCount?.count || 0,
    recentAnnouncements, attendanceRecords, recentMemos,
    financeRecords, recentReports, workLogs, leaveRequests, forumPosts,
    platformBatches, platformSummary, latestPlatformMonth: latestPlatformBatch?.record_month || null
  };
}

// ============================================================
// ACTION DEFINITIONS
// ============================================================
const ACTION_DEFINITIONS = {
  // Layer 1: Basic
  CREATE_TASK: { level: 'confirm', description: '建立任務', requiredRoles: ['BOSS','MANAGER','SUPERVISOR'] },
  UPDATE_TASK_STATUS: { level: 'direct', description: '更新任務狀態', requiredRoles: ['BOSS','MANAGER','SUPERVISOR','EMPLOYEE'] },
  CREATE_ANNOUNCEMENT: { level: 'confirm', description: '發布公告', requiredRoles: ['BOSS','MANAGER','SUPERVISOR'] },
  CREATE_MEMO: { level: 'direct', description: '新增備忘錄', requiredRoles: ['BOSS','MANAGER','SUPERVISOR','EMPLOYEE'] },
  CREATE_WORK_LOG: { level: 'direct', description: '建立工作日誌', requiredRoles: ['BOSS','MANAGER','SUPERVISOR','EMPLOYEE'] },
  SEND_CHAT_MESSAGE: { level: 'confirm', description: '發送訊息', requiredRoles: ['BOSS','MANAGER','SUPERVISOR','EMPLOYEE'] },
  CREATE_FORUM_POST: { level: 'confirm', description: '新增提案', requiredRoles: ['BOSS','MANAGER','SUPERVISOR','EMPLOYEE'] },
  ADD_FORUM_COMMENT: { level: 'direct', description: '提案留言', requiredRoles: ['BOSS','MANAGER','SUPERVISOR','EMPLOYEE'] },
  CREATE_FINANCE_RECORD: { level: 'confirm', description: '新增財務紀錄', requiredRoles: ['BOSS','MANAGER'] },
  CREATE_LEAVE_REQUEST: { level: 'confirm', description: '申請請假', requiredRoles: ['BOSS','MANAGER','SUPERVISOR','EMPLOYEE'] },
  MARK_ANNOUNCEMENT_READ: { level: 'direct', description: '標記公告已讀', requiredRoles: ['BOSS','MANAGER','SUPERVISOR','EMPLOYEE'] },

  // Layer 2: Management
  APPROVE_LEAVE: { level: 'confirm', description: '批准請假', requiredRoles: ['BOSS','MANAGER','SUPERVISOR'] },
  REJECT_LEAVE: { level: 'confirm', description: '駁回請假', requiredRoles: ['BOSS','MANAGER','SUPERVISOR'] },
  ASSIGN_TASK: { level: 'confirm', description: '指派/轉派任務', requiredRoles: ['BOSS','MANAGER','SUPERVISOR'] },
  COMPLETE_TASK: { level: 'confirm', description: '標記任務完成', requiredRoles: ['BOSS','MANAGER','SUPERVISOR','EMPLOYEE'] },
  UPDATE_ANNOUNCEMENT: { level: 'confirm', description: '修改公告', requiredRoles: ['BOSS','MANAGER','SUPERVISOR'] },
  DELETE_TASK: { level: 'danger', description: '刪除任務', requiredRoles: ['BOSS','MANAGER'] },
  DELETE_ANNOUNCEMENT: { level: 'danger', description: '刪除公告', requiredRoles: ['BOSS','MANAGER'] },
  MANUAL_ATTENDANCE: { level: 'confirm', description: '手動補出勤紀錄', requiredRoles: ['BOSS','MANAGER','SUPERVISOR'] },

  // Layer 3: Smart
  AUTO_ASSIGN_TASK: { level: 'confirm', description: '智慧指派任務', requiredRoles: ['BOSS','MANAGER','SUPERVISOR'] },
  REMIND_MISSING_WORKLOGS: { level: 'confirm', description: '提醒未交工作日誌', requiredRoles: ['BOSS','MANAGER','SUPERVISOR'] },
  GENERATE_REPORT: { level: 'confirm', description: '生成報表分析', requiredRoles: ['BOSS','MANAGER','SUPERVISOR'] },
  FLAG_OVERDUE_TASKS: { level: 'confirm', description: '標記逾期任務並通知', requiredRoles: ['BOSS','MANAGER','SUPERVISOR'] },
  ATTENDANCE_ANOMALY_ALERT: { level: 'confirm', description: '出勤異常批量提醒', requiredRoles: ['BOSS','MANAGER','SUPERVISOR'] },
  QUERY_PLATFORM_DATA: { level: 'direct', description: '查詢平台帳務資料', requiredRoles: ['BOSS','MANAGER','SUPERVISOR'] },
};

// ============================================================
// ACTION EXECUTOR
// ============================================================
function executeAction(db, action, params, currentUser) {
  db = getRawDb(db);
  const now = new Date().toISOString();
  const today = getLocalDate();

  switch (action) {
    case 'CREATE_TASK': {
      const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const assignee = params.assignedTo ? findUserByName(db, params.assignedTo) : null;
      const r1 = safeRun(db, `INSERT INTO tasks (id, title, description, status, urgency, assigned_to_user_id, deadline, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, params.title, params.description || '', '待接取', params.urgency || 'medium', assignee?.id || currentUser.id, params.deadline || null, currentUser.id, now]);
      if (r1?.error) return { success: false, message: `建立任務失敗: ${r1.error}` };
      return { success: true, message: `任務「${params.title}」已建立${assignee ? `，指派給 ${assignee.name}` : ''}`, id };
    }

    case 'UPDATE_TASK_STATUS': {
      const task = safeGet(db, 'SELECT * FROM tasks WHERE id = ?', [params.taskId]);
      if (!task) return { success: false, message: '找不到該任務' };
      const statusMap = { 'pending': '待接取', 'assigned': '已指派', 'in_progress': '進行中', 'in progress': '進行中', 'completed': '已完成', 'cancelled': '已取消' };
      const mappedStatus = statusMap[params.status?.toLowerCase()] || params.status;
      const validStatuses = ['待接取', '已指派', '進行中', '已完成', '已取消'];
      if (!validStatuses.includes(mappedStatus)) return { success: false, message: `無效的狀態值「${params.status}」，有效值: ${validStatuses.join(', ')}` };
      const r1b = safeRun(db, 'UPDATE tasks SET status = ? WHERE id = ?', [mappedStatus, params.taskId]);
      if (r1b?.error) return { success: false, message: `更新狀態失敗: ${r1b.error}` };
      return { success: true, message: `任務「${task.title}」狀態已更新為「${mappedStatus}」` };
    }

    case 'CREATE_ANNOUNCEMENT': {
      const id = `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const r2 = safeRun(db, `INSERT INTO announcements (id, title, content, priority, created_by, created_at, read_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, params.title, params.content, params.priority || 'NORMAL', currentUser.id, now, '[]']);
      if (r2?.error) return { success: false, message: `發布公告失敗: ${r2.error}` };
      return { success: true, message: `公告「${params.title}」已發布`, id };
    }

    case 'CREATE_MEMO': {
      const id = uuidv4();
      const r3 = safeRun(db, `INSERT INTO memos (id, user_id, type, content, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, currentUser.id, 'TEXT', params.content, params.color || 'yellow', now, now]);
      if (r3?.error) return { success: false, message: `建立備忘錄失敗: ${r3.error}` };
      return { success: true, message: `備忘錄已建立` };
    }

    case 'CREATE_WORK_LOG': {
      const logDate = params.date || today;
      const wlUserInfo = safeGet(db, 'SELECT department FROM users WHERE id = ?', [currentUser.id]);
      const wlDeptId = wlUserInfo?.department || 'default';
      const existing = safeGet(db, 'SELECT id FROM work_logs WHERE user_id = ? AND date = ?', [currentUser.id, logDate]);
      if (existing) {
        // Update existing work log
        const rUpd = safeRun(db, `UPDATE work_logs SET today_tasks = ?, tomorrow_tasks = ?, notes = ?, updated_at = ? WHERE id = ?`,
          [params.todayTasks, params.tomorrowTasks || '', params.notes || '', now, existing.id]);
        if (rUpd?.error) return { success: false, message: `更新工作日誌失敗: ${rUpd.error}` };
        return { success: true, message: `今日工作日誌已更新` };
      }
      const id = uuidv4();
      const r4 = safeRun(db, `INSERT INTO work_logs (id, user_id, department_id, date, today_tasks, tomorrow_tasks, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, currentUser.id, wlDeptId, logDate, params.todayTasks, params.tomorrowTasks || '', params.notes || '', now, now]);
      if (r4?.error) return { success: false, message: `建立工作日誌失敗: ${r4.error}` };
      return { success: true, message: `工作日誌已建立` };
    }

    case 'SEND_CHAT_MESSAGE': {
      const targetUser = findUserByName(db, params.targetUser);
      if (!targetUser) return { success: false, message: `找不到用戶「${params.targetUser}」` };
      // Find or create direct channel
      let channel = safeGet(db, "SELECT id FROM chat_channels WHERE type = 'DIRECT' AND participants LIKE ? AND participants LIKE ?",
        [`%${currentUser.id}%`, `%${targetUser.id}%`]);
      if (!channel) {
        const channelId = uuidv4();
        safeRun(db, `INSERT INTO chat_channels (id, type, participants, created_at) VALUES (?, ?, ?, ?)`,
          [channelId, 'DIRECT', JSON.stringify([currentUser.id, targetUser.id]), now]);
        channel = { id: channelId };
      }
      const msgId = uuidv4();
      safeRun(db, `INSERT INTO chat_messages (id, channel_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)`,
        [msgId, channel.id, currentUser.id, params.message, now]);
      return { success: true, message: `訊息已發送給 ${targetUser.name}` };
    }

    case 'CREATE_FORUM_POST': {
      const id = `forum-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const validCategories = ['系統建議', '工作流程', '薪資福利', '設施修繕', '團隊活動', '其他'];
      const catMap = { '系統改善': '系統建議', '系統': '系統建議', '工作': '工作流程', '薪資': '薪資福利', '福利': '薪資福利', '設施': '設施修繕', '修繕': '設施修繕', '活動': '團隊活動', '團隊': '團隊活動', '一般': '其他' };
      let cat = params.category || '其他';
      if (!validCategories.includes(cat)) cat = catMap[cat] || '其他';
      const r5 = safeRun(db, `INSERT INTO suggestions (id, title, content, category, status, author_id, created_at, updated_at, upvotes, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, params.title, params.content, cat, 'OPEN', currentUser.id, now, now, '[]', '[]']);
      if (r5?.error) return { success: false, message: `建立提案失敗: ${r5.error}` };
      return { success: true, message: `提案「${params.title}」已建立`, id };
    }

    case 'ADD_FORUM_COMMENT': {
      const post = safeGet(db, 'SELECT * FROM suggestions WHERE id = ?', [params.postId]);
      if (!post) return { success: false, message: '找不到該提案' };
      const comments = JSON.parse(post.comments || '[]');
      comments.push({ id: uuidv4(), userId: currentUser.id, userName: currentUser.name, content: params.comment, createdAt: now });
      const r5b = safeRun(db, 'UPDATE suggestions SET comments = ? WHERE id = ?', [JSON.stringify(comments), params.postId]);
      if (r5b?.error) return { success: false, message: `留言失敗: ${r5b.error}` };
      return { success: true, message: '留言已新增' };
    }

    case 'CREATE_FINANCE_RECORD': {
      const id = uuidv4();
      const finType = (params.type || 'EXPENSE').toUpperCase();
      const finUserInfo = safeGet(db, 'SELECT department FROM users WHERE id = ?', [currentUser.id]);
      const deptId = finUserInfo?.department || 'default';
      const r6 = safeRun(db, `INSERT INTO finance_records (id, date, type, amount, category, description, recorded_by, owner_id, user_id, department_id, scope, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, today, finType, params.amount, params.category || '其他', params.description || '', currentUser.id, currentUser.id, currentUser.id, deptId, 'DEPARTMENT', now]);
      if (r6?.error) return { success: false, message: `建立財務紀錄失敗: ${r6.error}` };
      return { success: true, message: `財務紀錄已建立：${finType === 'INCOME' ? '收入' : '支出'} $${params.amount}` };
    }

    case 'CREATE_LEAVE_REQUEST': {
      const id = uuidv4();
      const startD = params.startDate || today;
      const endD = params.endDate || startD;
      // Calculate days
      const dStart = new Date(startD); const dEnd = new Date(endD);
      const diffDays = Math.max(1, Math.ceil((dEnd - dStart) / (1000*60*60*24)) + 1);
      // Get user's department
      const leaveUserInfo = safeGet(db, 'SELECT department FROM users WHERE id = ?', [currentUser.id]);
      const r7 = safeRun(db, `INSERT INTO leave_requests (id, user_id, department_id, leave_type, start_date, end_date, days, reason, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, currentUser.id, leaveUserInfo?.department || '', params.type || '事假', startD, endD, diffDays, params.reason || '', 'PENDING', now, now]);
      if (r7?.error) return { success: false, message: `請假申請失敗: ${r7.error}` };
      return { success: true, message: `請假申請已送出（${startD}${endD !== startD ? ' ~ ' + endD : ''}）` };
    }

    case 'MARK_ANNOUNCEMENT_READ': {
      const ann = safeGet(db, 'SELECT * FROM announcements WHERE id = ?', [params.announcementId]);
      if (!ann) return { success: false, message: '找不到該公告' };
      const readBy = JSON.parse(ann.read_by || '[]');
      if (!readBy.includes(currentUser.id)) {
        readBy.push(currentUser.id);
        safeRun(db, 'UPDATE announcements SET read_by = ? WHERE id = ?', [JSON.stringify(readBy), params.announcementId]);
      }
      return { success: true, message: '已標記為已讀' };
    }

    case 'APPROVE_LEAVE': {
      const leave = safeGet(db, 'SELECT * FROM leave_requests WHERE id = ?', [params.leaveId]);
      if (!leave) return { success: false, message: '找不到該請假申請' };
      const r8 = safeRun(db, "UPDATE leave_requests SET status = 'APPROVED', approver_id = ?, approved_at = ? WHERE id = ?", [currentUser.id, now, params.leaveId]);
      if (r8?.error) return { success: false, message: `批准失敗: ${r8.error}` };
      const leaveUser = safeGet(db, 'SELECT name FROM users WHERE id = ?', [leave.user_id]);
      return { success: true, message: `已批准 ${leaveUser?.name || '員工'} 的請假申請` };
    }

    case 'REJECT_LEAVE': {
      const leave2 = safeGet(db, 'SELECT * FROM leave_requests WHERE id = ?', [params.leaveId]);
      if (!leave2) return { success: false, message: '找不到該請假申請' };
      const r9 = safeRun(db, "UPDATE leave_requests SET status = 'REJECTED', approver_id = ?, approved_at = ? WHERE id = ?", [currentUser.id, now, params.leaveId]);
      if (r9?.error) return { success: false, message: `駁回失敗: ${r9.error}` };
      const leaveUser2 = safeGet(db, 'SELECT name FROM users WHERE id = ?', [leave2.user_id]);
      return { success: true, message: `已駁回 ${leaveUser2?.name || '員工'} 的請假申請` };
    }

    case 'ASSIGN_TASK': {
      const task2 = safeGet(db, 'SELECT * FROM tasks WHERE id = ?', [params.taskId]);
      if (!task2) return { success: false, message: '找不到該任務' };
      const assignee2 = findUserByName(db, params.assignTo);
      if (!assignee2) return { success: false, message: `找不到用戶「${params.assignTo}」` };
      const rAssign = safeRun(db, "UPDATE tasks SET assigned_to_user_id = ?, status = '已指派' WHERE id = ?", [assignee2.id, params.taskId]);
      if (rAssign?.error) return { success: false, message: `指派失敗: ${rAssign.error}` };
      return { success: true, message: `任務「${task2.title}」已轉派給 ${assignee2.name}` };
    }

    case 'COMPLETE_TASK': {
      const task3 = safeGet(db, 'SELECT * FROM tasks WHERE id = ?', [params.taskId]);
      if (!task3) return { success: false, message: '找不到該任務' };
      const r10 = safeRun(db, "UPDATE tasks SET status = '已完成', progress = 100 WHERE id = ?", [params.taskId]);
      if (r10?.error) return { success: false, message: `完成任務失敗: ${r10.error}` };
      return { success: true, message: `任務「${task3.title}」已標記為完成` };
    }

    case 'UPDATE_ANNOUNCEMENT': {
      const ann2 = safeGet(db, 'SELECT * FROM announcements WHERE id = ?', [params.announcementId]);
      if (!ann2) return { success: false, message: '找不到該公告' };
      const updates = [];
      const values = [];
      if (params.title) { updates.push('title = ?'); values.push(params.title); }
      if (params.content) { updates.push('content = ?'); values.push(params.content); }
      if (updates.length > 0) {
        values.push(params.announcementId);
        safeRun(db, `UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`, values);
      }
      return { success: true, message: `公告已更新` };
    }

    case 'DELETE_TASK': {
      const task4 = safeGet(db, 'SELECT * FROM tasks WHERE id = ?', [params.taskId]);
      if (!task4) return { success: false, message: '找不到該任務' };
      safeRun(db, 'DELETE FROM tasks WHERE id = ?', [params.taskId]);
      return { success: true, message: `任務「${task4.title}」已刪除` };
    }

    case 'DELETE_ANNOUNCEMENT': {
      const ann3 = safeGet(db, 'SELECT * FROM announcements WHERE id = ?', [params.announcementId]);
      if (!ann3) return { success: false, message: '找不到該公告' };
      safeRun(db, 'DELETE FROM announcements WHERE id = ?', [params.announcementId]);
      return { success: true, message: `公告「${ann3.title}」已刪除` };
    }

    case 'MANUAL_ATTENDANCE': {
      const targetUser2 = findUserByName(db, params.userName);
      if (!targetUser2) return { success: false, message: `找不到用戶「${params.userName}」` };
      const attId = uuidv4();
      safeRun(db, `INSERT INTO attendance_records (id, user_id, date, status, clock_in, clock_out, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [attId, targetUser2.id, params.date || today, 'ONLINE', params.clockIn || '09:00', params.clockOut || '18:00', params.notes || 'AI 助手手動補登', now]);
      return { success: true, message: `已為 ${targetUser2.name} 補登 ${params.date || today} 的出勤紀錄` };
    }

    case 'AUTO_ASSIGN_TASK': {
      // Find user with least active tasks
      const allUsers = safeQuery(db, "SELECT id, name, role, department FROM users WHERE role = 'EMPLOYEE' OR role = 'SUPERVISOR'");
      const taskCounts = {};
      allUsers.forEach(u => { taskCounts[u.id] = { user: u, count: 0 }; });
      const active = safeQuery(db, "SELECT assigned_to_user_id FROM tasks WHERE status != '已完成' AND status != '已取消'");
      active.forEach(t => { if (taskCounts[t.assigned_to_user_id]) taskCounts[t.assigned_to_user_id].count++; });

      let leastBusy = null;
      let minCount = Infinity;
      // Filter by department if specified
      Object.values(taskCounts).forEach(tc => {
        if (params.department && tc.user.department !== params.department) return;
        if (tc.count < minCount) { minCount = tc.count; leastBusy = tc.user; }
      });

      if (!leastBusy) return { success: false, message: '找不到可指派的員工' };

      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const r11 = safeRun(db, `INSERT INTO tasks (id, title, description, status, urgency, assigned_to_user_id, deadline, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [taskId, params.title, params.description || '', '待接取', params.urgency || 'medium', leastBusy.id, params.deadline || null, currentUser.id, now]);
      if (r11?.error) return { success: false, message: `智慧指派失敗: ${r11.error}` };
      return { success: true, message: `任務「${params.title}」已智慧指派給 ${leastBusy.name}（目前有 ${minCount} 個進行中任務，工作量最少）`, id: taskId };
    }

    case 'REMIND_MISSING_WORKLOGS': {
      const targetDate = params.date || today;
      const allEmployees = safeQuery(db, 'SELECT id, name FROM users');
      const logsToday = safeQuery(db, 'SELECT user_id FROM work_logs WHERE date = ?', [targetDate]);
      const loggedUserIds = new Set(logsToday.map(l => l.user_id));
      const missing = allEmployees.filter(u => !loggedUserIds.has(u.id));

      if (missing.length === 0) return { success: true, message: `${targetDate} 所有人都已提交工作日誌` };

      // Send chat messages to remind
      const reminded = [];
      missing.forEach(user => {
        let channel = safeGet(db, "SELECT id FROM chat_channels WHERE type = 'DIRECT' AND participants LIKE ? AND participants LIKE ?",
          [`%${currentUser.id}%`, `%${user.id}%`]);
        if (!channel) {
          const channelId = uuidv4();
          safeRun(db, `INSERT INTO chat_channels (id, type, participants, created_at) VALUES (?, ?, ?, ?)`,
            [channelId, 'DIRECT', JSON.stringify([currentUser.id, user.id]), now]);
          channel = { id: channelId };
        }
        const msgId = uuidv4();
        safeRun(db, `INSERT INTO chat_messages (id, channel_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)`,
          [msgId, channel.id, currentUser.id, `提醒：請記得提交 ${targetDate} 的工作日誌。`, now]);
        reminded.push(user.name);
      });

      return { success: true, message: `已提醒 ${reminded.length} 人提交工作日誌：${reminded.join('、')}` };
    }

    case 'GENERATE_REPORT': {
      // This triggers the report generation endpoint — handled separately
      return { success: true, message: 'REPORT_GENERATION_TRIGGERED', reportParams: params };
    }

    case 'FLAG_OVERDUE_TASKS': {
      const overdue = safeQuery(db, "SELECT id, title, assigned_to_user_id, deadline FROM tasks WHERE status NOT IN ('已完成','已取消') AND deadline < ? AND deadline IS NOT NULL", [today]);
      if (overdue.length === 0) return { success: true, message: '目前沒有逾期任務' };

      overdue.forEach(task => {
        safeRun(db, "UPDATE tasks SET urgency = 'urgent' WHERE id = ?", [task.id]);
      });

      const details = overdue.map(t => {
        const user = safeGet(db, 'SELECT name FROM users WHERE id = ?', [t.assigned_to_user_id]);
        return `「${t.title}」(負責人: ${user?.name || '未指派'}, 截止: ${t.deadline})`;
      });

      return { success: true, message: `已標記 ${overdue.length} 個逾期任務為緊急：\n${details.join('\n')}` };
    }

    case 'ATTENDANCE_ANOMALY_ALERT': {
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const allEmps = safeQuery(db, 'SELECT id, name, department FROM users');
      const records = safeQuery(db, 'SELECT user_id, date FROM attendance_records WHERE date >= ?', [last7Days]);
      const attendMap = {};
      records.forEach(r => {
        if (!attendMap[r.user_id]) attendMap[r.user_id] = new Set();
        attendMap[r.user_id].add(r.date);
      });

      const anomalies = [];
      allEmps.forEach(emp => {
        const days = attendMap[emp.id] ? attendMap[emp.id].size : 0;
        if (days < 3) { // Less than 3 days in 7 — anomaly
          anomalies.push({ name: emp.name, days, department: emp.department });
        }
      });

      if (anomalies.length === 0) return { success: true, message: '近 7 天無出勤異常' };

      const details2 = anomalies.map(a => `${a.name}（${a.department || '未分部'}）: 僅出勤 ${a.days} 天`);
      return { success: true, message: `發現 ${anomalies.length} 人出勤異常（近 7 天出勤不足 3 天）：\n${details2.join('\n')}` };
    }

    case 'QUERY_PLATFORM_DATA': {
      const qMonth = params.month || today.substring(0, 7);
      const qPlatform = params.platform || null;
      const qType = params.queryType || 'summary'; // summary, detail, total, compare

      // Get latest batch for month
      const latestBatch = safeGet(db, "SELECT id FROM platform_upload_batches WHERE record_month = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1", [qMonth]);
      if (!latestBatch) return { success: true, message: `${qMonth} 尚無平台帳務資料`, data: null };

      if (qType === 'total') {
        const total = safeGet(db, `SELECT COUNT(DISTINCT platform_name) as platform_count, COUNT(*) as total_records, SUM(deposit) as total_deposit, SUM(withdrawal) as total_withdrawal, SUM(profit) as total_profit, SUM(loan) as total_loan FROM platform_daily_records WHERE record_month = ? AND upload_batch_id = ?`, [qMonth, latestBatch.id]);
        return { success: true, message: `${qMonth} 平台總覽：${total.platform_count} 個平台，總充值 ${total.total_deposit || 0}，總提款 ${total.total_withdrawal || 0}，總營利 ${total.total_profit || 0}，總借款 ${total.total_loan || 0}`, data: total };
      }

      if (qType === 'detail' && qPlatform) {
        const records = safeQuery(db, `SELECT day_of_month, lottery_salary, lottery_rebate, live_ag, chess_card, external_rebate, live_private_rebate, deposit, withdrawal, loan, profit, balance FROM platform_daily_records WHERE record_month = ? AND upload_batch_id = ? AND platform_name LIKE ? ORDER BY day_of_month`, [qMonth, latestBatch.id, `%${qPlatform}%`]);
        if (records.length === 0) return { success: true, message: `找不到平台「${qPlatform}」的資料` };
        const platformName = safeGet(db, `SELECT DISTINCT platform_name FROM platform_daily_records WHERE record_month = ? AND upload_batch_id = ? AND platform_name LIKE ?`, [qMonth, latestBatch.id, `%${qPlatform}%`]);
        const sumRow = safeGet(db, `SELECT SUM(deposit) as dep, SUM(withdrawal) as wth, SUM(profit) as prf, SUM(loan) as ln, MAX(balance) as bal FROM platform_daily_records WHERE record_month = ? AND upload_batch_id = ? AND platform_name LIKE ?`, [qMonth, latestBatch.id, `%${qPlatform}%`]);
        return { success: true, message: `${platformName?.platform_name || qPlatform} ${qMonth} 月份：${records.length} 天有資料，總充值 ${sumRow.dep || 0}，總提款 ${sumRow.wth || 0}，總營利 ${sumRow.prf || 0}，總借款 ${sumRow.ln || 0}，最新餘額 ${sumRow.bal || 0}`, data: { records, summary: sumRow } };
      }

      // Default: summary of all platforms
      const summaryData = safeQuery(db, `SELECT platform_name, COUNT(*) as days, SUM(deposit) as total_deposit, SUM(withdrawal) as total_withdrawal, SUM(profit) as total_profit, SUM(loan) as total_loan, MAX(balance) as latest_balance FROM platform_daily_records WHERE record_month = ? AND upload_batch_id = ? GROUP BY platform_name ORDER BY platform_name`, [qMonth, latestBatch.id]);

      const lines = summaryData.map(s => `${s.platform_name}: 充值${s.total_deposit || 0} / 提款${s.total_withdrawal || 0} / 營利${s.total_profit || 0} / 餘額${s.latest_balance || 0}`);
      return { success: true, message: `${qMonth} 平台帳務摘要（${summaryData.length} 個平台）：\n${lines.join('\n')}`, data: summaryData };
    }

    default:
      return { success: false, message: `未知操作: ${action}` };
  }
}

function findUserByName(db, name) {
  if (!name) return null;
  db = getRawDb(db);
  // Try exact match first
  let user = safeGet(db, 'SELECT * FROM users WHERE name = ?', [name]);
  if (user) return user;
  // Try partial match
  user = safeGet(db, 'SELECT * FROM users WHERE name LIKE ?', [`%${name}%`]);
  return user;
}

// ============================================================
// USER MEMORY SYSTEM
// ============================================================
function getUserMemory(db, userId) {
  db = getRawDb(db);
  return safeQuery(db, 'SELECT key, value FROM ai_user_memory WHERE user_id = ?', [userId]);
}

function saveUserMemory(db, userId, key, value, learnedFrom) {
  db = getRawDb(db);
  const existing = safeGet(db, 'SELECT id FROM ai_user_memory WHERE user_id = ? AND key = ?', [userId, key]);
  const now = new Date().toISOString();
  if (existing) {
    safeRun(db, 'UPDATE ai_user_memory SET value = ?, updated_at = ? WHERE id = ?', [value, now, existing.id]);
  } else {
    safeRun(db, 'INSERT INTO ai_user_memory (id, user_id, key, value, learned_from, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, key, value, learnedFrom || '', now, now]);
  }
}

// ============================================================
// CONVERSATION SUMMARIES
// ============================================================
function getConversationSummaries(db, userId) {
  db = getRawDb(db);
  return safeQuery(db, 'SELECT summary, period_start, period_end FROM ai_conversation_summaries WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [userId]);
}

async function summarizeOldConversations(db, userId) {
  db = getRawDb(db);
  const oldMessages = safeQuery(db, 'SELECT id, role, message, created_at FROM ai_conversations WHERE user_id = ? ORDER BY created_at ASC', [userId]);

  if (oldMessages.length <= 30) return; // Not enough to summarize

  const toSummarize = oldMessages.slice(0, oldMessages.length - 30);
  if (toSummarize.length < 10) return;

  // Create a simple summary without calling AI (to avoid extra API cost)
  const userMsgs = toSummarize.filter(m => m.role === 'user').map(m => m.message);
  const summary = `用戶曾討論的主題：${userMsgs.slice(-10).map(m => m.substring(0, 50)).join('；')}`;

  const periodStart = toSummarize[0].created_at;
  const periodEnd = toSummarize[toSummarize.length - 1].created_at;

  safeRun(db, 'INSERT INTO ai_conversation_summaries (id, user_id, summary, message_count, period_start, period_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, summary, toSummarize.length, periodStart, periodEnd, new Date().toISOString()]);

  // Delete old messages that were summarized
  const idsToDelete = toSummarize.map(m => m.id);
  const placeholders = idsToDelete.map(() => '?').join(',');
  safeRun(db, `DELETE FROM ai_conversations WHERE id IN (${placeholders})`, idsToDelete);
}

// ============================================================
// PROACTIVE ALERTS
// ============================================================
function generateAlerts(db, currentUser) {
  db = getRawDb(db);
  const today = getLocalDate();
  const alerts = [];

  // 1. Overdue tasks
  const overdueTasks = safeQuery(db, "SELECT id, title, assigned_to_user_id, deadline FROM tasks WHERE status NOT IN ('已完成','已取消') AND deadline < ? AND deadline IS NOT NULL", [today]);
  if (overdueTasks.length > 0) {
    alerts.push({ type: 'warning', icon: '⏰', title: `${overdueTasks.length} 個任務已逾期`, detail: overdueTasks.map(t => t.title).slice(0, 3).join('、') + (overdueTasks.length > 3 ? '...' : '') });
  }

  // 2. Missing work logs today
  const allUsers = safeQuery(db, 'SELECT id, name FROM users');
  const todayLogs = safeQuery(db, 'SELECT user_id FROM work_logs WHERE date = ?', [today]);
  const loggedIds = new Set(todayLogs.map(l => l.user_id));
  const missingLogs = allUsers.filter(u => !loggedIds.has(u.id));
  if (missingLogs.length > 0 && new Date().getHours() >= 16) { // Only alert after 4 PM
    alerts.push({ type: 'info', icon: '📝', title: `${missingLogs.length} 人今天還沒交工作日誌`, detail: missingLogs.map(u => u.name).slice(0, 5).join('、') + (missingLogs.length > 5 ? '...' : '') });
  }

  // 3. Pending leave requests
  const pendingLeaves = safeQuery(db, "SELECT id, user_id, leave_type, start_date FROM leave_requests WHERE status = 'PENDING'");
  if (pendingLeaves.length > 0 && ['BOSS','MANAGER','SUPERVISOR'].includes(currentUser.role)) {
    const names = pendingLeaves.map(l => {
      const u = safeGet(db, 'SELECT name FROM users WHERE id = ?', [l.user_id]);
      return u?.name || '未知';
    });
    alerts.push({ type: 'action', icon: '🏖️', title: `${pendingLeaves.length} 個請假申請待審核`, detail: names.slice(0, 3).join('、') + (names.length > 3 ? '...' : '') });
  }

  // 4. Unread announcements
  const announcements = safeQuery(db, 'SELECT id, title, read_by FROM announcements ORDER BY created_at DESC LIMIT 5');
  const unreadAnns = announcements.filter(a => {
    const readBy = JSON.parse(a.read_by || '[]');
    return !readBy.includes(currentUser.id);
  });
  if (unreadAnns.length > 0) {
    alerts.push({ type: 'info', icon: '📢', title: `${unreadAnns.length} 則公告未讀`, detail: unreadAnns.map(a => a.title).slice(0, 2).join('、') });
  }

  // 5. Attendance anomaly (3-day consecutive absence)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const recentAttendance = safeQuery(db, 'SELECT user_id, date FROM attendance_records WHERE date >= ?', [threeDaysAgo]);
  const attendSet = {};
  recentAttendance.forEach(r => {
    if (!attendSet[r.user_id]) attendSet[r.user_id] = new Set();
    attendSet[r.user_id].add(r.date);
  });
  const absentees = allUsers.filter(u => !attendSet[u.id] || attendSet[u.id].size === 0);
  if (absentees.length > 0 && ['BOSS','MANAGER','SUPERVISOR'].includes(currentUser.role)) {
    alerts.push({ type: 'warning', icon: '🚨', title: `${absentees.length} 人連續 3 天未打卡`, detail: absentees.map(u => u.name).slice(0, 3).join('、') + (absentees.length > 3 ? '...' : '') });
  }

  return alerts;
}

// ============================================================
// SYSTEM PROMPT BUILDER (Enhanced)
// ============================================================
function buildSystemPrompt(context, currentUser, userMemory, summaries) {
  const userList = context.users.map(u =>
    `- ${u.name} (ID: ${u.id}, ${u.role}) - Dept: ${u.department || 'None'} - Username: ${u.username}`
  ).join('\n');

  const taskList = context.activeTasks.map(t => {
    const assignee = context.users.find(u => u.id === t.assigned_to_user_id);
    return `- [ID: ${t.id}] [${t.urgency}] ${t.title} (Status: ${t.status}, Assigned: ${assignee?.name || 'Unassigned'}, Due: ${t.deadline || 'No deadline'})`;
  }).join('\n');

  const attendanceSummary = context.attendanceRecords.length > 0
    ? (() => {
        const byUser = {};
        context.attendanceRecords.forEach(record => {
          if (!byUser[record.user_id]) byUser[record.user_id] = { online: 0, offline: 0, dates: new Set(), clockIns: [], clockOuts: [] };
          if (record.status === 'ONLINE') byUser[record.user_id].online++;
          else if (record.status === 'OFFLINE') byUser[record.user_id].offline++;
          byUser[record.user_id].dates.add(record.date);
          if (record.clock_in) byUser[record.user_id].clockIns.push(record.clock_in);
          if (record.clock_out) byUser[record.user_id].clockOuts.push(record.clock_out);
        });
        let result = `近 7 天共 ${context.attendanceRecords.length} 筆出勤紀錄\n`;
        Object.keys(byUser).forEach(userId => {
          const user = context.users.find(u => u.id === userId);
          const stats = byUser[userId];
          result += `  - ${user?.name || 'Unknown'}: ${stats.dates.size} 天出勤\n`;
        });
        return result.trim();
      })()
    : '無近期出勤紀錄';

  const workLogSummary = context.workLogs.length > 0
    ? context.workLogs.slice(0, 20).map(w => {
        const user = context.users.find(u => u.id === w.user_id);
        return `- [${w.date}] ${user?.name || 'Unknown'}: ${(w.today_tasks || '').substring(0, 80)}...`;
      }).join('\n')
    : '無近期工作日誌';

  const leaveSummary = context.leaveRequests.length > 0
    ? context.leaveRequests.map(l => {
        const user = context.users.find(u => u.id === l.user_id);
        return `- [ID: ${l.id}] ${user?.name || 'Unknown'}: ${l.type} (${l.start_date}~${l.end_date}) 狀態: ${l.status}`;
      }).join('\n')
    : '無近期請假';

  const financeSummary = context.financeRecords.length > 0
    ? context.financeRecords.map(f => `- [${f.created_at?.split('T')[0] || ''}] ${f.type || ''}: $${f.amount || 0} - ${f.category || ''} ${f.description || ''}`).join('\n')
    : '無近期財務紀錄';

  const memorySection = userMemory.length > 0
    ? `\n### 用戶偏好記憶\n${userMemory.map(m => `- ${m.key}: ${m.value}`).join('\n')}`
    : '';

  const summarySection = summaries.length > 0
    ? `\n### 歷史對話摘要\n${summaries.map(s => `- [${s.period_start?.split('T')[0] || ''}~${s.period_end?.split('T')[0] || ''}] ${s.summary}`).join('\n')}`
    : '';

  const actionList = Object.entries(ACTION_DEFINITIONS).map(([key, def]) => `  - ${key}: ${def.description} (${def.level === 'direct' ? '直接執行' : def.level === 'confirm' ? '需確認' : '⚠️ 危險操作需二次確認'})`).join('\n');

  return `你是 TaskFlow Pro 企業管理系統的 AI 智能助理「Consultant」。你正在與 ${currentUser.name}（${currentUser.role}）對話。
今天日期：${getLocalDate()}
你擁有公司所有數據的完整存取權限。請用繁體中文回覆。

=== 目前系統數據 ===

### 部門 (${context.departments.length})
${context.departments.map(d => `${d.name} (ID: ${d.id})`).join('、')}

### 員工名冊 (${context.users.length} 人)
${userList}

### 任務概況
- 進行中：${context.activeTasks.length}
- 已完成：${context.completedTasksCount}
進行中的任務：
${taskList || '無進行中任務'}

### 出勤狀況（近 7 天）
${attendanceSummary}

### 工作日誌（近 7 天）
${workLogSummary}

### 請假紀錄（近 30 天）
${leaveSummary}

### 最近公告
${context.recentAnnouncements.map(a => `- [ID: ${a.id}] [${a.created_at?.split('T')[0] || ''}] ${a.title} (已讀: ${JSON.parse(a.read_by || '[]').length}人)`).join('\n') || '無'}

### 最近財務紀錄
${financeSummary}

### 提案討論
${context.forumPosts?.map(f => `- [ID: ${f.id}] [${f.status}] ${f.title} (by ${context.users.find(u => u.id === f.author_id)?.name || 'Unknown'})`).join('\n') || '無'}

### 平台帳務資料
${context.latestPlatformMonth ? `最新資料月份：${context.latestPlatformMonth}（${context.platformSummary.length} 個平台）` : '尚無平台帳務資料'}
${context.platformBatches.length > 0 ? `已上傳月份：${context.platformBatches.map(b => `${b.record_month}(${b.versions}版)`).join('、')}` : ''}
${context.platformSummary.length > 0 ? context.platformSummary.map(p => `- ${p.platform_name}: 充值${p.dep || 0} / 提款${p.wth || 0} / 營利${p.prf || 0} / 餘額${p.bal || 0}`).join('\n') : ''}
用戶可以問你關於平台帳務的問題，使用 QUERY_PLATFORM_DATA 操作查詢詳細資料。
${memorySection}
${summarySection}

=== 你可以執行的操作 ===

**【最重要規則】** 當用戶要求你執行任何操作（建立、修改、刪除、發送等），你 **必須** 在回覆中包含 \`\`\`action 區塊。沒有 action 區塊 = 什麼都不會被執行。絕對不要只用文字說「已完成」「已建立」而不包含 action 區塊。

**【極重要：避免重複執行】**
- 對話歷史中你之前回覆的操作**已經全部執行完畢**，絕對**不要**在新回覆中重新包含那些舊的操作。
- 每次只處理用戶「當前這一輪」的新指令。
- 如果用戶本輪只是問問題或閒聊，你的回覆**絕對不能**包含任何 action 區塊。
- 例如：用戶問「今天需要做什麼」是在問問題，不是要建立任務，你應該用文字回答，**不要**輸出 action 區塊。
- 例如：用戶上一輪請你「建立任務A」，你已經建立了。用戶本輪說「再建立任務B」，你只需輸出建立 B 的 action，**不要**也輸出建立 A 的 action。

格式（必須嚴格遵守）：

\`\`\`action
{
  "actions": [
    {
      "action": "ACTION_NAME",
      "params": { "key": "value" },
      "description": "操作描述"
    }
  ]
}
\`\`\`

可用操作：
${actionList}

**各操作必要參數：**
- CREATE_TASK: { title, description, urgency("low"/"medium"/"high"/"urgent"), assignedTo?(人名), deadline?(YYYY-MM-DD) }
- CREATE_ANNOUNCEMENT: { title, content, priority?("NORMAL"/"IMPORTANT"/"URGENT") }
- CREATE_MEMO: { content, color?("yellow"/"blue"/"green"/"pink") }
- CREATE_WORK_LOG: { todayTasks, tomorrowTasks?, notes?, date?(YYYY-MM-DD) }
- CREATE_FINANCE_RECORD: { type("INCOME"/"EXPENSE"), amount(數字), category, description }
- CREATE_LEAVE_REQUEST: { type("事假"/"病假"/"特休"), startDate(YYYY-MM-DD), endDate?(YYYY-MM-DD), reason }
- CREATE_FORUM_POST: { title, content, category }
- COMPLETE_TASK: { taskId(必須用系統數據中的真實 task ID) }
- ASSIGN_TASK: { taskId, assignTo(人名) }
- SEND_CHAT_MESSAGE: { targetUser(人名), message }
- DELETE_TASK: { taskId }
- DELETE_ANNOUNCEMENT: { announcementId }
- UPDATE_TASK_STATUS: { taskId, status("待接取"/"已指派"/"進行中"/"已完成"/"已取消") }
- GENERATE_REPORT: { type, period, sections, chartType, compareWithPrevious }
- QUERY_PLATFORM_DATA: { month?(YYYY-MM，預設當月), platform?(平台名稱，模糊匹配), queryType?("summary"/"detail"/"total"，預設summary) }
  - summary: 所有平台月份摘要（充值/提款/營利/餘額）
  - detail: 指定平台的每日明細（需搭配 platform 參數）
  - total: 全平台合計數據

=== 重要規則 ===

1. **action 區塊是唯一的執行方式**：系統只通過解析 \`\`\`action 區塊來執行操作。你的文字回覆只是給用戶看的說明。如果你沒有包含 action 區塊，即使你文字說了「已建立」，系統也不會執行任何操作。每次用戶要求操作，你的回覆中都必須有 action 區塊。

**【嚴禁重複操作】** 每個操作只能在 actions 陣列中出現 **一次**。例如用戶說「建立一個任務」，actions 陣列中只能有一個 CREATE_TASK，絕對不要放兩個相同的操作。多步操作時，每一步也只出現一次。

2. **確認流程由系統自動處理**：你不需要自己問用戶「是否確認」。直接在回覆中包含 action 區塊，系統會根據操作等級自動處理：
   - direct 等級：系統自動執行，不問用戶
   - confirm 等級：系統自動彈出確認按鈕給用戶，用戶點確認後執行
   - danger 等級：系統自動彈出危險警告，用戶需二次確認
   所以你只需要：描述你要做的事 + 附上 action 區塊。

3. **模糊指令解析**：用戶可能用模糊的方式描述需求。你需要從上下文推斷具體對象。如果無法確定，請詢問用戶（此時不需要 action 區塊）。

4. **多步操作**：一句話可能需要多個操作。把所有步驟放在 actions 陣列中。

5. **記憶學習**：注意到用戶偏好模式時，在回覆中額外包含：
\`\`\`memory
{ "key": "偏好名稱", "value": "偏好內容" }
\`\`\`

6. **報表生成**：當用戶要求報表/分析時，先詢問偏好再使用 GENERATE_REPORT。

7. **權限檢查**：當前用戶角色是 ${currentUser.role}。只能執行該角色被授權的操作。

8. **純查詢**：如果用戶只是問問題（不需要執行操作），直接用數據回答，不需要 action 區塊。

9. **代名詞解析**：從對話歷史和上下文推斷「他」「那個」等代名詞的對象。

10. **真實 ID**：操作中引用的 taskId、announcementId 等，必須使用上方系統數據中列出的真實 ID（如 task-xxx、announcement-xxx），絕對不要自己編造 ID。`;

}

// ============================================================
// GEMINI API CALL
// ============================================================
async function callGemini(systemPrompt, conversationHistory, message) {
  if (!GEMINI_API_KEY) {
    return '⚠️ 尚未設定 Gemini API Key。請在環境變數中設定 GEMINI_API_KEY。';
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(GEMINI_API_URL + '?key=' + GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: '我已了解所有系統數據和操作能力，隨時為您服務。請用戶要求操作時我一定會包含 ```action 區塊。' }] },
            ...conversationHistory,
            { role: 'user', parts: [{ text: message }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error (attempt ${attempt}/${maxRetries}):`, response.status, errorText.substring(0, 200));
        if (attempt < maxRetries && (response.status === 502 || response.status === 503 || response.status === 429)) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        return `⚠️ AI 服務暫時無法使用（錯誤代碼: ${response.status}）。請稍後再試。`;
      }

      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      }
      if (attempt < maxRetries) { continue; }
      return '⚠️ AI 無法生成回答，請再試一次。';
    } catch (apiError) {
      console.error(`Gemini API network error (attempt ${attempt}/${maxRetries}):`, apiError.message);
      if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 1000 * attempt)); continue; }
      return '⚠️ 無法連接 AI 服務，請檢查網路連線。';
    }
  }
  return '⚠️ AI 服務暫時無法使用，請稍後再試。';
}

// ============================================================
// PARSE AI RESPONSE FOR ACTIONS & MEMORY
// ============================================================
function parseAIResponse(responseText) {
  let cleanText = responseText;
  let actions = null;
  let memory = null;

  console.log('[AI Parse] Raw response length:', responseText.length);
  console.log('[AI Parse] Raw response preview:', responseText.substring(0, 300));

  // Extract action block — try multiple patterns (action, json, ACTION, etc.)
  const actionPatterns = [
    /```action\s*\n?([\s\S]*?)\n?```/i,
    /```json\s*\n?([\s\S]*?)\n?```/i,
    /```\s*\n?(\{[\s\S]*?"actions"\s*:\s*\[[\s\S]*?\]\s*\})\n?```/i,
  ];

  for (const pattern of actionPatterns) {
    const actionMatch = responseText.match(pattern);
    if (actionMatch) {
      try {
        const parsed = JSON.parse(actionMatch[1]);
        if (parsed && parsed.actions && Array.isArray(parsed.actions)) {
          actions = parsed;
          cleanText = cleanText.replace(actionMatch[0], '').trim();
          console.log('[AI Parse] ✅ Actions found:', JSON.stringify(actions.actions.map(a => a.action)));
          break;
        }
      } catch (e) {
        console.error('[AI Parse] Failed to parse action JSON:', e.message, '| Raw:', actionMatch[1].substring(0, 100));
      }
    }
  }

  if (!actions) {
    // Last resort: try to find raw JSON with "actions" array anywhere in text
    const rawJsonMatch = responseText.match(/\{[\s\S]*?"actions"\s*:\s*\[[\s\S]*?\]\s*\}/);
    if (rawJsonMatch) {
      try {
        const parsed = JSON.parse(rawJsonMatch[0]);
        if (parsed && parsed.actions && Array.isArray(parsed.actions) && parsed.actions.length > 0) {
          actions = parsed;
          cleanText = cleanText.replace(rawJsonMatch[0], '').trim();
          console.log('[AI Parse] ✅ Actions found (raw JSON fallback):', JSON.stringify(actions.actions.map(a => a.action)));
        }
      } catch (e) { /* ignore */ }
    }
  }

  if (!actions) {
    console.log('[AI Parse] ⚠️ No action block found in response');
  }

  // Deduplicate actions — remove duplicate operations (same action type with similar params)
  if (actions && actions.actions && actions.actions.length > 1) {
    const seen = new Map();
    const deduped = [];
    for (const act of actions.actions) {
      // For dedup, normalize params: sort keys, trim values
      const normParams = {};
      if (act.params) {
        Object.keys(act.params).sort().forEach(k => {
          const v = act.params[k];
          normParams[k] = typeof v === 'string' ? v.trim().substring(0, 50) : v;
        });
      }
      const key = act.action + '|' + JSON.stringify(normParams);
      if (!seen.has(act.action)) {
        // First time seeing this action type
        seen.set(act.action, key);
        deduped.push(act);
      } else {
        // Same action type seen before — only allow if params are truly different
        const prevKey = seen.get(act.action);
        if (key === prevKey) {
          console.log('[AI Parse] ⚠️ Removed duplicate action:', act.action);
        } else {
          // Different params = legitimate multi-action (e.g. create 2 different tasks)
          deduped.push(act);
        }
      }
    }
    if (deduped.length < actions.actions.length) {
      console.log(`[AI Parse] Deduped: ${actions.actions.length} → ${deduped.length} actions`);
      actions.actions = deduped;
    }
  }

  // Extract memory block
  const memoryPatterns = [
    /```memory\s*\n?([\s\S]*?)\n?```/i,
  ];
  for (const pattern of memoryPatterns) {
    const memoryMatch = responseText.match(pattern);
    if (memoryMatch) {
      try {
        memory = JSON.parse(memoryMatch[1]);
        cleanText = cleanText.replace(memoryMatch[0], '').trim();
      } catch (e) {
        console.error('[AI Parse] Failed to parse memory JSON:', e.message);
      }
      break;
    }
  }

  // Clean up any remaining code block artifacts
  cleanText = cleanText.replace(/```[\s\S]*?```/g, '').trim();

  return { cleanText, actions, memory };
}

// ============================================================
// REPORT GENERATION ENGINE
// ============================================================
async function generateReport(db, params, currentUser) {
  db = getRawDb(db);

  const PDFDocument = require('pdfkit');
  const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

  const chartCanvas = new ChartJSNodeCanvas({ width: 600, height: 400, backgroundColour: 'white' });

  const today = getLocalDate();
  const period = params.period || 'week';
  let startDate, endDate = today;

  if (period === 'week') {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  } else if (period === 'month') {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  } else {
    startDate = params.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  const sections = params.sections || ['tasks', 'attendance', 'finance', 'worklogs'];
  const compareWithPrevious = params.compare || false;

  // Gather data
  const reportData = {};

  if (sections.includes('tasks')) {
    reportData.tasks = {
      active: safeQuery(db, "SELECT * FROM tasks WHERE status NOT IN ('已完成','已取消') AND created_at >= ?", [startDate]),
      completed: safeQuery(db, "SELECT * FROM tasks WHERE status = '已完成' AND created_at >= ?", [startDate]),
      overdue: safeQuery(db, "SELECT * FROM tasks WHERE status NOT IN ('已完成','已取消') AND deadline < ? AND deadline IS NOT NULL", [today]),
    };
    if (compareWithPrevious) {
      const prevStart = new Date(new Date(startDate).getTime() - (new Date(endDate).getTime() - new Date(startDate).getTime())).toISOString().split('T')[0];
      reportData.tasks.prevCompleted = safeQuery(db, "SELECT * FROM tasks WHERE status = '已完成' AND created_at >= ? AND created_at < ?", [prevStart, startDate]);
    }
  }

  if (sections.includes('attendance')) {
    reportData.attendance = safeQuery(db, 'SELECT * FROM attendance_records WHERE date >= ? AND date <= ?', [startDate, endDate]);
    if (compareWithPrevious) {
      const prevStart = new Date(new Date(startDate).getTime() - (new Date(endDate).getTime() - new Date(startDate).getTime())).toISOString().split('T')[0];
      reportData.prevAttendance = safeQuery(db, 'SELECT * FROM attendance_records WHERE date >= ? AND date < ?', [prevStart, startDate]);
    }
  }

  if (sections.includes('finance')) {
    reportData.finance = safeQuery(db, 'SELECT * FROM finance_records WHERE created_at >= ? AND created_at <= ?', [startDate, endDate + 'T23:59:59']);
    if (compareWithPrevious) {
      const prevStart = new Date(new Date(startDate).getTime() - (new Date(endDate).getTime() - new Date(startDate).getTime())).toISOString().split('T')[0];
      reportData.prevFinance = safeQuery(db, 'SELECT * FROM finance_records WHERE created_at >= ? AND created_at < ?', [prevStart, startDate]);
    }
  }

  if (sections.includes('worklogs')) {
    reportData.worklogs = safeQuery(db, 'SELECT * FROM work_logs WHERE date >= ? AND date <= ?', [startDate, endDate]);
  }

  const users = safeQuery(db, 'SELECT id, name, department, role FROM users');
  const departments = safeQuery(db, 'SELECT id, name FROM departments');

  // Generate charts
  const charts = [];

  if (sections.includes('tasks') && reportData.tasks) {
    // Task status pie chart
    const statusCounts = { '進行中': 0, '已完成': 0, '逾期': 0, '待處理': 0 };
    reportData.tasks.active.forEach(t => {
      if (t.status === '待接取') statusCounts['待處理']++;
      else statusCounts['進行中']++;
    });
    statusCounts['已完成'] = reportData.tasks.completed.length;
    statusCounts['逾期'] = reportData.tasks.overdue.length;

    const taskChartBuffer = await chartCanvas.renderToBuffer({
      type: 'pie',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: ['#3B82F6', '#10B981', '#EF4444', '#F59E0B']
        }]
      },
      options: {
        plugins: {
          title: { display: true, text: '任務狀態分佈', font: { size: 18 } },
          legend: { position: 'bottom' }
        }
      }
    });
    charts.push({ name: 'task_status', buffer: taskChartBuffer, title: '任務狀態分佈' });

    // Tasks by department bar chart
    const deptTaskCounts = {};
    departments.forEach(d => { deptTaskCounts[d.name] = { active: 0, completed: 0 }; });
    [...reportData.tasks.active, ...reportData.tasks.completed].forEach(t => {
      const user = users.find(u => u.id === t.assigned_to_user_id);
      const dept = departments.find(d => d.id === user?.department);
      if (dept) {
        if (t.status === '已完成') deptTaskCounts[dept.name].completed++;
        else deptTaskCounts[dept.name].active++;
      }
    });

    const deptNames = Object.keys(deptTaskCounts);
    if (deptNames.length > 0) {
      const deptChartBuffer = await chartCanvas.renderToBuffer({
        type: 'bar',
        data: {
          labels: deptNames,
          datasets: [
            { label: '進行中', data: deptNames.map(d => deptTaskCounts[d].active), backgroundColor: '#3B82F6' },
            { label: '已完成', data: deptNames.map(d => deptTaskCounts[d].completed), backgroundColor: '#10B981' }
          ]
        },
        options: {
          plugins: { title: { display: true, text: '各部門任務數量', font: { size: 18 } } },
          scales: { y: { beginAtZero: true } }
        }
      });
      charts.push({ name: 'dept_tasks', buffer: deptChartBuffer, title: '各部門任務數量' });
    }
  }

  if (sections.includes('attendance') && reportData.attendance) {
    // Daily attendance line chart
    const dateMap = {};
    reportData.attendance.forEach(r => {
      if (!dateMap[r.date]) dateMap[r.date] = 0;
      dateMap[r.date]++;
    });
    const dates = Object.keys(dateMap).sort();

    if (dates.length > 0) {
      const attChartBuffer = await chartCanvas.renderToBuffer({
        type: 'line',
        data: {
          labels: dates.map(d => d.substring(5)), // MM-DD format
          datasets: [{
            label: '出勤人數',
            data: dates.map(d => dateMap[d]),
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          plugins: { title: { display: true, text: '每日出勤人數趨勢', font: { size: 18 } } },
          scales: { y: { beginAtZero: true } }
        }
      });
      charts.push({ name: 'attendance_trend', buffer: attChartBuffer, title: '每日出勤人數趨勢' });
    }
  }

  if (sections.includes('finance') && reportData.finance) {
    // Income vs Expense bar chart
    let totalIncome = 0, totalExpense = 0;
    reportData.finance.forEach(f => {
      if (f.type === 'income') totalIncome += (f.amount || 0);
      else totalExpense += Math.abs(f.amount || 0);
    });

    const finChartBuffer = await chartCanvas.renderToBuffer({
      type: 'bar',
      data: {
        labels: ['收入', '支出', '淨額'],
        datasets: [{
          data: [totalIncome, totalExpense, totalIncome - totalExpense],
          backgroundColor: ['#10B981', '#EF4444', totalIncome - totalExpense >= 0 ? '#3B82F6' : '#F59E0B']
        }]
      },
      options: {
        plugins: {
          title: { display: true, text: '收支概況', font: { size: 18 } },
          legend: { display: false }
        },
        scales: { y: { beginAtZero: true } }
      }
    });
    charts.push({ name: 'finance_overview', buffer: finChartBuffer, title: '收支概況' });

    // Finance by category pie chart
    const catMap = {};
    reportData.finance.forEach(f => {
      const cat = f.category || '其他';
      if (!catMap[cat]) catMap[cat] = 0;
      catMap[cat] += Math.abs(f.amount || 0);
    });

    if (Object.keys(catMap).length > 0) {
      const catColors = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];
      const catChartBuffer = await chartCanvas.renderToBuffer({
        type: 'pie',
        data: {
          labels: Object.keys(catMap),
          datasets: [{
            data: Object.values(catMap),
            backgroundColor: catColors.slice(0, Object.keys(catMap).length)
          }]
        },
        options: {
          plugins: { title: { display: true, text: '支出類別分佈', font: { size: 18 } } }
        }
      });
      charts.push({ name: 'finance_category', buffer: catChartBuffer, title: '支出類別分佈' });
    }
  }

  // Generate PDF
  const reportsDir = path.join(__dirname, '../../data/reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const reportId = `report-${Date.now()}`;
  const pdfPath = path.join(reportsDir, `${reportId}.pdf`);

  // Register Chinese font if available, otherwise use built-in
  const fontPath = path.join(__dirname, '../../data/fonts/NotoSansTC-Regular.ttf');
  const hasChinese = fs.existsSync(fontPath);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    if (hasChinese) {
      doc.registerFont('Chinese', fontPath);
      doc.font('Chinese');
    }

    // Title page
    doc.fontSize(28).text('TaskFlow Pro', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(20).text(params.title || 'Report Analysis', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#666').text(`${startDate} ~ ${endDate}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString('zh-TW')}`, { align: 'center' });
    doc.text(`Requested by: ${currentUser.name}`, { align: 'center' });
    doc.moveDown(2);
    doc.fillColor('#000');

    // Summary section
    doc.fontSize(16).text('Executive Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);

    if (reportData.tasks) {
      const total = reportData.tasks.active.length + reportData.tasks.completed.length;
      const completionRate = total > 0 ? Math.round(reportData.tasks.completed.length / total * 100) : 0;
      doc.text(`Tasks: ${total} total, ${reportData.tasks.completed.length} completed (${completionRate}%), ${reportData.tasks.overdue.length} overdue`);
      if (compareWithPrevious && reportData.tasks.prevCompleted) {
        const prevTotal = reportData.tasks.prevCompleted.length;
        const diff = reportData.tasks.completed.length - prevTotal;
        doc.text(`  vs Previous: ${diff >= 0 ? '+' : ''}${diff} completed tasks (${prevTotal} prev)`);
      }
    }

    if (reportData.attendance) {
      const uniqueUsers = new Set(reportData.attendance.map(r => r.user_id)).size;
      doc.text(`Attendance: ${reportData.attendance.length} records, ${uniqueUsers} unique employees`);
    }

    if (reportData.finance) {
      let income = 0, expense = 0;
      reportData.finance.forEach(f => {
        if (f.type === 'income') income += (f.amount || 0);
        else expense += Math.abs(f.amount || 0);
      });
      doc.text(`Finance: Income $${income.toLocaleString()}, Expense $${expense.toLocaleString()}, Net $${(income - expense).toLocaleString()}`);
      if (compareWithPrevious && reportData.prevFinance) {
        let prevIncome = 0, prevExpense = 0;
        reportData.prevFinance.forEach(f => {
          if (f.type === 'income') prevIncome += (f.amount || 0);
          else prevExpense += Math.abs(f.amount || 0);
        });
        doc.text(`  vs Previous: Income $${prevIncome.toLocaleString()}, Expense $${prevExpense.toLocaleString()}`);
      }
    }

    if (reportData.worklogs) {
      doc.text(`Work Logs: ${reportData.worklogs.length} submissions`);
    }

    // Charts
    charts.forEach((chart, idx) => {
      doc.addPage();
      doc.fontSize(16).text(chart.title, { align: 'center' });
      doc.moveDown(1);
      doc.image(chart.buffer, {
        fit: [500, 350],
        align: 'center'
      });
    });

    // Detail pages
    if (reportData.tasks && sections.includes('tasks')) {
      doc.addPage();
      doc.fontSize(16).text('Task Details', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9);

      if (reportData.tasks.overdue.length > 0) {
        doc.fontSize(12).fillColor('#EF4444').text('Overdue Tasks:');
        doc.fillColor('#000').fontSize(9);
        reportData.tasks.overdue.forEach(t => {
          const user = users.find(u => u.id === t.assigned_to_user_id);
          doc.text(`  - ${t.title} (Assigned: ${user?.name || 'N/A'}, Due: ${t.deadline})`);
        });
        doc.moveDown(0.5);
      }

      doc.fontSize(12).fillColor('#000').text('Active Tasks:');
      doc.fontSize(9);
      reportData.tasks.active.slice(0, 30).forEach(t => {
        const user = users.find(u => u.id === t.assigned_to_user_id);
        doc.text(`  - [${t.urgency}] ${t.title} (${user?.name || 'N/A'}, Status: ${t.status})`);
      });
    }

    if (reportData.finance && sections.includes('finance')) {
      doc.addPage();
      doc.fontSize(16).fillColor('#000').text('Finance Details', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9);
      reportData.finance.slice(0, 40).forEach(f => {
        doc.text(`  [${f.created_at?.split('T')[0] || ''}] ${f.type}: $${f.amount} - ${f.category || ''} ${f.description || ''}`);
      });
    }

    doc.end();

    stream.on('finish', () => {
      resolve({
        reportId,
        filePath: pdfPath,
        downloadUrl: `/api/ai-assistant/reports/${reportId}/download`,
        summary: {
          period: `${startDate} ~ ${endDate}`,
          sections,
          chartCount: charts.length,
          compareWithPrevious
        }
      });
    });

    stream.on('error', reject);
  });
}

// ============================================================
// ROUTES
// ============================================================

// GET /alerts — Proactive alerts on login
router.get('/alerts', authenticateToken, requireManager, (req, res) => {
  try {
    const db = getRawDb(req.db);
    ensureTables(req.db);
    const alerts = generateAlerts(db, req.user);
    res.json({ alerts });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts', alerts: [] });
  }
});

// GET /conversations
router.get('/conversations', authenticateToken, requireManager, async (req, res) => {
  try {
    const db = getRawDb(req.db);
    ensureTables(req.db);
    const userId = req.user.id;

    // Auto-summarize old conversations
    await summarizeOldConversations(db, userId);

    const conversations = safeQuery(db, 'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at ASC LIMIT 50', [userId]);
    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// GET /memory — get user's AI memory
router.get('/memory', authenticateToken, requireManager, (req, res) => {
  try {
    const db = getRawDb(req.db);
    ensureTables(req.db);
    const memory = getUserMemory(db, req.user.id);
    res.json({ memory });
  } catch (error) {
    console.error('Get memory error:', error);
    res.status(500).json({ error: 'Failed to get memory' });
  }
});

// DELETE /memory/:key — delete a memory entry
router.delete('/memory/:key', authenticateToken, requireManager, (req, res) => {
  try {
    const db = getRawDb(req.db);
    ensureTables(req.db);
    safeRun(db, 'DELETE FROM ai_user_memory WHERE user_id = ? AND key = ?', [req.user.id, req.params.key]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete memory error:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// POST /query — Main AI query endpoint
router.post('/query', authenticateToken, requireManager, async (req, res) => {
  try {
    const db = getRawDb(req.db);
    ensureTables(req.db);
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const now = new Date().toISOString();
    const userMsgId = uuidv4();
    safeRun(db, 'INSERT INTO ai_conversations (id, user_id, role, message, created_at) VALUES (?, ?, ?, ?, ?)',
      [userMsgId, userId, 'user', message, now]);

    // Get conversation context (only last 2 messages = 1 turn, to avoid AI re-emitting historical actions)
    // Also filter out any assistant messages that contained actions — they cause Gemini to re-emit old operations
    const recentConversationsRaw = safeQuery(db, "SELECT role, message, action_taken FROM ai_conversations WHERE user_id = ? AND id != ? ORDER BY created_at DESC LIMIT 4", [userId, userMsgId]);
    const recentConversations = recentConversationsRaw.filter(c => {
      // Skip assistant messages that had actions — those are the source of re-emission bugs
      if (c.role === 'assistant' && c.action_taken) return false;
      return true;
    }).slice(0, 2);
    const conversationHistory = recentConversations.reverse().map(conv => ({
      role: conv.role === 'user' ? 'user' : 'model',
      parts: [{ text: conv.message }]
    }));

    // Get user memory & summaries
    const userMemory = getUserMemory(db, userId);
    const summaries = getConversationSummaries(db, userId);

    // Build system prompt
    const systemContext = getSystemContext(req.db);
    const systemPrompt = buildSystemPrompt(systemContext, req.user, userMemory, summaries);

    // Call Gemini
    const aiResponseRaw = await callGemini(systemPrompt, conversationHistory, message);

    // Parse response for actions & memory
    const { cleanText, actions, memory } = parseAIResponse(aiResponseRaw);

    // Save memory if detected
    if (memory && memory.key && memory.value) {
      saveUserMemory(db, userId, memory.key, memory.value, message);
    }

    // Process actions
    let actionResults = null;
    let pendingActionId = null;

    console.log('[Query] Actions parsed:', actions ? JSON.stringify(actions.actions?.map(a => a.action)) : 'NONE');

    // Cross-turn dedup: filter out actions that were already executed in the last 10 minutes for this user
    if (actions && actions.actions && actions.actions.length > 0) {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const recentActions = safeQuery(db,
        'SELECT action_taken, message FROM ai_conversations WHERE user_id = ? AND role = ? AND action_taken IS NOT NULL AND created_at > ? ORDER BY created_at DESC LIMIT 20',
        [userId, 'assistant', tenMinAgo]);

      // Build fingerprints of recently executed actions
      const recentFingerprints = new Set();
      for (const row of recentActions) {
        try {
          const actionNames = JSON.parse(row.action_taken || '[]');
          // Parse the message to extract titles/descriptions from the previous action
          const msgLower = (row.message || '').toLowerCase();
          for (const name of actionNames) {
            // Extract a signature from the stored message (e.g., task title, announcement title)
            const titleMatch = row.message && row.message.match(/「([^」]{2,50})」/);
            if (titleMatch) {
              recentFingerprints.add(name + '|' + titleMatch[1].trim());
            }
          }
        } catch (e) {}
      }

      const beforeCount = actions.actions.length;
      actions.actions = actions.actions.filter(a => {
        const title = a.params && (a.params.title || a.params.content || a.params.description);
        if (!title) return true;
        const fp = a.action + '|' + String(title).trim().substring(0, 50);
        if (recentFingerprints.has(fp)) {
          console.log('[Query] ⚠️ Cross-turn dedup — skipping recently executed:', fp);
          return false;
        }
        return true;
      });
      if (actions.actions.length < beforeCount) {
        console.log(`[Query] Cross-turn dedup: ${beforeCount} → ${actions.actions.length} actions`);
      }
      if (actions.actions.length === 0) {
        actions = null;
      }
    }

    if (actions && actions.actions && actions.actions.length > 0) {
      // Check permissions
      const allAllowed = actions.actions.every(a => {
        const def = ACTION_DEFINITIONS[a.action];
        if (!def) return false;
        return def.requiredRoles.includes(req.user.role);
      });

      if (!allAllowed) {
        const aiMsgId = uuidv4();
        const permMsg = cleanText + '\n\n⚠️ 部分操作超出您的權限，無法執行。';
        safeRun(db, 'INSERT INTO ai_conversations (id, user_id, role, message, created_at) VALUES (?, ?, ?, ?, ?)',
          [aiMsgId, userId, 'assistant', permMsg, new Date().toISOString()]);
        return res.json({ response: permMsg, actions: null, pendingActionId: null });
      }

      // Check if any actions need confirmation
      const needsConfirm = actions.actions.some(a => {
        const def = ACTION_DEFINITIONS[a.action];
        return def && (def.level === 'confirm' || def.level === 'danger');
      });

      if (needsConfirm) {
        // Store pending actions for confirmation
        console.log('[Query] Actions need confirmation, storing as pending');
        pendingActionId = uuidv4();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry
        safeRun(db, 'INSERT INTO ai_pending_actions (id, user_id, actions, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
          [pendingActionId, userId, JSON.stringify(actions.actions), 'pending', now, expiresAt]);
      } else {
        // Direct execution for 'direct' level actions
        console.log('[Query] Direct execution for:', actions.actions.map(a => a.action));
        actionResults = [];
        for (const a of actions.actions) {
          const result = executeAction(req.db, a.action, a.params, req.user);
          console.log('[Query] Action result:', a.action, JSON.stringify(result));
          actionResults.push({ action: a.action, description: a.description, ...result });
        }
      }
    }

    // Save AI response
    const aiMsgId = uuidv4();
    safeRun(db, 'INSERT INTO ai_conversations (id, user_id, role, message, intent, action_taken, action_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [aiMsgId, userId, 'assistant', cleanText,
       actions ? 'action' : 'query',
       actions ? JSON.stringify(actions.actions.map(a => a.action)) : null,
       actionResults ? JSON.stringify(actionResults) : null,
       new Date().toISOString()]);

    res.json({
      response: cleanText,
      actions: actions?.actions || null,
      actionResults,
      pendingActionId,
      memory: memory || null
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

// POST /confirm — Confirm pending actions
router.post('/confirm', authenticateToken, requireManager, async (req, res) => {
  try {
    const db = getRawDb(req.db);
    ensureTables(req.db);
    const { pendingActionId } = req.body;
    const userId = req.user.id;

    const pending = safeGet(db, "SELECT * FROM ai_pending_actions WHERE id = ? AND user_id = ? AND status = 'pending'", [pendingActionId, userId]);
    if (!pending) {
      return res.status(404).json({ error: '找不到待確認的操作，可能已過期' });
    }

    // Check expiry
    if (new Date(pending.expires_at) < new Date()) {
      safeRun(db, "UPDATE ai_pending_actions SET status = 'expired' WHERE id = ?", [pendingActionId]);
      return res.status(410).json({ error: '操作已過期，請重新操作' });
    }

    const actions = JSON.parse(pending.actions);
    const results = [];
    console.log('[Confirm] Executing', actions.length, 'pending actions:', actions.map(a => a.action));

    for (const a of actions) {
      console.log('[Confirm] Executing:', a.action, 'params:', JSON.stringify(a.params));
      const result = executeAction(req.db, a.action, a.params, req.user);
      console.log('[Confirm] Result:', a.action, JSON.stringify(result));
      results.push({ action: a.action, description: a.description, ...result });

      // Handle report generation specially
      if (a.action === 'GENERATE_REPORT' && result.message === 'REPORT_GENERATION_TRIGGERED') {
        try {
          const reportResult = await generateReport(req.db, a.params, req.user);
          results[results.length - 1] = {
            action: 'GENERATE_REPORT',
            description: a.description,
            success: true,
            message: `報表已生成`,
            reportUrl: reportResult.downloadUrl,
            reportSummary: reportResult.summary
          };
        } catch (reportError) {
          console.error('Report generation error:', reportError);
          results[results.length - 1] = {
            action: 'GENERATE_REPORT',
            description: a.description,
            success: false,
            message: `報表生成失敗: ${reportError.message}`
          };
        }
      }
    }

    safeRun(db, "UPDATE ai_pending_actions SET status = 'confirmed' WHERE id = ?", [pendingActionId]);

    // Save result as AI message
    const resultMsg = results.map(r => `${r.success ? '✅' : '❌'} ${r.description || r.action}: ${r.message}`).join('\n');
    safeRun(db, 'INSERT INTO ai_conversations (id, user_id, role, message, action_taken, action_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, 'assistant', `操作執行結果：\n${resultMsg}`, JSON.stringify(results.map(r => r.action)), JSON.stringify(results), new Date().toISOString()]);

    res.json({ results });
  } catch (error) {
    console.error('Confirm error:', error);
    res.status(500).json({ error: 'Failed to confirm actions' });
  }
});

// POST /cancel — Cancel pending actions
router.post('/cancel', authenticateToken, requireManager, (req, res) => {
  try {
    const db = getRawDb(req.db);
    ensureTables(req.db);
    const { pendingActionId } = req.body;
    safeRun(db, "UPDATE ai_pending_actions SET status = 'cancelled' WHERE id = ? AND user_id = ?", [pendingActionId, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel actions' });
  }
});

// POST /generate-report — Direct report generation
router.post('/generate-report', authenticateToken, requireManager, async (req, res) => {
  try {
    ensureTables(req.db);
    const result = await generateReport(req.db, req.body, req.user);
    res.json(result);
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: `Report generation failed: ${error.message}` });
  }
});

// GET /reports/:id/download — Download generated report
router.get('/reports/:id/download', authenticateToken, (req, res) => {
  const reportsDir = path.join(__dirname, '../../data/reports');
  const filePath = path.join(reportsDir, `${req.params.id}.pdf`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Report not found' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}.pdf"`);
  fs.createReadStream(filePath).pipe(res);
});

// DELETE /conversations/:id
router.delete('/conversations/:id', authenticateToken, requireManager, (req, res) => {
  try {
    const db = getRawDb(req.db);
    ensureTables(req.db);
    safeRun(db, 'DELETE FROM ai_conversations WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// DELETE /conversations
router.delete('/conversations', authenticateToken, requireManager, (req, res) => {
  try {
    const db = getRawDb(req.db);
    ensureTables(req.db);
    safeRun(db, 'DELETE FROM ai_conversations WHERE user_id = ?', [req.user.id]);
    safeRun(db, 'DELETE FROM ai_conversation_summaries WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Clear conversations error:', error);
    res.status(500).json({ error: 'Failed to clear conversations' });
  }
});

// Temporary cleanup endpoint for QA testing
router.post('/cleanup-test-data', authenticateToken, requireRole(['BOSS']), (req, res) => {
  try {
    const db = req.db;
    const tables = ['tasks', 'announcements', 'memos', 'work_logs', 'finance_records', 'leave_requests', 'suggestions',
                    'ai_conversations', 'ai_user_memory', 'ai_pending_actions', 'ai_conversation_summaries'];
    const results = {};
    for (const table of tables) {
      try {
        const count = db.db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get();
        db.db.prepare(`DELETE FROM ${table}`).run();
        results[table] = { deleted: count.c };
      } catch(e) { results[table] = { error: e.message }; }
    }
    res.json({ success: true, results });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
