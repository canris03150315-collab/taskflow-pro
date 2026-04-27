"use strict";
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

console.log('[Attendance V37.3] Module loading (With History Route)...');

const getTaiwanToday = () => {
    const now = new Date();
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return twTime.toISOString().split('T')[0];
};

const dbCall = async (db, method, sql, params = []) => {
    if (!db) throw new Error('Database connection missing in request object');
    const asyncMethod = method + 'Async';
    try {
        if (typeof db[asyncMethod] === 'function') return await db[asyncMethod](sql, params);
        if (typeof db[method] === 'function') {
            if (db.constructor.name === 'Database' && typeof db.prepare === 'function') {
                const stmt = db.prepare(sql);
                if (method === 'run') return stmt.run(...params);
                if (method === 'get') return stmt.get(...params);
                if (method === 'all') return stmt.all(...params);
            }
            return await db[method](sql, params);
        }
    } catch (err) {
        console.error(`[Attendance V37.3] DB Error (${method}):`, err.message, 'SQL:', sql);
        throw err;
    }
    throw new Error(`Database method ${method} or ${asyncMethod} not found`);
};

// GET / - Get attendance history (Missing in V37.2)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        
        console.log(`[Attendance V37.3] History request by ${currentUser.name} (${currentUser.role})`);
        
        // Return recent records (last 3 months) to avoid overloading
        // This is necessary because the frontend fetches ALL history
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
        const dateLimit = threeMonthsAgo.toISOString().split('T')[0];

        // B1 fix: EMPLOYEE can only see own records; BOSS/MANAGER can see all
        let records;
        if (currentUser.role === 'EMPLOYEE') {
            records = await dbCall(db, 'all',
                'SELECT * FROM attendance_records WHERE date >= ? AND user_id = ? ORDER BY date DESC, clock_in DESC',
                [dateLimit, currentUser.id]
            );
        } else {
            records = await dbCall(db, 'all',
                'SELECT * FROM attendance_records WHERE date >= ? ORDER BY date DESC, clock_in DESC',
                [dateLimit]
            );
        }

        res.json({
            success: true,
            records: records || []
        });
    } catch (error) {
        console.error('[Attendance V37.3] History error:', error.message);
        res.status(500).json({ success: false, error: '取得出勤記錄失敗' });
    }
});

router.post('/clock-in', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { location_lat, location_lng, location_address, is_offline = false, client_timestamp } = req.body;
        
        const today = getTaiwanToday();
        console.log(`[Attendance V37.3] Clock-in attempt by ${currentUser.name} (${currentUser.id}) for date ${today}`);

        try {
            const staleRecords = await dbCall(db, 'all', 
                'SELECT id, clock_in FROM attendance_records WHERE user_id = ? AND clock_out IS NULL AND date < ?',
                [currentUser.id, today]
            );
            if (staleRecords.length > 0) {
                console.log(`[Attendance V37.3] Closing ${staleRecords.length} stale records for ${currentUser.name}`);
                for (const stale of staleRecords) {
                    const staleClockIn = new Date(stale.clock_in);
                    const staleClockOut = new Date(staleClockIn.getTime() + 8 * 60 * 60 * 1000);
                    await dbCall(db, 'run',
                        "UPDATE attendance_records SET clock_out = ?, duration_minutes = 480, status = 'OFFLINE' WHERE id = ?",
                        [staleClockOut.toISOString(), stale.id]
                    );
                }
            }
        } catch (staleErr) {
            console.error('[Attendance V37.3] Stale cleanup error:', staleErr.message);
        }

        const activeRecord = await dbCall(db, 'get',
            'SELECT id FROM attendance_records WHERE user_id = ? AND clock_out IS NULL AND date = ? ORDER BY clock_in DESC LIMIT 1',
            [currentUser.id, today]
        );

        if (activeRecord) {
            console.log(`[Attendance V37.3] Already clocked in today for ${currentUser.name}`);
            return res.status(400).json({ success: false, error: '今日已打卡，請先簽退' });
        }

        const id = 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const clockInTime = client_timestamp ? new Date(client_timestamp) : new Date();
        
        await dbCall(db, 'run',
            "INSERT INTO attendance_records (id, user_id, date, clock_in, status, location_lat, location_lng, location_address, is_offline) VALUES (?, ?, ?, ?, 'ONLINE', ?, ?, ?, ?)",
            [id, currentUser.id, today, clockInTime.toISOString(), location_lat || null, location_lng || null, location_address || '', is_offline ? 1 : 0]
        );
        
        console.log(`[Attendance V37.3] Clock-in success for ${currentUser.name}`);
        res.json({
            success: true,
            message: '打卡成功',
            record: { id, user_id: currentUser.id, date: today, clock_in: clockInTime.toISOString(), status: 'ONLINE' }
        });
    } catch (error) {
        console.error('[Attendance V37.3] Clock-in error:', error.message);
        res.status(500).json({ success: false, error: '打卡時發生伺服器錯誤' });
    }
});

