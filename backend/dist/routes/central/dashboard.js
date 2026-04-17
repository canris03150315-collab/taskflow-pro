const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');

// ============================================================
// HELPERS (same pattern as subsidiaries.js)
// ============================================================
function getRawDb(db) {
  return db.db || db;
}

function safeQuery(db, sql, params) {
  try { return params ? db.prepare(sql).all(...(Array.isArray(params) ? params : [params])) : db.prepare(sql).all(); }
  catch (e) { console.error('[Central - Dashboard] DB query error:', e.message); return []; }
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
// HELPER: Fetch from a subsidiary with timeout
// ============================================================
async function fetchSubsidiary(subsidiary, path, timeoutMs = 10000) {
  try {
    const url = `${subsidiary.base_url.replace(/\/+$/, '')}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `ServiceToken ${subsidiary.service_token}`
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { success: false, status: response.status };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, status: 'timeout' };
    }
    return { success: false, status: 'offline', error: error.message };
  }
}

// ============================================================
// HELPER: Get all active subsidiaries from DB
// ============================================================
function getActiveSubsidiaries(db) {
  return safeQuery(db, 'SELECT * FROM subsidiaries WHERE is_active = 1');
}

// ============================================================
// ENDPOINT 1: GET /overview — Cross-company KPI overview
// ============================================================
router.get('/overview', async (req, res) => {
  try {
    const db = getRawDb(req.db);
    const subsidiaries = getActiveSubsidiaries(db);

    if (subsidiaries.length === 0) {
      return res.json({
        companies: [],
        totals: {
          totalUsers: 0,
          totalTasks: 0,
          completedTasks: 0,
          taskCompletionRate: 0,
          pendingLeaves: 0,
          todayAttendance: { total: 0, present: 0, rate: 0 },
          monthlyRevenue: 0,
          monthlyExpense: 0
        },
        timestamp: new Date().toISOString()
      });
    }

    // Call GET /api/service/context on all active subsidiaries in parallel (10s timeout)
    const results = await Promise.all(
      subsidiaries.map(async (sub) => {
        const result = await fetchSubsidiary(sub, '/api/service/context', 10000);

        if (!result.success) {
          return {
            id: sub.id,
            name: sub.name,
            status: result.status === 'timeout' ? 'timeout' : 'offline',
            kpis: null
          };
        }

        const ctx = result.data;

        // Extract KPIs from service context response
        const kpis = {
          totalUsers: ctx.userCount || (Array.isArray(ctx.users) ? ctx.users.length : ctx.users) || 0,
          totalTasks: ctx.taskStats?.activeTasks?.length || 0,
          completedTasks: ctx.taskStats?.completedCount || 0,
          taskCompletionRate: 0,
          pendingLeaves: ctx.leaveRequests?.pending?.length || 0,
          todayAttendance: ctx.attendanceSummary?.today || ctx.todayAttendance || { total: 0, present: 0, rate: 0 },
          monthlyRevenue: ctx.financeSummary?.totalIncome || ctx.monthlyRevenue || 0,
          monthlyExpense: ctx.financeSummary?.totalExpense || ctx.monthlyExpense || 0
        };

        // Compute completion rate if not provided but data available
        if (!kpis.taskCompletionRate && kpis.totalTasks > 0) {
          kpis.taskCompletionRate = parseFloat(((kpis.completedTasks / kpis.totalTasks) * 100).toFixed(1));
        }

        return {
          id: sub.id,
          name: sub.name,
          status: 'online',
          kpis
        };
      })
    );

    // Aggregate totals across all companies that are online
    const onlineCompanies = results.filter(r => r.status === 'online' && r.kpis);
    const totals = {
      totalUsers: 0,
      totalTasks: 0,
      completedTasks: 0,
      taskCompletionRate: 0,
      pendingLeaves: 0,
      todayAttendance: { total: 0, present: 0, rate: 0 },
      monthlyRevenue: 0,
      monthlyExpense: 0
    };

    for (const company of onlineCompanies) {
      const k = company.kpis;
      totals.totalUsers += k.totalUsers;
      totals.totalTasks += k.totalTasks;
      totals.completedTasks += k.completedTasks;
      totals.pendingLeaves += k.pendingLeaves;
      totals.todayAttendance.total += k.todayAttendance.total;
      totals.todayAttendance.present += k.todayAttendance.present;
      totals.monthlyRevenue += k.monthlyRevenue;
      totals.monthlyExpense += k.monthlyExpense;
    }

    // Compute aggregated rates
    if (totals.totalTasks > 0) {
      totals.taskCompletionRate = parseFloat(((totals.completedTasks / totals.totalTasks) * 100).toFixed(1));
    }
    if (totals.todayAttendance.total > 0) {
      totals.todayAttendance.rate = parseFloat(((totals.todayAttendance.present / totals.todayAttendance.total) * 100).toFixed(1));
    }

    console.log(`[Central - Dashboard] Overview: ${onlineCompanies.length}/${results.length} companies online`);

    res.json({
      companies: results,
      totals,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Central - Dashboard] Overview error:', error);
    res.status(500).json({ error: '取得儀表板資料失敗', message: error.message });
  }
});

// ============================================================
// ENDPOINT 2: GET /notifications — Two-tier notification system
// ============================================================
router.get('/notifications', async (req, res) => {
  try {
    const db = getRawDb(req.db);
    const subsidiaries = getActiveSubsidiaries(db);

    const immediate = [];
    const daily_summary = [];

    if (subsidiaries.length === 0) {
      return res.json({ immediate, daily_summary });
    }

    // Call GET /api/service/alerts on all active subsidiaries in parallel
    const results = await Promise.all(
      subsidiaries.map(async (sub) => {
        const result = await fetchSubsidiary(sub, '/api/service/alerts', 10000);
        return { subsidiary: sub, result };
      })
    );

    for (const { subsidiary, result } of results) {
      // If subsidiary is offline, add critical notification
      if (!result.success) {
        immediate.push({
          type: 'company_offline',
          company: subsidiary.name,
          companyId: subsidiary.id,
          message: '子公司離線，請聯繫技術人員',
          severity: 'critical'
        });

        daily_summary.push({
          company: subsidiary.name,
          companyId: subsidiary.id,
          attendance_rate: 0,
          new_leaves: 0,
          new_overdue: 0,
          platform_profit: 0,
          status: 'offline'
        });
        continue;
      }

      const alerts = result.data;

      // Process immediate alerts from subsidiary
      // Pending leaves exceeding 3 days
      if (alerts.pendingLeaves && alerts.pendingLeaves > 0) {
        immediate.push({
          type: 'pending_leave',
          company: subsidiary.name,
          companyId: subsidiary.id,
          count: alerts.pendingLeaves,
          message: `${alerts.pendingLeaves}筆請假申請超過3天未處理`,
          severity: 'warning'
        });
      }

      // Overdue tasks exceeding 7 days
      if (alerts.overdueTasks && alerts.overdueTasks > 0) {
        immediate.push({
          type: 'overdue_task',
          company: subsidiary.name,
          companyId: subsidiary.id,
          count: alerts.overdueTasks,
          message: `${alerts.overdueTasks}個任務逾期超過7天`,
          severity: 'warning'
        });
      }

      // Any other critical alerts from the subsidiary
      if (alerts.criticalAlerts && Array.isArray(alerts.criticalAlerts)) {
        for (const alert of alerts.criticalAlerts) {
          immediate.push({
            type: alert.type || 'custom_alert',
            company: subsidiary.name,
            companyId: subsidiary.id,
            message: alert.message,
            severity: alert.severity || 'warning'
          });
        }
      }

      // Daily summary entry
      daily_summary.push({
        company: subsidiary.name,
        companyId: subsidiary.id,
        attendance_rate: alerts.attendanceRate || 0,
        new_leaves: alerts.newLeaves || 0,
        new_overdue: alerts.newOverdue || 0,
        platform_profit: alerts.platformProfit || 0
      });
    }

    // Sort immediate: critical first, then warning
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    immediate.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));

    console.log(`[Central - Dashboard] Notifications: ${immediate.length} immediate, ${daily_summary.length} daily summaries`);

    res.json({ immediate, daily_summary });
  } catch (error) {
    console.error('[Central - Dashboard] Notifications error:', error);
    res.status(500).json({ error: '取得通知失敗', message: error.message });
  }
});

module.exports = router;
