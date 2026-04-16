const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../../middleware/auth');

// ============================================================
// CONFIG
// ============================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
  catch (e) { console.error('[Super AI] DB query error:', e.message); return []; }
}

function safeGet(db, sql, params) {
  try { return params ? db.prepare(sql).get(...(Array.isArray(params) ? params : [params])) : db.prepare(sql).get(); }
  catch (e) { console.error('[Super AI] DB get error:', e.message); return null; }
}

function safeRun(db, sql, params) {
  try { return params ? db.prepare(sql).run(...(Array.isArray(params) ? params : [params])) : db.prepare(sql).run(); }
  catch (e) { console.error('[Super AI] DB run error:', e.message, '| SQL:', sql.substring(0, 80)); return { error: e.message }; }
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
// MIDDLEWARE: BOSS-only access
// ============================================================
function requireBoss(req, res, next) {
  if (!req.user || req.user.role !== 'BOSS') {
    return res.status(403).json({ error: '權限不足，僅 BOSS 可操作' });
  }
  next();
}

// Apply auth middleware to all routes
router.use(authenticateToken);
router.use(requireBoss);

// ============================================================
// DB INIT — ensure AI tables exist
// ============================================================
function ensureAITables(db) {
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
    ensureAITables(db);
    tablesInitialized = true;
  }
}