router.post('/clock-out', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { location_lat, location_lng, location_address, is_offline = false, client_timestamp } = req.body;
        
        console.log(`[Attendance V37.3] Clock-out attempt by ${currentUser.name}`);

        const activeRecord = await dbCall(db, 'get',
            'SELECT * FROM attendance_records WHERE user_id = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1',
            [currentUser.id]
        );
        
        if (!activeRecord) {
            console.log(`[Attendance V37.3] No active record found for ${currentUser.name}`);
            return res.status(400).json({ success: false, error: '尚未打卡，請先簽到' });
        }
        
        const clockOutTime = client_timestamp ? new Date(client_timestamp) : new Date();
        const clockInTime = new Date(activeRecord.clock_in);
        const durationMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60));
        
        await dbCall(db, 'run',
            "UPDATE attendance_records SET clock_out = ?, duration_minutes = ?, status = 'OFFLINE', location_lat = ?, location_lng = ?, location_address = ?, is_offline = ? WHERE id = ?",
            [clockOutTime.toISOString(), durationMinutes, location_lat || activeRecord.location_lat, location_lng || activeRecord.location_lng, location_address || activeRecord.location_address, is_offline ? 1 : 0, activeRecord.id]
        );
        
        console.log(`[Attendance V37.3] Clock-out success for ${currentUser.name}, duration: ${durationMinutes} mins`);

        // B9 fix: Warn if shift exceeds 16 hours (960 minutes)
        const response = {
            success: true,
            message: '簽退成功',
            record: { ...activeRecord, clock_out: clockOutTime.toISOString(), duration_minutes: durationMinutes, status: 'OFFLINE' }
        };
        if (durationMinutes > 960) {
            response.warning = '班次超過16小時，請確認是否正確';
        }
        res.json(response);
    } catch (error) {
        console.error('[Attendance V37.3] Clock-out error:', error.message);
        res.status(500).json({ success: false, error: '簽退時發生伺服器錯誤' });
    }
});

router.get('/status', authenticateToken, async (req, res) => {
    try {
        // Prevent caching
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Surrogate-Control', 'no-store');

        const db = req.db;
        const currentUser = req.user;
        const today = getTaiwanToday();
        
        let record = await dbCall(db, 'get',
            'SELECT * FROM attendance_records WHERE user_id = ? AND date = ? ORDER BY clock_in DESC LIMIT 1',
            [currentUser.id, today]
        );
        
        let status = 'NOT_CLOCKED_IN';
        let canClockIn = true;
        let canClockOut = false;
        
        if (record) {
            if (!record.clock_out) {
                status = 'CLOCKED_IN';
                canClockIn = false;
                canClockOut = true;
            } else {
                status = 'CLOCKED_OUT';
                canClockIn = true;
                canClockOut = false;
            }
        } else {
            const openRecord = await dbCall(db, 'get',
                'SELECT * FROM attendance_records WHERE user_id = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1',
                [currentUser.id]
            );
            if (openRecord) {
                record = openRecord;
                status = 'CLOCKED_IN';
                canClockIn = false;
                canClockOut = true;
            }
        }
        
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = new Date(weekStart.getTime() + (8 * 60 * 60 * 1000)).toISOString().split('T')[0];
        
        const weekStats = await dbCall(db, 'get',
            'SELECT COUNT(DISTINCT date) as total_days, SUM(duration_minutes) as total_minutes FROM attendance_records WHERE user_id = ? AND date >= ?',
            [currentUser.id, weekStartStr]
        );
        
        const totalMinutes = weekStats ? (weekStats.total_minutes || 0) : 0;
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        
        res.json({
            success: true,
            today: { date: today, status, record: record || null, canClockIn, canClockOut },
            week: { total_days: weekStats ? (weekStats.total_days || 0) : 0, total_minutes: totalMinutes, total_work_time: totalHours + 'h ' + remainingMinutes + 'm' }
        });
    } catch (error) {
        console.error('[Attendance V37.3] Status error:', error.message);
        res.status(500).json({ success: false, error: '取得狀態失敗' });
    }
});


