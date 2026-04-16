const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// ============================================================
// HELPERS (same pattern as ai-assistant.js)
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
  catch (e) { console.error('[Service API] DB query error:', e.message); return []; }
}

function safeGet(db, sql, params) {
  try { return params ? db.prepare(sql).get(...(Array.isArray(params) ? params : [params])) : db.prepare(sql).get(); }
  catch (e) { console.error('[Service API] DB get error:', e.message); return null; }
}

function safeRun(db, sql, params) {
  try { return params ? db.prepare(sql).run(...(Array.isArray(params) ? params : [params])) : db.prepare(sql).run(); }
  catch (e) { console.error('[Service API] DB run error:', e.message, '| SQL:', sql.substring(0, 80)); return { error: e.message }; }
}

function findUserByName(db, name) {
  if (!name) return null;
  db = getRawDb(db);
  let user = safeGet(db, 'SELECT * FROM users WHERE name = ?', [name]);
  if (user) return user;
  user = safeGet(db, 'SELECT * FROM users WHERE name LIKE ?', [`%${name}%`]);
  return user;
}

// ============================================================
// MIDDLEWARE: authenticateServiceToken
// ============================================================
function authenticateServiceToken(req, res, next) {
  try {
    const serviceToken = process.env.SERVICE_TOKEN;
    if (!serviceToken) {
      console.error('[Service API] SERVICE_TOKEN env var not configured');
      return res.status(503).json({ error: 'Service API not configured' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('ServiceToken ')) {
      return res.status(401).json({ error: 'Missing or invalid ServiceToken' });
    }

    const token = authHeader.substring('ServiceToken '.length);
    if (token !== serviceToken) {
      console.error('[Service API] Invalid service token attempt');
      return res.status(401).json({ error: 'Invalid service token' });
    }

    // Create virtual BOSS user
    req.user = {
      id: 'service-boss',
      username: 'BOSS',
      role: 'BOSS',
      display_name: '總部管理者',
      name: '總部管理者'
    };

    console.log('[Service API] Authenticated via ServiceToken');
    next();
  } catch (error) {
    console.error('[Service API] Auth error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

// Apply middleware to all routes
router.use(authenticateServiceToken);

// ============================================================
// ENDPOINT 1: GET /health
// ============================================================
router.get('/health', (req, res) => {
  try {
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      version: '3.9.0'
    });
  } catch (error) {
    console.error('[Service API] Health check error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================================
// ENDPOINT 2: GET /context
// ============================================================
router.get('/context', (req, res) => {
  try {
    const db = getRawDb(req.db);
    const today = getLocalDate();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // --- Users ---
    const users = safeQuery(db, 'SELECT id, name, role, department, username, created_at FROM users');
    const userCount = users.length;

    // --- Tasks ---
    const tasksByStatus = safeQuery(db, "SELECT status, COUNT(*) as count FROM tasks GROUP BY status");
    const activeTasks = safeQuery(db, "SELECT id, title, status, urgency, assigned_to_user_id, deadline, description, created_at FROM tasks WHERE status NOT IN ('已完成','已取消') ORDER BY created_at DESC LIMIT 50");
    const completedTasksCount = safeGet(db, "SELECT COUNT(*) as count FROM tasks WHERE status = '已完成'");

    // --- Announcements ---
    const recentAnnouncements = safeQuery(db, 'SELECT id, title, content, priority, created_at, created_by, read_by FROM announcements ORDER BY created_at DESC LIMIT 15');

    // --- Leave requests ---
    const pendingLeaves = safeQuery(db, "SELECT id, user_id, leave_type, start_date, end_date, reason, status, created_at FROM leave_requests WHERE status = 'PENDING' ORDER BY created_at DESC");
    const recentLeaves = safeQuery(db, "SELECT id, user_id, leave_type, start_date, end_date, reason, status, created_at FROM leave_requests WHERE created_at >= ? ORDER BY created_at DESC LIMIT 20", [thirtyDaysAgo]);

    // --- Attendance (last 7 days) ---
    const attendanceRecords = safeQuery(db, 'SELECT user_id, date, status, clock_in, clock_out FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 200', [sevenDaysAgo]);
    const todayAttendance = safeQuery(db, 'SELECT user_id, status, clock_in, clock_out FROM attendance_records WHERE date = ?', [today]);
    const attendanceSummary = {
      last7Days: attendanceRecords.length,
      todayPresent: todayAttendance.length,
      totalUsers: userCount
    };

    // --- Finance ---
    const financeRecords = safeQuery(db, 'SELECT id, type, amount, category, description, created_at FROM finance_records ORDER BY created_at DESC LIMIT 30');
    const financeSummary = safeGet(db, "SELECT COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as totalIncome, COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as totalExpense FROM finance_records");

    // --- Work logs ---
    const workLogs = safeQuery(db, 'SELECT id, user_id, date, today_tasks, tomorrow_tasks, notes, created_at FROM work_logs WHERE date >= ? ORDER BY date DESC LIMIT 50', [sevenDaysAgo]);

    // --- Memos ---
    const recentMemos = safeQuery(db, 'SELECT id, content, created_at, user_id FROM memos ORDER BY created_at DESC LIMIT 15');

    // --- Forum ---
    const forumPosts = safeQuery(db, 'SELECT id, title, content, category, status, author_id, created_at FROM suggestions ORDER BY created_at DESC LIMIT 15');

    // --- Platform revenue ---
    const platformBatches = safeQuery(db, "SELECT record_month, COUNT(*) as versions FROM platform_upload_batches GROUP BY record_month ORDER BY record_month DESC LIMIT 6");
    const latestPlatformBatch = safeGet(db, "SELECT id, record_month FROM platform_upload_batches WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1");
    let platformSummary = [];
    if (latestPlatformBatch) {
      platformSummary = safeQuery(db, "SELECT platform_name, SUM(deposit) as dep, SUM(withdrawal) as wth, SUM(profit) as prf, MAX(balance) as bal FROM platform_daily_records WHERE upload_batch_id = ? GROUP BY platform_name", [latestPlatformBatch.id]);
    }

    console.log('[Service API] Context fetched successfully');

    res.json({
      userCount,
      users,
      taskStats: {
        byStatus: tasksByStatus,
        activeTasks,
        completedCount: completedTasksCount?.count || 0
      },
      recentAnnouncements,
      leaveRequests: {
        pending: pendingLeaves,
        recent: recentLeaves
      },
      attendanceSummary,
      attendanceRecords,
      financeSummary: {
        totalIncome: financeSummary?.totalIncome || 0,
        totalExpense: financeSummary?.totalExpense || 0,
        recentRecords: financeRecords
      },
      workLogs,
      recentMemos,
      forumPosts,
      platformData: {
        batches: platformBatches,
        summary: platformSummary,
        latestMonth: latestPlatformBatch?.record_month || null
      }
    });
  } catch (error) {
    console.error('[Service API] Context error:', error);
    res.status(500).json({ error: 'Failed to fetch context', message: error.message });
  }
});

// ============================================================
// ENDPOINT 3: POST /execute
// ============================================================
router.post('/execute', (req, res) => {
  try {
    const { action, params } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, message: 'Missing action parameter' });
    }

    console.log(`[Service API] Executing action: ${action}`, JSON.stringify(params || {}).substring(0, 200));

    const db = getRawDb(req.db);
    const currentUser = req.user;
    const now = new Date().toISOString();
    const today = getLocalDate();
    let result;

    switch (action) {
      case 'CREATE_TASK': {
        const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const assignee = params.assignedTo ? findUserByName(req.db, params.assignedTo) : null;
        const r = safeRun(db, `INSERT INTO tasks (id, title, description, status, urgency, assigned_to_user_id, deadline, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, params.title, params.description || '', '待接取', params.urgency || 'medium', assignee?.id || currentUser.id, params.deadline || null, currentUser.id, now]);
        if (r?.error) { result = { success: false, message: `建立任務失敗: ${r.error}` }; break; }
        result = { success: true, message: `任務「${params.title}」已建立${assignee ? `，指派給 ${assignee.name}` : ''}`, data: { id } };
        break;
      }

      case 'CREATE_ANNOUNCEMENT': {
        const id = `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const r = safeRun(db, `INSERT INTO announcements (id, title, content, priority, created_by, created_at, read_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, params.title, params.content, params.priority || 'NORMAL', currentUser.id, now, '[]']);
        if (r?.error) { result = { success: false, message: `發布公告失敗: ${r.error}` }; break; }
        result = { success: true, message: `公告「${params.title}」已發布`, data: { id } };
        break;
      }

      case 'CREATE_MEMO': {
        const id = uuidv4();
        const r = safeRun(db, `INSERT INTO memos (id, user_id, type, content, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, currentUser.id, 'TEXT', params.content, params.color || 'yellow', now, now]);
        if (r?.error) { result = { success: false, message: `建立備忘錄失敗: ${r.error}` }; break; }
        result = { success: true, message: '備忘錄已建立', data: { id } };
        break;
      }

      case 'CREATE_WORK_LOG': {
        const logDate = params.date || today;
        const existing = safeGet(db, 'SELECT id FROM work_logs WHERE user_id = ? AND date = ?', [currentUser.id, logDate]);
        if (existing) {
          const rUpd = safeRun(db, `UPDATE work_logs SET today_tasks = ?, tomorrow_tasks = ?, notes = ?, updated_at = ? WHERE id = ?`,
            [params.todayTasks, params.tomorrowTasks || '', params.notes || '', now, existing.id]);
          if (rUpd?.error) { result = { success: false, message: `更新工作日誌失敗: ${rUpd.error}` }; break; }
          result = { success: true, message: '工作日誌已更新' };
          break;
        }
        const id = uuidv4();
        const r = safeRun(db, `INSERT INTO work_logs (id, user_id, department_id, date, today_tasks, tomorrow_tasks, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, currentUser.id, 'default', logDate, params.todayTasks, params.tomorrowTasks || '', params.notes || '', now, now]);
        if (r?.error) { result = { success: false, message: `建立工作日誌失敗: ${r.error}` }; break; }
        result = { success: true, message: '工作日誌已建立', data: { id } };
        break;
      }

      case 'SEND_MESSAGE': {
        const targetUser = findUserByName(req.db, params.targetUser);
        if (!targetUser) { result = { success: false, message: `找不到用戶「${params.targetUser}」` }; break; }
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
        result = { success: true, message: `訊息已發送給 ${targetUser.name}` };
        break;
      }

      case 'CREATE_FORUM_POST': {
        const id = `forum-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const validCategories = ['系統建議', '工作流程', '薪資福利', '設施修繕', '團隊活動', '其他'];
        let cat = params.category || '其他';
        if (!validCategories.includes(cat)) cat = '其他';
        const r = safeRun(db, `INSERT INTO suggestions (id, title, content, category, status, author_id, created_at, updated_at, upvotes, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, params.title, params.content, cat, 'OPEN', currentUser.id, now, now, '[]', '[]']);
        if (r?.error) { result = { success: false, message: `建立提案失敗: ${r.error}` }; break; }
        result = { success: true, message: `提案「${params.title}」已建立`, data: { id } };
        break;
      }

      case 'CREATE_FINANCE_RECORD': {
        const id = uuidv4();
        const finType = (params.type || 'EXPENSE').toUpperCase();
        const r = safeRun(db, `INSERT INTO finance_records (id, date, type, amount, category, description, recorded_by, owner_id, user_id, department_id, scope, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, today, finType, params.amount, params.category || '其他', params.description || '', currentUser.id, currentUser.id, currentUser.id, 'default', 'DEPARTMENT', now]);
        if (r?.error) { result = { success: false, message: `建立財務紀錄失敗: ${r.error}` }; break; }
        result = { success: true, message: `財務紀錄已建立：${finType === 'INCOME' ? '收入' : '支出'} $${params.amount}`, data: { id } };
        break;
      }

      case 'CREATE_LEAVE_REQUEST': {
        const id = uuidv4();
        const startD = params.startDate || today;
        const endD = params.endDate || startD;
        const dStart = new Date(startD); const dEnd = new Date(endD);
        const diffDays = Math.max(1, Math.ceil((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1);
        const r = safeRun(db, `INSERT INTO leave_requests (id, user_id, department_id, leave_type, start_date, end_date, days, reason, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, currentUser.id, '', params.type || '事假', startD, endD, diffDays, params.reason || '', 'PENDING', now, now]);
        if (r?.error) { result = { success: false, message: `請假申請失敗: ${r.error}` }; break; }
        result = { success: true, message: `請假申請已送出（${startD}${endD !== startD ? ' ~ ' + endD : ''}）`, data: { id } };
        break;
      }

      case 'APPROVE_LEAVE': {
        const leave = safeGet(db, 'SELECT * FROM leave_requests WHERE id = ?', [params.leaveId]);
        if (!leave) { result = { success: false, message: '找不到該請假申請' }; break; }
        const r = safeRun(db, "UPDATE leave_requests SET status = 'APPROVED', approver_id = ?, approved_at = ? WHERE id = ?", [currentUser.id, now, params.leaveId]);
        if (r?.error) { result = { success: false, message: `批准失敗: ${r.error}` }; break; }
        const leaveUser = safeGet(db, 'SELECT name FROM users WHERE id = ?', [leave.user_id]);
        result = { success: true, message: `已批准 ${leaveUser?.name || '員工'} 的請假申請` };
        break;
      }

      case 'REJECT_LEAVE': {
        const leave = safeGet(db, 'SELECT * FROM leave_requests WHERE id = ?', [params.leaveId]);
        if (!leave) { result = { success: false, message: '找不到該請假申請' }; break; }
        const r = safeRun(db, "UPDATE leave_requests SET status = 'REJECTED', approver_id = ?, approved_at = ? WHERE id = ?", [currentUser.id, now, params.leaveId]);
        if (r?.error) { result = { success: false, message: `駁回失敗: ${r.error}` }; break; }
        const leaveUser = safeGet(db, 'SELECT name FROM users WHERE id = ?', [leave.user_id]);
        result = { success: true, message: `已駁回 ${leaveUser?.name || '員工'} 的請假申請` };
        break;
      }

      case 'ASSIGN_TASK': {
        const task = safeGet(db, 'SELECT * FROM tasks WHERE id = ?', [params.taskId]);
        if (!task) { result = { success: false, message: '找不到該任務' }; break; }
        const assignee = findUserByName(req.db, params.assignTo);
        if (!assignee) { result = { success: false, message: `找不到用戶「${params.assignTo}」` }; break; }
        const r = safeRun(db, "UPDATE tasks SET assigned_to_user_id = ?, status = '已指派' WHERE id = ?", [assignee.id, params.taskId]);
        if (r?.error) { result = { success: false, message: `指派失敗: ${r.error}` }; break; }
        result = { success: true, message: `任務「${task.title}」已轉派給 ${assignee.name}` };
        break;
      }

      case 'COMPLETE_TASK': {
        const task = safeGet(db, 'SELECT * FROM tasks WHERE id = ?', [params.taskId]);
        if (!task) { result = { success: false, message: '找不到該任務' }; break; }
        const r = safeRun(db, "UPDATE tasks SET status = '已完成', progress = 100 WHERE id = ?", [params.taskId]);
        if (r?.error) { result = { success: false, message: `完成任務失敗: ${r.error}` }; break; }
        result = { success: true, message: `任務「${task.title}」已標記為完成` };
        break;
      }

      case 'DELETE_TASK': {
        const task = safeGet(db, 'SELECT * FROM tasks WHERE id = ?', [params.taskId]);
        if (!task) { result = { success: false, message: '找不到該任務' }; break; }
        safeRun(db, 'DELETE FROM tasks WHERE id = ?', [params.taskId]);
        result = { success: true, message: `任務「${task.title}」已刪除` };
        break;
      }

      case 'DELETE_ANNOUNCEMENT': {
        const ann = safeGet(db, 'SELECT * FROM announcements WHERE id = ?', [params.announcementId]);
        if (!ann) { result = { success: false, message: '找不到該公告' }; break; }
        safeRun(db, 'DELETE FROM announcements WHERE id = ?', [params.announcementId]);
        result = { success: true, message: `公告「${ann.title}」已刪除` };
        break;
      }

      case 'MANUAL_ATTENDANCE': {
        const targetUser = findUserByName(req.db, params.userName);
        if (!targetUser) { result = { success: false, message: `找不到用戶「${params.userName}」` }; break; }
        const attId = uuidv4();
        safeRun(db, `INSERT INTO attendance_records (id, user_id, date, status, clock_in, clock_out, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [attId, targetUser.id, params.date || today, 'ONLINE', params.clockIn || '09:00', params.clockOut || '18:00', params.notes || '總部 Service API 手動補登', now]);
        result = { success: true, message: `已為 ${targetUser.name} 補登 ${params.date || today} 的出勤紀錄` };
        break;
      }

      case 'SET_USER_EXCLUSION': {
        const targetUser2 = findUserByName(req.db, params.userName);
        if (!targetUser2) { result = { success: false, message: `找不到用戶「${params.userName}」` }; break; }
        const newValue = params.exclude === false ? 0 : 1;
        const r = safeRun(db, "UPDATE users SET exclude_from_attendance = ?, updated_at = ? WHERE id = ?",
          [newValue, now, targetUser2.id]);
        if (r?.error) { result = { success: false, message: '設定失敗：' + r.error }; break; }
        const action = newValue === 1 ? '已標記為「免打卡」' : '已取消「免打卡」標記';
        result = { success: true, message: `${targetUser2.name} ${action}` };
        break;
      }

      default:
        result = { success: false, message: `Unknown action: ${action}` };
    }

    console.log(`[Service API] Action ${action} result:`, result.success ? 'SUCCESS' : 'FAILED', result.message);
    res.json(result);
  } catch (error) {
    console.error('[Service API] Execute error:', error);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

// ============================================================
// ENDPOINT 4: GET /alerts
// ============================================================
router.get('/alerts', (req, res) => {
  try {
    const db = getRawDb(req.db);
    const today = getLocalDate();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Pending leave requests older than 3 days
    const pendingLeaves = safeQuery(db,
      "SELECT lr.id, lr.user_id, lr.leave_type, lr.start_date, lr.end_date, lr.reason, lr.created_at, u.name as user_name FROM leave_requests lr LEFT JOIN users u ON lr.user_id = u.id WHERE lr.status = 'PENDING' AND lr.created_at <= ? ORDER BY lr.created_at ASC",
      [threeDaysAgo]);

    // Overdue tasks (deadline > 7 days ago)
    const overdueTasks = safeQuery(db,
      "SELECT t.id, t.title, t.status, t.urgency, t.deadline, t.assigned_to_user_id, u.name as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to_user_id = u.id WHERE t.status NOT IN ('已完成','已取消') AND t.deadline IS NOT NULL AND t.deadline < ? ORDER BY t.deadline ASC",
      [sevenDaysAgo]);

    // Today's attendance stats (exclude users marked as exempt from attendance)
    const totalUsers = safeGet(db, 'SELECT COUNT(*) as count FROM users WHERE exclude_from_attendance = 0 OR exclude_from_attendance IS NULL');
    const todayAttendance = safeQuery(db, 'SELECT user_id FROM attendance_records WHERE date = ?', [today]);
    const presentCount = todayAttendance.length;
    const totalCount = totalUsers?.count || 0;

    console.log(`[Service API] Alerts fetched: ${pendingLeaves.length} pending leaves, ${overdueTasks.length} overdue tasks`);

    res.json({
      pendingLeaves,
      overdueTasks,
      attendanceToday: {
        total: totalCount,
        present: presentCount,
        absent: totalCount - presentCount
      }
    });
  } catch (error) {
    console.error('[Service API] Alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts', message: error.message });
  }
});

module.exports = router;