// ============================================================
// HELPER: getSuperContext — fetch context from all subsidiaries
// ============================================================
async function getSuperContext(db) {
  db = getRawDb(db);
  const subsidiaries = safeQuery(db, 'SELECT * FROM subsidiaries WHERE is_active = 1');

  if (subsidiaries.length === 0) {
    console.log('[Super AI] No active subsidiaries found');
    return { companies: {} };
  }

  const results = await Promise.allSettled(
    subsidiaries.map(async (sub) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const baseUrl = sub.base_url.replace(/\/+$/, '');
        const response = await fetch(`${baseUrl}/api/service/context`, {
          method: 'GET',
          headers: {
            'Authorization': `ServiceToken ${sub.service_token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          console.error(`[Super AI] Context fetch failed for ${sub.name}: HTTP ${response.status}`);
          return { id: sub.id, name: sub.name, status: 'offline', data: null };
        }

        const data = await response.json();
        console.log(`[Super AI] Context fetched from ${sub.name}`);
        return { id: sub.id, name: sub.name, status: 'online', data };
      } catch (error) {
        clearTimeout(timeout);
        console.error(`[Super AI] Context fetch error for ${sub.name}:`, error.message);
        return { id: sub.id, name: sub.name, status: 'offline', data: null };
      }
    })
  );

  const companies = {};
  for (const result of results) {
    const value = result.status === 'fulfilled' ? result.value : { id: 'unknown', name: 'unknown', status: 'offline', data: null };
    companies[value.id] = {
      name: value.name,
      status: value.status,
      data: value.data
    };
  }

  const onlineCount = Object.values(companies).filter(c => c.status === 'online').length;
  console.log(`[Super AI] Super context: ${onlineCount}/${Object.keys(companies).length} companies online`);

  return { companies };
}

// ============================================================
// HELPER: getLocalContext — central hub's own data
// ============================================================
function getLocalContext(db) {
  db = getRawDb(db);
  const today = getLocalDate();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const users = safeQuery(db, 'SELECT id, name, role, department, username, created_at FROM users');
  const activeTasks = safeQuery(db, "SELECT id, title, status, urgency, assigned_to_user_id, deadline, description, created_at FROM tasks WHERE status NOT IN ('已完成','已取消') ORDER BY created_at DESC LIMIT 50");
  const completedTasksCount = safeGet(db, "SELECT COUNT(*) as count FROM tasks WHERE status = '已完成'");
  const recentAnnouncements = safeQuery(db, 'SELECT id, title, content, priority, created_at, created_by, read_by FROM announcements ORDER BY created_at DESC LIMIT 15');
  const pendingLeaves = safeQuery(db, "SELECT id, user_id, leave_type, start_date, end_date, reason, status, created_at FROM leave_requests WHERE status = 'PENDING' ORDER BY created_at DESC");
  const attendanceRecords = safeQuery(db, 'SELECT user_id, date, status, clock_in, clock_out FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 200', [sevenDaysAgo]);
  const financeRecords = safeQuery(db, 'SELECT id, type, amount, category, description, created_at FROM finance_records ORDER BY created_at DESC LIMIT 30');
  const financeSummary = safeGet(db, "SELECT COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as totalIncome, COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as totalExpense FROM finance_records");
  const workLogs = safeQuery(db, 'SELECT id, user_id, date, today_tasks, tomorrow_tasks, notes, created_at FROM work_logs WHERE date >= ? ORDER BY date DESC LIMIT 50', [sevenDaysAgo]);
  const forumPosts = safeQuery(db, 'SELECT id, title, content, category, status, author_id, created_at FROM suggestions ORDER BY created_at DESC LIMIT 15');

  return {
    users,
    activeTasks,
    completedTasksCount: completedTasksCount?.count || 0,
    recentAnnouncements,
    pendingLeaves,
    attendanceRecords,
    financeRecords,
    financeSummary: {
      totalIncome: financeSummary?.totalIncome || 0,
      totalExpense: financeSummary?.totalExpense || 0
    },
    workLogs,
    forumPosts
  };
}

// ============================================================
// HELPER: buildSuperSystemPrompt
// ============================================================
function buildSuperSystemPrompt(superContext, localContext) {
  const today = getLocalDate();

  // --- Local (central hub) context section ---
  const localUserList = localContext.users.map(u => {
    const exempt = u.exclude_from_attendance ? ' [🏖️ 免打卡]' : '';
    return `- ${u.name} (ID: ${u.id}, ${u.role}) - 部門: ${u.department || '無'}${exempt}`;
  }).join('\n');

  const localTaskList = localContext.activeTasks.map(t => {
    const assignee = localContext.users.find(u => u.id === t.assigned_to_user_id);
    return `- [ID: ${t.id}] [${t.urgency}] ${t.title} (狀態: ${t.status}, 負責人: ${assignee?.name || '未指派'}, 截止: ${t.deadline || '無'})`;
  }).join('\n');

  const localLeaveList = localContext.pendingLeaves.map(l => {
    const user = localContext.users.find(u => u.id === l.user_id);
    return `- [ID: ${l.id}] ${user?.name || 'Unknown'}: ${l.leave_type} (${l.start_date}~${l.end_date}) 狀態: ${l.status}`;
  }).join('\n');

  // --- Subsidiary context sections ---
  let companyContextSections = '';
  const companyIds = Object.keys(superContext.companies);

  for (const companyId of companyIds) {
    const company = superContext.companies[companyId];
    companyContextSections += `\n\n### 🏢 ${company.name} (ID: ${companyId}) — 狀態: ${company.status === 'online' ? '🟢 在線' : '🔴 離線'}\n`;

    if (company.status !== 'online' || !company.data) {
      companyContextSections += '（無法取得資料，該公司目前離線）\n';
      continue;
    }

    const d = company.data;

    // Users
    if (d.users && d.users.length > 0) {
      const totalCount = d.userCount || d.users.length;
      const eligibleCount = d.attendanceSummary?.eligibleUsers ?? totalCount;
      const exemptCount = d.attendanceSummary?.exemptUsers ?? 0;
      companyContextSections += `員工 (共 ${totalCount} 人，其中 ${eligibleCount} 人需打卡，${exemptCount} 人免打卡):\n`;
      companyContextSections += d.users.slice(0, 20).map(u => {
        const exempt = u.exclude_from_attendance ? ' [🏖️ 免打卡]' : '';
        return `  - ${u.name} (${u.role})${exempt}`;
      }).join('\n') + '\n';
    }

    // Today's attendance
    if (d.attendanceSummary) {
      const a = d.attendanceSummary;
      const rate = a.eligibleUsers > 0 ? Math.round((a.todayPresent / a.eligibleUsers) * 100) : 0;
      companyContextSections += `今日出勤: ${a.todayPresent}/${a.eligibleUsers} (${rate}%) — 計算分母已排除 ${a.exemptUsers} 位免打卡人員\n`;
    }

    // Tasks
    if (d.taskStats) {
      companyContextSections += `任務: `;
      if (d.taskStats.byStatus) {
        companyContextSections += d.taskStats.byStatus.map(s => `${s.status}: ${s.count}`).join(', ');
      }
      companyContextSections += ` | 已完成: ${d.taskStats.completedCount || 0}\n`;
      if (d.taskStats.activeTasks && d.taskStats.activeTasks.length > 0) {
        companyContextSections += '進行中任務:\n';
        companyContextSections += d.taskStats.activeTasks.slice(0, 10).map(t =>
          `  - [ID: ${t.id}] [${t.urgency}] ${t.title} (${t.status}, 截止: ${t.deadline || '無'})`
        ).join('\n') + '\n';
      }
    }

    // Leave requests
    if (d.leaveRequests && d.leaveRequests.pending && d.leaveRequests.pending.length > 0) {
      companyContextSections += `待審請假: ${d.leaveRequests.pending.length} 筆\n`;
      companyContextSections += d.leaveRequests.pending.slice(0, 5).map(l =>
        `  - [ID: ${l.id}] ${l.leave_type} (${l.start_date}~${l.end_date}) ${l.reason || ''}`
      ).join('\n') + '\n';
    }

    // Attendance
    if (d.attendanceSummary) {
      companyContextSections += `出勤: 今日 ${d.attendanceSummary.todayPresent}/${d.attendanceSummary.totalUsers} 人到勤\n`;
    }

    // Finance
    if (d.financeSummary) {
      companyContextSections += `財務: 收入 $${d.financeSummary.totalIncome || 0} / 支出 $${d.financeSummary.totalExpense || 0}\n`;
    }

    // Announcements
    if (d.recentAnnouncements && d.recentAnnouncements.length > 0) {
      companyContextSections += `最近公告: ${d.recentAnnouncements.length} 則\n`;
    }
  }

  // --- Action definitions ---
  const actionList = [
    'CREATE_TASK: 建立任務 (需確認)',
    'UPDATE_TASK_STATUS: 更新任務狀態 (直接執行)',
    'CREATE_ANNOUNCEMENT: 發布公告 (需確認)',
    'CREATE_MEMO: 新增備忘錄 (直接執行)',
    'CREATE_WORK_LOG: 建立工作日誌 (直接執行)',
    'SEND_CHAT_MESSAGE: 發送訊息 (需確認)',
    'CREATE_FORUM_POST: 新增提案 (需確認)',
    'CREATE_FINANCE_RECORD: 新增財務紀錄 (需確認)',
    'CREATE_LEAVE_REQUEST: 申請請假 (需確認)',
    'APPROVE_LEAVE: 批准請假 (需確認)',
    'REJECT_LEAVE: 駁回請假 (需確認)',
    'ASSIGN_TASK: 指派/轉派任務 (需確認)',
    'COMPLETE_TASK: 標記任務完成 (需確認)',
    'DELETE_TASK: 刪除任務 (⚠️ 危險操作需二次確認)',
    'DELETE_ANNOUNCEMENT: 刪除公告 (⚠️ 危險操作需二次確認)',
    'MANUAL_ATTENDANCE: 手動補出勤紀錄 (需確認)',
    'SET_USER_EXCLUSION: 設定使用者免打卡 (需確認)'
  ].map(a => `  - ${a}`).join('\n');

  return `你是 TaskFlow Pro 中央管理系統的 Super AI 智能助理。你是總部 BOSS 的最高級別 AI 顧問，擁有跨公司全域數據存取權限。請用繁體中文回覆。
今天日期：${today}
你可以查看所有子公司的即時數據，並對任何子公司執行操作。

=== 總部（中央 Hub）數據 ===

### 總部員工 (${localContext.users.length} 人)
${localUserList || '無'}

### 總部任務
- 進行中：${localContext.activeTasks.length}
- 已完成：${localContext.completedTasksCount}
${localTaskList || '無進行中任務'}

### 總部待審請假
${localLeaveList || '無待審請假'}

### 總部財務
- 總收入: $${localContext.financeSummary.totalIncome}
- 總支出: $${localContext.financeSummary.totalExpense}

### 總部最近公告
${localContext.recentAnnouncements.map(a => `- [ID: ${a.id}] [${a.created_at?.split('T')[0] || ''}] ${a.title}`).join('\n') || '無'}

=== 子公司數據 (${companyIds.length} 家) ===${companyContextSections}

=== 跨公司操作指令 ===

**【最重要規則】** 當用戶要求執行任何操作時，你 **必須** 在回覆中包含 \`\`\`action 區塊。沒有 action 區塊 = 什麼都不會被執行。

**【極重要：避免重複執行】**
- 對話歷史中你之前回覆的操作**已經全部執行完畢**，絕對**不要**在新回覆中重新包含那些舊的操作。
- 每次只處理用戶「當前這一輪」的新指令。
- 如果用戶本輪只是問問題或閒聊，你的回覆**絕對不能**包含任何 action 區塊。
- 例如：用戶上一輪請你「幫Bravo建立任務A」，你已經建立了。用戶本輪說「幫Charlie發布公告B」，你只需輸出公告B的 action，**絕對不要**再輸出建立任務A的 action。
- 每次回覆中的 action 區塊只應該對應用戶**本輪**的新指令，不能包含任何歷史操作。

**跨公司操作格式（必須嚴格遵守）：**

\`\`\`action
{
  "actions": [
    {
      "action": "ACTION_NAME",
      "company": "companyId 或 local",
      "params": { "key": "value" },
      "description": "操作描述"
    }
  ]
}
\`\`\`

**重要：** 每個操作必須包含 \`"company"\` 欄位：
- \`"company": "local"\` — 在總部（中央 Hub）執行
- \`"company": "${companyIds[0] || 'sub-xxx'}"\` — 在指定子公司執行

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
- APPROVE_LEAVE: { leaveId }
- REJECT_LEAVE: { leaveId }
- MANUAL_ATTENDANCE: { userName, date?(YYYY-MM-DD), clockIn?, clockOut?, notes? }
- SET_USER_EXCLUSION: { userName(人名), exclude(true=設定免打卡 / false=取消免打卡) }
  - 用於將特定使用者排除於出勤統計、AI 出勤異常提醒、未交工作日誌提醒之外
  - 適合管理層、顧問、外包人員等不需要打卡的角色
  - **跨公司操作**：若使用者要求「在 alpha/bravo/charlie 把某人設為免打卡」，
    使用 companyId 指定子公司（companyId 為 subsidiaries 表中的 id）
  - **多公司同步操作**：若使用者要求「把 SSS 在三個子公司都設為免打卡」，
    請對每個子公司分別建立一個 SET_USER_EXCLUSION action（共 3 個 actions）
  - 範例：用戶說「把 SSS 在所有子公司設為免打卡」→ 建立 3 個 actions，
    每個指向一個 subsidiary 的 companyId

=== 安全等級 ===
- **direct（直接執行）**：CREATE_MEMO, CREATE_WORK_LOG, UPDATE_TASK_STATUS — 系統自動執行
- **confirm（需確認）**：CREATE_TASK, CREATE_ANNOUNCEMENT, APPROVE_LEAVE 等 — 系統彈出確認按鈕
- **danger（危險操作）**：DELETE_TASK, DELETE_ANNOUNCEMENT — 系統需二次確認

=== 跨公司分析指令 ===
1. 比較各公司的任務完成率、出勤率、財務狀況
2. 識別跨公司的共同問題（如多家公司都有逾期任務）
3. 提供跨公司的人力資源建議
4. 當子公司離線時，主動提醒 BOSS

=== 重要規則 ===
1. **action 區塊是唯一的執行方式**：系統只通過解析 \`\`\`action 區塊來執行操作。
2. **每個操作必須包含 company 欄位**：指定在哪家公司執行。
3. **確認流程由系統自動處理**：你不需要自己問用戶「是否確認」。
4. **嚴禁重複操作**：每個操作只能在 actions 陣列中出現一次。
5. **純查詢**：如果用戶只是問問題，直接用數據回答，不需要 action 區塊。
6. **真實 ID**：操作中引用的 taskId 等，必須使用系統數據中列出的真實 ID。
7. **跨公司比較分析**：主動提供跨公司的比較觀點和建議。`;
}

// ============================================================
// ACTION DEFINITIONS (same as ai-assistant.js)
// ============================================================
const ACTION_DEFINITIONS = {
  CREATE_TASK: { level: 'confirm', description: '建立任務' },
  UPDATE_TASK_STATUS: { level: 'direct', description: '更新任務狀態' },
  CREATE_ANNOUNCEMENT: { level: 'confirm', description: '發布公告' },
  CREATE_MEMO: { level: 'direct', description: '新增備忘錄' },
  CREATE_WORK_LOG: { level: 'direct', description: '建立工作日誌' },
  SEND_CHAT_MESSAGE: { level: 'confirm', description: '發送訊息' },
  CREATE_FORUM_POST: { level: 'confirm', description: '新增提案' },
  ADD_FORUM_COMMENT: { level: 'direct', description: '提案留言' },
  CREATE_FINANCE_RECORD: { level: 'confirm', description: '新增財務紀錄' },
  CREATE_LEAVE_REQUEST: { level: 'confirm', description: '申請請假' },
  MARK_ANNOUNCEMENT_READ: { level: 'direct', description: '標記公告已讀' },
  APPROVE_LEAVE: { level: 'confirm', description: '批准請假' },
  REJECT_LEAVE: { level: 'confirm', description: '駁回請假' },
  ASSIGN_TASK: { level: 'confirm', description: '指派/轉派任務' },
  COMPLETE_TASK: { level: 'confirm', description: '標記任務完成' },
  UPDATE_ANNOUNCEMENT: { level: 'confirm', description: '修改公告' },
  DELETE_TASK: { level: 'danger', description: '刪除任務' },
  DELETE_ANNOUNCEMENT: { level: 'danger', description: '刪除公告' },
  MANUAL_ATTENDANCE: { level: 'confirm', description: '手動補出勤紀錄' },
  SET_USER_EXCLUSION: { level: 'confirm', description: '設定使用者免打卡（不列入出勤統計）' },
};

// ============================================================
// HELPER: executeLocalAction — execute on central hub's own DB
// ============================================================
function executeLocalAction(db, action, params, currentUser) {
  db = getRawDb(db);
  const now = new Date().toISOString();
  const today = getLocalDate();

  switch (action) {
    case 'CREATE_TASK': {
      const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const assignee = params.assignedTo ? findUserByName(db, params.assignedTo) : null;
      const r = safeRun(db, `INSERT INTO tasks (id, title, description, status, urgency, assigned_to_user_id, deadline, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, params.title, params.description || '', '待接取', params.urgency || 'medium', assignee?.id || currentUser.id, params.deadline || null, currentUser.id, now]);
      if (r?.error) return { success: false, message: `建立任務失敗: ${r.error}` };
      return { success: true, message: `任務「${params.title}」已建立${assignee ? `，指派給 ${assignee.name}` : ''}`, data: { id } };
    }

    case 'UPDATE_TASK_STATUS': {
      const task = safeGet(db, 'SELECT * FROM tasks WHERE id = ?', [params.taskId]);
      if (!task) return { success: false, message: '找不到該任務' };
      const statusMap = { 'pending': '待接取', 'assigned': '已指派', 'in_progress': '進行中', 'in progress': '進行中', 'completed': '已完成', 'cancelled': '已取消' };
      const mappedStatus = statusMap[params.status?.toLowerCase()] || params.status;
      const r = safeRun(db, 'UPDATE tasks SET status = ? WHERE id = ?', [mappedStatus, params.taskId]);
      if (r?.error) return { success: false, message: `更新狀態失敗: ${r.error}` };
      return { success: true, message: `任務「${task.title}」狀態已更新為「${mappedStatus}」` };
    }

    case 'CREATE_ANNOUNCEMENT': {
      const id = `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const r = safeRun(db, `INSERT INTO announcements (id, title, content, priority, created_by, created_at, read_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, params.title, params.content, params.priority || 'NORMAL', currentUser.id, now, '[]']);
      if (r?.error) return { success: false, message: `發布公告失敗: ${r.error}` };
      return { success: true, message: `公告「${params.title}」已發布`, data: { id } };
    }

    case 'CREATE_MEMO': {
      const id = uuidv4();
      const r = safeRun(db, `INSERT INTO memos (id, user_id, type, content, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, currentUser.id, 'TEXT', params.content, params.color || 'yellow', now, now]);
      if (r?.error) return { success: false, message: `建立備忘錄失敗: ${r.error}` };
      return { success: true, message: '備忘錄已建立', data: { id } };
    }

    case 'CREATE_WORK_LOG': {
      const logDate = params.date || today;
      const existing = safeGet(db, 'SELECT id FROM work_logs WHERE user_id = ? AND date = ?', [currentUser.id, logDate]);
      if (existing) {
        const rUpd = safeRun(db, `UPDATE work_logs SET today_tasks = ?, tomorrow_tasks = ?, notes = ?, updated_at = ? WHERE id = ?`,
          [params.todayTasks, params.tomorrowTasks || '', params.notes || '', now, existing.id]);
        if (rUpd?.error) return { success: false, message: `更新工作日誌失敗: ${rUpd.error}` };
        return { success: true, message: '工作日誌已更新' };
      }
      const id = uuidv4();
      const r = safeRun(db, `INSERT INTO work_logs (id, user_id, department_id, date, today_tasks, tomorrow_tasks, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, currentUser.id, 'default', logDate, params.todayTasks, params.tomorrowTasks || '', params.notes || '', now, now]);
      if (r?.error) return { success: false, message: `建立工作日誌失敗: ${r.error}` };
      return { success: true, message: '工作日誌已建立', data: { id } };
    }

    case 'SEND_CHAT_MESSAGE': {
      const targetUser = findUserByName(db, params.targetUser);
      if (!targetUser) return { success: false, message: `找不到用戶「${params.targetUser}」` };
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
      let cat = params.category || '其他';
      if (!validCategories.includes(cat)) cat = '其他';
      const r = safeRun(db, `INSERT INTO suggestions (id, title, content, category, status, author_id, created_at, updated_at, upvotes, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, params.title, params.content, cat, 'OPEN', currentUser.id, now, now, '[]', '[]']);
      if (r?.error) return { success: false, message: `建立提案失敗: ${r.error}` };
      return { success: true, message: `提案「${params.title}」已建立`, data: { id } };
    }

    case 'CREATE_FINANCE_RECORD': {
      const id = uuidv4();
      const finType = (params.type || 'EXPENSE').toUpperCase();
      const r = safeRun(db, `INSERT INTO finance_records (id, date, type, amount, category, description, recorded_by, owner_id, user_id, department_id, scope, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, today, finType, params.amount, params.category || '其他', params.description || '', currentUser.id, currentUser.id, currentUser.id, 'default', 'DEPARTMENT', now]);
      if (r?.error) return { success: false, message: `建立財務紀錄失敗: ${r.error}` };
      return { success: true, message: `財務紀錄已建立：${finType === 'INCOME' ? '收入' : '支出'} $${params.amount}`, data: { id } };
    }

    case 'CREATE_LEAVE_REQUEST': {
      const id = uuidv4();
      const startD = params.startDate || today;
      const endD = params.endDate || startD;
      const dStart = new Date(startD); const dEnd = new Date(endD);
      const diffDays = Math.max(1, Math.ceil((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1);
      const r = safeRun(db, `INSERT INTO leave_requests (id, user_id, department_id, leave_type, start_date, end_date, days, reason, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, currentUser.id, '', params.type || '事假', startD, endD, diffDays, params.reason || '', 'PENDING', now, now]);
      if (r?.error) return { success: false, message: `請假申請失敗: ${r.error}` };
      return { success: true, message: `請假申請已送出（${startD}${endD !== startD ? ' ~ ' + endD : ''}）`, data: { id } };
    }

    case 'APPROVE_LEAVE': {
      const leave = safeGet(db, 'SELECT * FROM leave_requests WHERE id = ?', [params.leaveId]);
      if (!leave) return { success: false, message: '找不到該請假申請' };
      const r = safeRun(db, "UPDATE leave_requests SET status = 'APPROVED', approver_id = ?, approved_at = ? WHERE id = ?", [currentUser.id, now, params.leaveId]);
      if (r?.error) return { success: false, message: `批准失敗: ${r.error}` };
      const leaveUser = safeGet(db, 'SELECT name FROM users WHERE id = ?', [leave.user_id]);
      return { success: true, message: `已批准 ${leaveUser?.name || '員工'} 的請假申請` };
    }

    case 'REJECT_LEAVE': {
      const leave = safeGet(db, 'SELECT * FROM leave_requests WHERE id = ?', [params.leaveId]);
      if (!leave) return { success: false, message: '找不到該請假申請' };
      const r = safeRun(db, "UPDATE leave_requests SET status = 'REJECTED', approver_id = ?, approved_at = ? WHERE id = ?", [currentUser.id, now, params.leaveId]);
      if (r?.error) return { success: false, message: `駁回失敗: ${r.error}` };
      const leaveUser = safeGet(db, 'SELECT name FROM users WHERE id = ?', [leave.user_id]);
      return { success: true, message: `已駁回 ${leaveUser?.name || '員工'} 的請假申請` };
    }

    case 'ASSIGN_TASK': {
      const task = safeGet(db, 'SELECT * FROM tasks WHERE id = ?', [params.taskId]);
      if (!task) return { success: false, message: '找不到該任務' };
      const assignee = findUserByName(db, params.assignTo);
      if (!assignee) return { success: false, message: `找不到用戶「${params.assignTo}」` };
      const r = safeRun(db, "UPDATE tasks SET assigned_to_user_id = ?, status = '已指派' WHERE id = ?", [assignee.id, params.taskId]);
      if (r?.error) return { success: false, message: `指派失敗: ${r.error}` };
      return { success: true, message: `任務「${task.title}」已轉派給 ${assignee.name}` };
    }

    case 'COMPLETE_TASK': {
      const task = safeGet(db, 'SELECT * FROM tasks WHERE id = ?', [params.taskId]);
      if (!task) return { success: false, message: '找不到該任務' };
      const r = safeRun(db, "UPDATE tasks SET status = '已完成', progress = 100 WHERE id = ?", [params.taskId]);
      if (r?.error) return { success: false, message: `完成任務失敗: ${r.error}` };
      return { success: true, message: `任務「${task.title}」已標記為完成` };
    }

    case 'DELETE_TASK': {
      const task = safeGet(db, 'SELECT * FROM tasks WHERE id = ?', [params.taskId]);
      if (!task) return { success: false, message: '找不到該任務' };
      safeRun(db, 'DELETE FROM tasks WHERE id = ?', [params.taskId]);
      return { success: true, message: `任務「${task.title}」已刪除` };
    }

    case 'DELETE_ANNOUNCEMENT': {
      const ann = safeGet(db, 'SELECT * FROM announcements WHERE id = ?', [params.announcementId]);
      if (!ann) return { success: false, message: '找不到該公告' };
      safeRun(db, 'DELETE FROM announcements WHERE id = ?', [params.announcementId]);
      return { success: true, message: `公告「${ann.title}」已刪除` };
    }

    case 'MANUAL_ATTENDANCE': {
      const targetUser = findUserByName(db, params.userName);
      if (!targetUser) return { success: false, message: `找不到用戶「${params.userName}」` };
      const attId = uuidv4();
      safeRun(db, `INSERT INTO attendance_records (id, user_id, date, status, clock_in, clock_out, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [attId, targetUser.id, params.date || today, 'ONLINE', params.clockIn || '09:00', params.clockOut || '18:00', params.notes || 'Super AI 手動補登', now]);
      return { success: true, message: `已為 ${targetUser.name} 補登 ${params.date || today} 的出勤紀錄` };
    }

    default:
      return { success: false, message: `Unknown action: ${action}` };
  }
}

// ============================================================
// HELPER: executeSuperAction — route to local or subsidiary
// ============================================================
async function executeSuperAction(db, companyId, action, params, currentUser) {
  // Local execution
  if (!companyId || companyId === 'local') {
    console.log(`[Super AI] Executing local action: ${action}`);
    return executeLocalAction(db, action, params, currentUser);
  }

  // Remote execution — POST to subsidiary's /api/service/execute
  const rawDb = getRawDb(db);
  const subsidiary = safeGet(rawDb, 'SELECT * FROM subsidiaries WHERE id = ? AND is_active = 1', [companyId]);

  if (!subsidiary) {
    return { success: false, message: `找不到子公司 ${companyId} 或該公司已停用` };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const baseUrl = subsidiary.base_url.replace(/\/+$/, '');

    const response = await fetch(`${baseUrl}/api/service/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `ServiceToken ${subsidiary.service_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action, params }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Super AI] Remote execute failed for ${subsidiary.name}: HTTP ${response.status}`, errText.substring(0, 200));
      return { success: false, message: `子公司 ${subsidiary.name} 執行失敗 (HTTP ${response.status})` };
    }

    const result = await response.json();
    console.log(`[Super AI] Remote action ${action} on ${subsidiary.name}:`, result.success ? 'SUCCESS' : 'FAILED');
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, message: `子公司 ${subsidiary.name} 回應逾時` };
    }
    console.error(`[Super AI] Remote execute error for ${subsidiary.name}:`, error.message);
    return { success: false, message: `子公司 ${subsidiary.name} 離線，無法執行操作` };
  }
}

// ============================================================
// GEMINI API CALL (same pattern as ai-assistant.js)
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
            { role: 'model', parts: [{ text: '我已了解所有跨公司系統數據和操作能力，作為 Super AI 隨時為您服務。請用戶要求操作時我一定會包含 ```action 區塊，並且每個操作都會包含 company 欄位。' }] },
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
        console.error(`[Super AI] Gemini API error (attempt ${attempt}/${maxRetries}):`, response.status, errorText.substring(0, 200));
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
      console.error(`[Super AI] Gemini API network error (attempt ${attempt}/${maxRetries}):`, apiError.message);
      if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 1000 * attempt)); continue; }
      return '⚠️ 無法連接 AI 服務，請檢查網路連線。';
    }
  }
  return '⚠️ AI 服務暫時無法使用，請稍後再試。';
}

