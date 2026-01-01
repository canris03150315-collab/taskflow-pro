import express from 'express';
import { SecureDatabase } from '../database-v2';
import { logSystemAction } from '../utils/logger';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// GET /api/attendance - 獲取出勤記錄
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    
    const { 
      user_id, 
      date_from, 
      date_to, 
      status,
      page = '1',
      limit = '50'
    } = req.query;

    let query = `
      SELECT a.*, 
             u.name as user_name,
             u.department as user_department
      FROM attendance_records a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    // 權限過濾
    if (currentUser.role === 'EMPLOYEE') {
      // 員工只能看到自己的記錄
      query += ' AND a.user_id = ?';
      params.push(currentUser.id);
    } else if (currentUser.role === 'SUPERVISOR') {
      // 主管可以看到自己部門的記錄
      if (user_id) {
        // 如果指定了用戶，檢查是否為同部門
        const targetUser = await db.get('SELECT department FROM users WHERE id = ?', [user_id]);
        if (!targetUser || targetUser.department !== currentUser.department) {
          return res.status(403).json({ error: '無權查看其他部門的出勤記錄' });
        }
      }
      query += ' AND u.department = ?';
      params.push(currentUser.department);
    }
    // BOSS 和 MANAGER 可以看到所有記錄

    // 用戶過濾
    if (user_id && (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER')) {
      query += ' AND a.user_id = ?';
      params.push(user_id);
    }

    // 日期範圍過濾
    if (date_from) {
      query += ' AND a.date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND a.date <= ?';
      params.push(date_to);
    }

    // 狀態過濾
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    // 排序和分頁
    query += ' ORDER BY a.date DESC, a.clock_in DESC LIMIT ? OFFSET ?';
    const limitNum = parseInt(limit as string);
    const pageNum = parseInt(page as string);
    params.push(limitNum, (pageNum - 1) * limitNum);

    const records = await db.all(query, params);

    // 獲取總數
    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*$/, '');
    const countResult = await db.get(countQuery, params.slice(0, -2));

    res.json({
      records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limitNum)
      }
    });

  } catch (error) {
    console.error('獲取出勤記錄錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/attendance/clock-in - 上班打卡
router.post('/clock-in', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { 
      location_lat, 
      location_lng, 
      location_address,
      is_offline = false,
      client_timestamp
    } = req.body;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 檢查今天是否已經打卡
    const existingRecord = await db.get(
      'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
      [currentUser.id, today]
    );

    if (existingRecord && existingRecord.clock_in) {
      return res.status(400).json({ error: '今天已經上班打卡' });
    }

    // 生成記錄 ID
    const recordId = `attendance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 創建打卡記錄
    const clockInTime = client_timestamp || new Date().toISOString();
    
    if (existingRecord) {
      // 更新現有記錄
      await db.run(`
        UPDATE attendance_records 
        SET clock_in = ?, status = 'ONLINE', location_lat = ?, location_lng = ?, 
            location_address = ?, is_offline = ?
        WHERE id = ?
      `, [
        clockInTime,
        location_lat || null,
        location_lng || null,
        location_address || '',
        is_offline ? 1 : 0,
        existingRecord.id
      ]);
    } else {
      // 創建新記錄
      await db.run(`
        INSERT INTO attendance_records (
          id, user_id, date, clock_in, status, 
          location_lat, location_lng, location_address, is_offline
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        recordId,
        currentUser.id,
        today,
        clockInTime,
        'ONLINE',
        location_lat || null,
        location_lng || null,
        location_address || '',
        is_offline ? 1 : 0
      ]);
    }

    // 記錄日誌
    const locationInfo = location_address ? ` (地點: ${location_address})` : '';
    await logSystemAction(db, currentUser, 'CLOCK_IN', `上班打卡${locationInfo}`);

    // 離線同步處理
    if (is_offline) {
      await db.addToSyncQueue(
        currentUser.id,
        'create',
        'attendance_records',
        existingRecord?.id || recordId,
        {
          clock_in: clockInTime,
          location_lat,
          location_lng,
          location_address,
          action: 'clock_in'
        }
      );
    }

    res.json({
      message: '上班打卡成功',
      record: {
        id: existingRecord?.id || recordId,
        date: today,
        clock_in: clockInTime,
        status: 'ONLINE',
        location: {
          lat: location_lat,
          lng: location_lng,
          address: location_address
        }
      }
    });

  } catch (error) {
    console.error('上班打卡錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/attendance/clock-out - 下班打卡
router.post('/clock-out', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { 
      location_lat, 
      location_lng, 
      location_address,
      is_offline = false,
      client_timestamp
    } = req.body;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 檢查今天的上班打卡記錄
    const existingRecord = await db.get(
      'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
      [currentUser.id, today]
    );

    if (!existingRecord || !existingRecord.clock_in) {
      return res.status(400).json({ error: '請先上班打卡' });
    }

    if (existingRecord.clock_out) {
      return res.status(400).json({ error: '今天已經下班打卡' });
    }

    // 計算工作時長
    const clockInTime = new Date(existingRecord.clock_in);
    const clockOutTime = client_timestamp ? new Date(client_timestamp) : new Date();
    const durationMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60));

    // 更新下班打卡
    await db.run(`
      UPDATE attendance_records 
      SET clock_out = ?, duration_minutes = ?, status = 'OFFLINE', 
          location_lat = ?, location_lng = ?, location_address = ?, is_offline = ?
      WHERE id = ?
    `, [
      clockOutTime.toISOString(),
      durationMinutes,
      location_lat || existingRecord.location_lat,
      location_lng || existingRecord.location_lng,
      location_address || existingRecord.location_address,
      is_offline ? 1 : 0,
      existingRecord.id
    ]);

    // 記錄日誌
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const locationInfo = location_address ? ` (地點: ${location_address})` : '';
    await logSystemAction(db, currentUser, 'CLOCK_OUT', 
      `下班打卡${locationInfo}，工作時長: ${hours}小時${minutes}分鐘`);

    // 離線同步處理
    if (is_offline) {
      await db.addToSyncQueue(
        currentUser.id,
        'update',
        'attendance_records',
        existingRecord.id,
        {
          clock_out: clockOutTime.toISOString(),
          duration_minutes: durationMinutes,
          location_lat,
          location_lng,
          location_address,
          action: 'clock_out'
        }
      );
    }

    res.json({
      message: '下班打卡成功',
      record: {
        ...existingRecord,
        clock_out: clockOutTime.toISOString(),
        duration_minutes: durationMinutes,
        status: 'OFFLINE',
        location: {
          lat: location_lat || existingRecord.location_lat,
          lng: location_lng || existingRecord.location_lng,
          address: location_address || existingRecord.location_address
        }
      }
    });

  } catch (error) {
    console.error('下班打卡錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/attendance/status - 獲取當前打卡狀態
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const todayRecord = await db.get(
      'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
      [currentUser.id, today]
    );

    let status = 'NOT_CLOCKED_IN';
    let canClockIn = true;
    let canClockOut = false;

    if (todayRecord) {
      if (todayRecord.clock_in && !todayRecord.clock_out) {
        status = 'CLOCKED_IN';
        canClockIn = false;
        canClockOut = true;
      } else if (todayRecord.clock_out) {
        status = 'CLOCKED_OUT';
        canClockIn = false;
        canClockOut = false;
      }
    }

    // 獲取本週統計
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const weekStats = await db.get(`
      SELECT 
        COUNT(*) as total_days,
        SUM(duration_minutes) as total_minutes,
        COUNT(CASE WHEN clock_in IS NOT NULL THEN 1 END) as clocked_in_days
      FROM attendance_records 
      WHERE user_id = ? AND date >= ?
    `, [currentUser.id, weekStartStr]);

    const totalHours = Math.floor((weekStats.total_minutes || 0) / 60);
    const totalMinutes = (weekStats.total_minutes || 0) % 60;

    res.json({
      today: {
        date: today,
        status,
        record: todayRecord,
        canClockIn,
        canClockOut
      },
      week: {
        total_days: weekStats.total_days,
        clocked_in_days: weekStats.clocked_in_days,
        total_hours: totalHours,
        total_minutes: totalMinutes,
        total_work_time: `${totalHours}小時${totalMinutes}分鐘`
      }
    });

  } catch (error) {
    console.error('獲取打卡狀態錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/attendance/summary - 獲取出勤統計
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    
    const { 
      user_id, 
      period = 'month', // week, month, quarter, year
      date 
    } = req.query;

    // 計算日期範圍
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (date) {
      endDate = new Date(date as string);
    }

    switch (period) {
      case 'week':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(endDate.getMonth() / 3);
        startDate = new Date(endDate.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // 權限檢查
    let targetUserId = currentUser.id;
    if (user_id && (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER')) {
      targetUserId = user_id as string;
    } else if (user_id && currentUser.role === 'SUPERVISOR') {
      // 主管查看部門成員統計
      const targetUser = await db.get('SELECT department FROM users WHERE id = ?', [user_id]);
      if (!targetUser || targetUser.department !== currentUser.department) {
        return res.status(403).json({ error: '無權查看其他部門的統計' });
      }
      targetUserId = user_id as string;
    }

    // 獲取統計資料
    const summary = await db.get(`
      SELECT 
        COUNT(*) as total_days,
        COUNT(CASE WHEN clock_in IS NOT NULL THEN 1 END) as work_days,
        COUNT(CASE WHEN clock_out IS NOT NULL THEN 1 END) as completed_days,
        SUM(duration_minutes) as total_minutes,
        AVG(duration_minutes) as avg_minutes,
        MIN(duration_minutes) as min_minutes,
        MAX(duration_minutes) as max_minutes
      FROM attendance_records 
      WHERE user_id = ? AND date >= ? AND date <= ?
    `, [targetUserId, startDateStr, endDateStr]);

    // 計算詳細統計
    const totalHours = Math.floor((summary.total_minutes || 0) / 60);
    const totalMinutes = (summary.total_minutes || 0) % 60;
    const avgHours = Math.floor((summary.avg_minutes || 0) / 60);
    const avgMinutes = Math.round((summary.avg_minutes || 0) % 60);

    // 獲取每日記錄
    const dailyRecords = await db.all(`
      SELECT date, clock_in, clock_out, duration_minutes, status
      FROM attendance_records 
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `, [targetUserId, startDateStr, endDateStr]);

    res.json({
      period: {
        type: period,
        start_date: startDateStr,
        end_date: endDateStr
      },
      summary: {
        total_days: summary.total_days,
        work_days: summary.work_days,
        completed_days: summary.completed_days,
        attendance_rate: summary.total_days > 0 ? 
          Math.round((summary.work_days / summary.total_days) * 100) : 0,
        completion_rate: summary.work_days > 0 ? 
          Math.round((summary.completed_days / summary.work_days) * 100) : 0,
        total_work_time: `${totalHours}小時${totalMinutes}分鐘`,
        avg_work_time: `${avgHours}小時${avgMinutes}分鐘`,
        min_work_time: summary.min_minutes ? `${Math.floor(summary.min_minutes / 60)}小時${summary.min_minutes % 60}分鐘` : '0分鐘',
        max_work_time: summary.max_minutes ? `${Math.floor(summary.max_minutes / 60)}小時${summary.max_minutes % 60}分鐘` : '0分鐘'
      },
      daily_records: dailyRecords
    });

  } catch (error) {
    console.error('獲取出勤統計錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/attendance/sync-offline - 同步離線打卡記錄
router.post('/sync-offline', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { records } = req.body; // 離線記錄陣列

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: '記錄格式錯誤' });
    }

    const results = {
      synced: [],
      conflicts: [],
      errors: []
    };

    // 使用事務處理同步
    db.transaction(() => {
      for (const record of records) {
        try {
          const { 
            id, 
            date, 
            clock_in, 
            clock_out, 
            duration_minutes,
            location_lat,
            location_lng,
            location_address,
            client_timestamp 
          } = record;

          // 檢查記錄是否已存在
          const existingRecord = db.get(
            'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
            [currentUser.id, date]
          );

          if (existingRecord && (existingRecord.clock_in !== clock_in || 
              existingRecord.clock_out !== clock_out)) {
              results.conflicts.push({
                date,
                local: record,
                remote: existingRecord
              });
              continue;
            } else if (existingRecord) {
              // No conflicts, do nothing
              continue;
            } else {
              // 創建新記錄
              db.run(`
                INSERT INTO attendance_records (
                  id, user_id, date, clock_in, clock_out, duration_minutes,
                  status, location_lat, location_lng, location_address, is_offline
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                id || `attendance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                currentUser.id,
                date,
                clock_in,
                clock_out || null,
                duration_minutes || null,
                clock_out ? 'OFFLINE' : 'ONLINE',
                location_lat || null,
                location_lng || null,
                location_address || '',
                0 // 同步完成，標記為非離線
              ]);
            }

          results.synced.push({ date });

        } catch (error) {
          results.errors.push({ 
            date: record.date, 
            error: error.message 
          });
        }
      }
    })();

    // 記錄同步日誌
    await logSystemAction(db, currentUser, 'SYNC_ATTENDANCE', 
      `同步 ${results.synced.length} 筆離線打卡記錄，${results.conflicts.length} 筆衝突`);

    res.json({
      results,
      summary: {
        total: records.length,
        synced: results.synced.length,
        conflicts: results.conflicts.length,
        errors: results.errors.length
      }
    });

  } catch (error) {
    console.error('同步離線打卡錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

export { router as attendanceRoutes };