// POST /manual - Manual attendance entry by supervisor
router.post('/manual', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { userId, date, clockIn, clockOut, reason } = req.body;
    
    // Permission check
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
      return res.status(403).json({ error: '\u6b0a\u9650\u4e0d\u8db3' });
    }
    
    // Validate required fields
    if (!userId || !date || !clockIn || !clockOut || !reason) {
      return res.status(400).json({ error: '\u7f3a\u5c11\u5fc5\u8981\u6b04\u4f4d' });
    }
    
    // Check if user exists
    const targetUser = await dbCall(db, 'get', 'SELECT * FROM users WHERE id = ?', [userId]);
    if (!targetUser) {
      return res.status(404).json({ error: '\u7528\u6236\u4e0d\u5b58\u5728' });
    }
    
    // SUPERVISOR permission check
    if (currentUser.role === 'SUPERVISOR') {
      if (targetUser.department !== currentUser.department) {
        return res.status(403).json({ error: '\u53ea\u80fd\u70ba\u540c\u90e8\u9580\u4e0b\u5c6c\u88dc\u767b' });
      }
      if (targetUser.role !== 'EMPLOYEE') {
        return res.status(403).json({ error: '\u53ea\u80fd\u70ba\u4e00\u822c\u54e1\u5de5\u88dc\u767b' });
      }
    }
    
    // Check for existing record
    const existing = await dbCall(db, 'get', 'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?', [userId, date]);
    
    if (existing) {
      // Check if record already has clock_out
      if (existing.clock_out) {
        return res.status(400).json({ error: '\u8a72\u65e5\u671f\u5df2\u6709\u5b8c\u6574\u6253\u5361\u8a18\u9304' });
      }
      
      // Record exists but no clock_out - UPDATE mode
      console.log('[Manual Attendance] Updating existing record:', existing.id);
      
      const clockOutTime = new Date(date + 'T' + clockOut);
      const clockInTime = new Date(existing.clock_in);
      const durationMs = clockOutTime - clockInTime;
      const durationMinutes = Math.floor(durationMs / 1000 / 60);
      const workHours = (durationMinutes / 60).toFixed(2);
      const now = new Date().toISOString();
      
      // Update existing record - status stays as is (ONLINE or OFFLINE)
      await dbCall(db, 'run', 
        'UPDATE attendance_records SET clock_out = ?, duration_minutes = ?, work_hours = ?, status = ?, is_manual = ?, manual_by = ?, manual_reason = ?, manual_at = ? WHERE id = ?',
        [date + 'T' + clockOut, durationMinutes, workHours, 'OFFLINE', 1, currentUser.id, reason, now, existing.id]
      );
      
      const updated = await dbCall(db, 'get', 'SELECT * FROM attendance_records WHERE id = ?', [existing.id]);
      
      return res.json({
        success: true,
        mode: 'update',
        record: {
          id: updated.id,
          userId: updated.user_id,
          date: updated.date,
          clockIn: updated.clock_in,
          clockOut: updated.clock_out,
          durationMinutes: updated.duration_minutes,
          workHours: updated.work_hours,
          status: updated.status,
          isManual: Boolean(updated.is_manual),
          manualBy: updated.manual_by,
          manualReason: updated.manual_reason,
          manualAt: updated.manual_at
        }
      });
    }
    
    // No existing record - CREATE mode
    const clockInTime = new Date(date + 'T' + clockIn);
    const clockOutTime = new Date(date + 'T' + clockOut);
    const durationMs = clockOutTime - clockInTime;
    const durationMinutes = Math.floor(durationMs / 1000 / 60);
    const workHours = (durationMinutes / 60).toFixed(2);
    
    const id = 'attendance-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    
    // Insert new record - status must be 'OFFLINE' (manual entry is offline)
    await dbCall(db, 'run', 
      'INSERT INTO attendance_records (id, user_id, date, clock_in, clock_out, duration_minutes, work_hours, status, is_manual, manual_by, manual_reason, manual_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, date, date + 'T' + clockIn, date + 'T' + clockOut, durationMinutes, workHours, 'OFFLINE', 1, currentUser.id, reason, now, now]
    );
    
    const record = await dbCall(db, 'get', 'SELECT * FROM attendance_records WHERE id = ?', [id]);
    
    res.json({
      success: true,
      mode: 'create',
      record: {
        id: record.id,
        userId: record.user_id,
        date: record.date,
        clockIn: record.clock_in,
        clockOut: record.clock_out,
        durationMinutes: record.duration_minutes,
        workHours: record.work_hours,
        status: record.status,
        isManual: Boolean(record.is_manual),
        manualBy: record.manual_by,
        manualReason: record.manual_reason,
        manualAt: record.manual_at
      }
    });
    
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});