// ============================================================
// PARSE AI RESPONSE (same pattern as ai-assistant.js)
// ============================================================
function parseAIResponse(responseText) {
  let cleanText = responseText;
  let actions = null;

  console.log('[Super AI Parse] Raw response length:', responseText.length);
  console.log('[Super AI Parse] Raw response preview:', responseText.substring(0, 300));

  // Extract action block
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
          console.log('[Super AI Parse] Actions found:', JSON.stringify(actions.actions.map(a => `${a.action}@${a.company || 'local'}`)));
          break;
        }
      } catch (e) {
        console.error('[Super AI Parse] Failed to parse action JSON:', e.message, '| Raw:', actionMatch[1].substring(0, 100));
      }
    }
  }

  if (!actions) {
    // Last resort: try to find raw JSON with "actions" array
    const rawJsonMatch = responseText.match(/\{[\s\S]*?"actions"\s*:\s*\[[\s\S]*?\]\s*\}/);
    if (rawJsonMatch) {
      try {
        const parsed = JSON.parse(rawJsonMatch[0]);
        if (parsed && parsed.actions && Array.isArray(parsed.actions) && parsed.actions.length > 0) {
          actions = parsed;
          cleanText = cleanText.replace(rawJsonMatch[0], '').trim();
          console.log('[Super AI Parse] Actions found (raw JSON fallback):', JSON.stringify(actions.actions.map(a => `${a.action}@${a.company || 'local'}`)));
        }
      } catch (e) { /* ignore */ }
    }
  }

  if (!actions) {
    console.log('[Super AI Parse] No action block found in response');
  }

  // Deduplicate actions
  if (actions && actions.actions && actions.actions.length > 1) {
    const seen = new Map();
    const deduped = [];
    for (const act of actions.actions) {
      const normParams = {};
      if (act.params) {
        Object.keys(act.params).sort().forEach(k => {
          const v = act.params[k];
          normParams[k] = typeof v === 'string' ? v.trim().substring(0, 50) : v;
        });
      }
      const key = `${act.action}|${act.company || 'local'}|${JSON.stringify(normParams)}`;
      if (!seen.has(key)) {
        seen.set(key, true);
        deduped.push(act);
      } else {
        console.log('[Super AI Parse] Removed duplicate action:', act.action, '@', act.company || 'local');
      }
    }
    if (deduped.length < actions.actions.length) {
      console.log(`[Super AI Parse] Deduped: ${actions.actions.length} -> ${deduped.length} actions`);
      actions.actions = deduped;
    }
  }

  // Clean up any remaining code block artifacts
  cleanText = cleanText.replace(/```[\s\S]*?```/g, '').trim();

  return { cleanText, actions };
}

// ============================================================
// ENDPOINT 1: POST /query — Super AI query
// ============================================================
router.post('/query', async (req, res) => {
  try {
    const db = getRawDb(req.db);
    ensureTables(req.db);
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`[Super AI] Query from ${req.user.name}: ${message.substring(0, 100)}`);

    const now = new Date().toISOString();
    const userMsgId = uuidv4();
    safeRun(db, 'INSERT INTO ai_conversations (id, user_id, role, message, created_at) VALUES (?, ?, ?, ?, ?)',
      [userMsgId, userId, 'user', message, now]);

    // Only last 4 messages, filter out assistant messages with actions (they cause re-emission bugs)
    const recentConversationsRaw = safeQuery(db, "SELECT role, message, action_taken FROM ai_conversations WHERE user_id = ? AND id != ? ORDER BY created_at DESC LIMIT 4", [userId, userMsgId]);
    const recentConversations = recentConversationsRaw.filter(c => {
      if (c.role === 'assistant' && c.action_taken) return false;
      return true;
    }).slice(0, 2).reverse();
    const conversationHistory = recentConversations.map(conv => ({
      role: conv.role === 'user' ? 'user' : 'model',
      parts: [{ text: conv.message }]
    }));

    // Get super context (all subsidiaries) and local context in parallel
    const [superContext, localContext] = await Promise.all([
      getSuperContext(req.db),
      Promise.resolve(getLocalContext(req.db))
    ]);

    // Build system prompt
    const systemPrompt = buildSuperSystemPrompt(superContext, localContext);

    // Call Gemini
    const aiResponseRaw = await callGemini(systemPrompt, conversationHistory, message);

    // Parse response for actions
    const { cleanText, actions } = parseAIResponse(aiResponseRaw);

    // Process actions
    let actionResults = null;
    let pendingActionId = null;

    console.log('[Super AI] Actions parsed:', actions ? JSON.stringify(actions.actions?.map(a => `${a.action}@${a.company || 'local'}`)) : 'NONE');

    if (actions && actions.actions && actions.actions.length > 0) {
      // Check if any actions need confirmation
      const needsConfirm = actions.actions.some(a => {
        const def = ACTION_DEFINITIONS[a.action];
        return def && (def.level === 'confirm' || def.level === 'danger');
      });

      if (needsConfirm) {
        // Store pending actions for confirmation
        console.log('[Super AI] Actions need confirmation, storing as pending');
        pendingActionId = uuidv4();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        safeRun(db, 'INSERT INTO ai_pending_actions (id, user_id, actions, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
          [pendingActionId, userId, JSON.stringify(actions.actions), 'pending', now, expiresAt]);
      } else {
        // Direct execution for 'direct' level actions
        console.log('[Super AI] Direct execution for:', actions.actions.map(a => `${a.action}@${a.company || 'local'}`));
        actionResults = [];
        for (const a of actions.actions) {
          const result = await executeSuperAction(req.db, a.company || 'local', a.action, a.params, req.user);
          console.log('[Super AI] Action result:', a.action, '@', a.company || 'local', JSON.stringify(result));
          actionResults.push({ action: a.action, company: a.company || 'local', description: a.description, ...result });
        }
      }
    }

    // Save AI response
    const aiMsgId = uuidv4();
    safeRun(db, 'INSERT INTO ai_conversations (id, user_id, role, message, intent, action_taken, action_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [aiMsgId, userId, 'assistant', cleanText,
       actions ? 'action' : 'query',
       actions ? JSON.stringify(actions.actions.map(a => `${a.action}@${a.company || 'local'}`)) : null,
       actionResults ? JSON.stringify(actionResults) : null,
       new Date().toISOString()]);

    res.json({
      response: cleanText,
      actions: actions?.actions || null,
      actionResults,
      pendingActionId
    });
  } catch (error) {
    console.error('[Super AI] Query error:', error);
    res.status(500).json({ error: 'Failed to process super AI query' });
  }
});