// PUT /manual/:id - Update manual attendance record
router.put('/manual/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { clockIn, clockOut, reason } = req.body;
    
    // Permission check
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
      return res.status(403).json({ error: '\u6b0a\u9650\u4e0d\u8db3' });
    }
    
    // Get existing record
    const existing = await dbCall(db, 'get', 'SELECT * FROM attendance_records WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '\u8a18\u9304\u4e0d\u5b58\u5728' });
    }
    
    // Only allow editing manual records
    if (!existing.is_manual) {
      return res.status(400).json({ error: '\u53ea\u80fd\u4fee\u6539\u88dc\u767b\u8a18\u9304' });
    }
    
    // SUPERVISOR can only edit records for their department
    if (currentUser.role === 'SUPERVISOR') {
      const targetUser = await dbCall(db, 'get', 'SELECT * FROM users WHERE id = ?', [existing.user_id]);
      if (targetUser && targetUser.department !== currentUser.department) {
        return res.status(403).json({ error: '\u53ea\u80fd\u4fee\u6539\u540c\u90e8\u9580\u7684\u8a18\u9304' });
      }
    }
    
    // Calculate new duration
    const date = existing.date;
    const newClockIn = clockIn ? date + 'T' + clockIn : existing.clock_in;
    const newClockOut = clockOut ? date + 'T' + clockOut : existing.clock_out;
    
    const clockInTime = new Date(newClockIn);
    const clockOutTime = new Date(newClockOut);
    const durationMs = clockOutTime - clockInTime;
    const durationMinutes = Math.floor(durationMs / 1000 / 60);
    const workHours = (durationMinutes / 60).toFixed(2);
    const now = new Date().toISOString();
    
    // Update record
    await dbCall(db, 'run', 
      'UPDATE attendance_records SET clock_in = ?, clock_out = ?, duration_minutes = ?, work_hours = ?, status = ?, manual_reason = ?, manual_at = ? WHERE id = ?',
      [newClockIn, newClockOut, durationMinutes, workHours, 'OFFLINE', reason || existing.manual_reason, now, id]
    );
    
    const updated = await dbCall(db, 'get', 'SELECT * FROM attendance_records WHERE id = ?', [id]);
    
    res.json({
      success: true,
      record: {
        id: updated.id,
        userId: updated.user_id,
        date: updated.date,
        clockIn: updated.clock_in,
        clockOut: updated.clock_out,
        durationMinutes: updated.duration_minutes,
        workHours: updated.work_hours,
        status: updated.status,
        isManual: Boolean(updated.is_manual),
        manualBy: updated.manual_by,
        manualReason: updated.manual_reason,
        manualAt: updated.manual_at
      }
    });
    
  } catch (error) {
    console.error('Update manual attendance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});


// DELETE /:id - Delete attendance record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    // Permission check - only BOSS, MANAGER, SUPERVISOR can delete
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
      return res.status(403).json({ error: '\u6b0a\u9650\u4e0d\u8db3' });
    }
    
    // Get existing record
    const existing = await dbCall(db, 'get', 'SELECT * FROM attendance_records WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '\u8a18\u9304\u4e0d\u5b58\u5728' });
    }
    
    // SUPERVISOR can only delete records for their department
    if (currentUser.role === 'SUPERVISOR') {
      const targetUser = await dbCall(db, 'get', 'SELECT * FROM users WHERE id = ?', [existing.user_id]);
      if (targetUser && targetUser.department !== currentUser.department) {
        return res.status(403).json({ error: '\u53ea\u80fd\u522a\u9664\u540c\u90e8\u9580\u7684\u8a18\u9304' });
      }
    }
    
    // Delete record
    await dbCall(db, 'run', 'DELETE FROM attendance_records WHERE id = ?', [id]);
    
    console.log('[Attendance] Deleted record:', id, 'by:', currentUser.name);
    
    res.json({
      success: true,
      message: '\u6253\u5361\u8a18\u9304\u5df2\u522a\u9664'
    });
    
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});


// PUT /api/attendance/:id - ???????????? BOSS ?????
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { clock_in, clock_out, notes } = req.body;

    // ????????? BOSS ?????
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: '\u53ea\u6709\u8001\u95c6\u53ef\u4ee5\u7de8\u8f2f\u6253\u5361\u8a18\u9304' });
    }

    // ????????????
    const existing = await db.get('SELECT * FROM attendance_records WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '\u6253\u5361\u8a18\u9304\u4e0d\u5b58\u5728' });
    }

    // ??????
    let durationMinutes = existing.duration_minutes;
    if (clock_in && clock_out) {
      const clockInTime = new Date(clock_in);
      const clockOutTime = new Date(clock_out);
      durationMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60));
    }

    // ??????
    await db.run(`
      UPDATE attendance_records 
      SET clock_in = ?, clock_out = ?, duration_minutes = ?
      WHERE id = ?
    `, [
      clock_in || existing.clock_in,
      clock_out || existing.clock_out,
      durationMinutes,
      id
    ]);

    // ????????????
    const updated = await db.get('SELECT * FROM attendance_records WHERE id = ?', [id]);

    res.json({
      message: '\u6253\u5361\u8a18\u9304\u5df2\u66f4\u65b0',
      record: updated
    });

  } catch (error) {
    console.error('\u7de8\u8f2f\u6253\u5361\u8a18\u9304\u932f\u8aa4:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

exports.attendanceRoutes = router;
console.log('[Attendance V37.3] Module export complete. Exported as attendanceRoutes.');