// ============================================================
// ENDPOINT 2: POST /confirm — Confirm pending actions
// ============================================================
router.post('/confirm', async (req, res) => {
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
    console.log('[Super AI] Confirming', actions.length, 'pending actions:', actions.map(a => `${a.action}@${a.company || 'local'}`));

    for (const a of actions) {
      console.log('[Super AI] Executing:', a.action, '@', a.company || 'local', 'params:', JSON.stringify(a.params));
      const result = await executeSuperAction(req.db, a.company || 'local', a.action, a.params, req.user);
      console.log('[Super AI] Result:', a.action, JSON.stringify(result));
      results.push({ action: a.action, company: a.company || 'local', description: a.description, ...result });
    }

    safeRun(db, "UPDATE ai_pending_actions SET status = 'confirmed' WHERE id = ?", [pendingActionId]);

    // Save result as AI message
    const resultMsg = results.map(r => `${r.success ? '✅' : '❌'} [${r.company}] ${r.description || r.action}: ${r.message}`).join('\n');
    safeRun(db, 'INSERT INTO ai_conversations (id, user_id, role, message, action_taken, action_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, 'assistant', `跨公司操作執行結果：\n${resultMsg}`, JSON.stringify(results.map(r => `${r.action}@${r.company}`)), JSON.stringify(results), new Date().toISOString()]);

    res.json({ results });
  } catch (error) {
    console.error('[Super AI] Confirm error:', error);
    res.status(500).json({ error: 'Failed to confirm actions' });
  }
});

// ============================================================
// ENDPOINT 3: POST /cancel — Cancel pending actions
// ============================================================
router.post('/cancel', (req, res) => {
  try {
    const db = getRawDb(req.db);
    ensureTables(req.db);
    const { pendingActionId } = req.body;
    safeRun(db, "UPDATE ai_pending_actions SET status = 'cancelled' WHERE id = ? AND user_id = ?", [pendingActionId, req.user.id]);
    console.log('[Super AI] Cancelled pending action:', pendingActionId);
    res.json({ success: true });
  } catch (error) {
    console.error('[Super AI] Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel actions' });
  }
});

// ============================================================
// ENDPOINT 4: GET /alerts — Aggregated alerts from all subsidiaries
// ============================================================
router.get('/alerts', async (req, res) => {
  try {
    const db = getRawDb(req.db);
    const subsidiaries = safeQuery(db, 'SELECT * FROM subsidiaries WHERE is_active = 1');

    console.log(`[Super AI] Fetching alerts from ${subsidiaries.length} subsidiaries`);

    // Fetch alerts from all subsidiaries in parallel
    const alertResults = await Promise.allSettled(
      subsidiaries.map(async (sub) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
          const baseUrl = sub.base_url.replace(/\/+$/, '');
          const response = await fetch(`${baseUrl}/api/service/alerts`, {
            method: 'GET',
            headers: {
              'Authorization': `ServiceToken ${sub.service_token}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (!response.ok) {
            return { companyId: sub.id, companyName: sub.name, status: 'error', alerts: null };
          }

          const data = await response.json();
          return { companyId: sub.id, companyName: sub.name, status: 'online', alerts: data };
        } catch (error) {
          clearTimeout(timeout);
          return { companyId: sub.id, companyName: sub.name, status: 'offline', alerts: null };
        }
      })
    );

    // Also get local alerts
    const today = getLocalDate();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const localPendingLeaves = safeQuery(db,
      "SELECT lr.id, lr.user_id, lr.leave_type, lr.start_date, lr.end_date, lr.reason, lr.created_at, u.name as user_name FROM leave_requests lr LEFT JOIN users u ON lr.user_id = u.id WHERE lr.status = 'PENDING' AND lr.created_at <= ? ORDER BY lr.created_at ASC",
      [threeDaysAgo]);

    const localOverdueTasks = safeQuery(db,
      "SELECT t.id, t.title, t.status, t.urgency, t.deadline, t.assigned_to_user_id, u.name as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to_user_id = u.id WHERE t.status NOT IN ('已完成','已取消') AND t.deadline IS NOT NULL AND t.deadline < ? ORDER BY t.deadline ASC",
      [sevenDaysAgo]);

    // Build aggregated response
    const companyAlerts = [];
    const immediateAlerts = [];

    // Local alerts
    if (localPendingLeaves.length > 0) {
      immediateAlerts.push({
        type: 'pending_leaves',
        company: 'local',
        companyName: '總部',
        severity: 'warning',
        message: `總部有 ${localPendingLeaves.length} 筆請假申請超過3天未處理`,
        data: localPendingLeaves
      });
    }

    if (localOverdueTasks.length > 0) {
      immediateAlerts.push({
        type: 'overdue_tasks',
        company: 'local',
        companyName: '總部',
        severity: 'warning',
        message: `總部有 ${localOverdueTasks.length} 個任務逾期超過7天`,
        data: localOverdueTasks
      });
    }

    // Subsidiary alerts
    for (const result of alertResults) {
      const value = result.status === 'fulfilled' ? result.value : { companyId: 'unknown', companyName: 'unknown', status: 'offline', alerts: null };

      if (value.status === 'offline') {
        immediateAlerts.push({
          type: 'company_offline',
          company: value.companyId,
          companyName: value.companyName,
          severity: 'critical',
          message: `子公司「${value.companyName}」目前離線，請聯繫技術人員`
        });
        continue;
      }

      if (value.alerts) {
        const alerts = value.alerts;

        // Pending leaves older than 3 days
        if (alerts.pendingLeaves && alerts.pendingLeaves.length > 0) {
          immediateAlerts.push({
            type: 'pending_leaves',
            company: value.companyId,
            companyName: value.companyName,
            severity: 'warning',
            message: `${value.companyName} 有 ${alerts.pendingLeaves.length} 筆請假申請超過3天未處理`,
            data: alerts.pendingLeaves
          });
        }

        // Overdue tasks older than 7 days
        if (alerts.overdueTasks && alerts.overdueTasks.length > 0) {
          immediateAlerts.push({
            type: 'overdue_tasks',
            company: value.companyId,
            companyName: value.companyName,
            severity: 'warning',
            message: `${value.companyName} 有 ${alerts.overdueTasks.length} 個任務逾期超過7天`,
            data: alerts.overdueTasks
          });
        }

        companyAlerts.push({
          companyId: value.companyId,
          companyName: value.companyName,
          status: 'online',
          alerts
        });
      }
    }

    // Daily summary
    const onlineCount = alertResults.filter(r => r.status === 'fulfilled' && r.value.status === 'online').length;
    const offlineCount = subsidiaries.length - onlineCount;

    const dailySummary = {
      totalCompanies: subsidiaries.length,
      online: onlineCount,
      offline: offlineCount,
      totalImmediateAlerts: immediateAlerts.length,
      criticalAlerts: immediateAlerts.filter(a => a.severity === 'critical').length,
      warningAlerts: immediateAlerts.filter(a => a.severity === 'warning').length
    };

    console.log(`[Super AI] Alerts aggregated: ${immediateAlerts.length} immediate alerts, ${onlineCount}/${subsidiaries.length} online`);

    res.json({
      immediateAlerts,
      companyAlerts,
      dailySummary
    });
  } catch (error) {
    console.error('[Super AI] Alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch aggregated alerts' });
  }
});

module.exports = router;
