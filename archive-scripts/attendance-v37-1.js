"use strict";
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

console.log('[Attendance V37.1] Module loading (ASCII Only)...');

// Helper for Taiwan Time (UTC+8)
const getTaiwanToday = () => {
    const now = new Date();
    // Offset for UTC+8 (Taiwan)
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return twTime.toISOString().split('T')[0];
};

// Robust database caller
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
        console.error(`[Attendance V37.1] DB Error (${method}):`, err.message, 'SQL:', sql);
        throw err;
    }
    throw new Error(`Database method ${method} or ${asyncMethod} not found`);
};

router.post('/clock-in', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { location_lat, location_lng, location_address, is_offline = false, client_timestamp } = req.body;
        
        const today = getTaiwanToday();
        console.log(`[Attendance V37.1] Clock-in attempt by ${currentUser.name} (${currentUser.id}) for date ${today}`);

        // 1. Auto-close stale records (older than today)
        try {
            const staleRecords = await dbCall(db, 'all', 
                'SELECT id, clock_in FROM attendance_records WHERE user_id = ? AND clock_out IS NULL AND date < ?',
                [currentUser.id, today]
            );
            if (staleRecords.length > 0) {
                console.log(`[Attendance V37.1] Closing ${staleRecords.length} stale records for ${currentUser.name}`);
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
            console.error('[Attendance V37.1] Stale cleanup error:', staleErr.message);
        }

        // 2. Check for existing active record today
        const activeRecord = await dbCall(db, 'get',
            'SELECT id FROM attendance_records WHERE user_id = ? AND clock_out IS NULL AND date = ? ORDER BY clock_in DESC LIMIT 1',
            [currentUser.id, today]
        );
        
        if (activeRecord) {
            console.log(`[Attendance V37.1] Already clocked in today for ${currentUser.name}`);
            // "您目前已在上班狀態中，請先簽退。"
            return res.status(400).json({ success: false, error: '\u60a8\u76ee\u524d\u5df2\u5728\u4e0a\u73ed\u72c0\u614b\u4e2d\uff0c\u8acb\u5148\u7c3d\u9000\u3002' });
        }

        // 3. Create new record
        const id = 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const clockInTime = client_timestamp ? new Date(client_timestamp) : new Date();
        
        await dbCall(db, 'run',
            "INSERT INTO attendance_records (id, user_id, date, clock_in, status, location_lat, location_lng, location_address, is_offline) VALUES (?, ?, ?, ?, 'ONLINE', ?, ?, ?, ?)",
            [id, currentUser.id, today, clockInTime.toISOString(), location_lat || null, location_lng || null, location_address || '', is_offline ? 1 : 0]
        );
        
        console.log(`[Attendance V37.1] Clock-in success for ${currentUser.name}`);
        res.json({
            success: true,
            // "打卡成功"
            message: '\u6253\u5361\u6210\u529f',
            record: { id, user_id: currentUser.id, date: today, clock_in: clockInTime.toISOString(), status: 'ONLINE' }
        });
    } catch (error) {
        console.error('[Attendance V37.1] Clock-in error:', error.message);
        // "伺服器錯誤，無法完成打卡"
        res.status(500).json({ success: false, error: '\u4f3a\u670d\u5668\u932f\u8aa4\uff0c\u7121\u6cd5\u5b8c\u6210\u6253\u5361' });
    }
});

router.post('/clock-out', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { location_lat, location_lng, location_address, is_offline = false, client_timestamp } = req.body;
        
        console.log(`[Attendance V37.1] Clock-out attempt by ${currentUser.name}`);

        const activeRecord = await dbCall(db, 'get',
            'SELECT * FROM attendance_records WHERE user_id = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1',
            [currentUser.id]
        );
        
        if (!activeRecord) {
            console.log(`[Attendance V37.1] No active record found for ${currentUser.name}`);
            // "找不到進行中的打卡紀錄，請先上班打卡。"
            return res.status(400).json({ success: false, error: '\u627e\u4e0d\u5230\u9032\u884c\u4e2d\u7684\u6253\u5361\u7d00\u9304\uff0c\u8acb\u5148\u4e0a\u73ed\u6253\u5361\u3002' });
        }
        
        const clockOutTime = client_timestamp ? new Date(client_timestamp) : new Date();
        const clockInTime = new Date(activeRecord.clock_in);
        const durationMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60));
        
        await dbCall(db, 'run',
            "UPDATE attendance_records SET clock_out = ?, duration_minutes = ?, status = 'OFFLINE', location_lat = ?, location_lng = ?, location_address = ?, is_offline = ? WHERE id = ?",
            [clockOutTime.toISOString(), durationMinutes, location_lat || activeRecord.location_lat, location_lng || activeRecord.location_lng, location_address || activeRecord.location_address, is_offline ? 1 : 0, activeRecord.id]
        );
        
        console.log(`[Attendance V37.1] Clock-out success for ${currentUser.name}, duration: ${durationMinutes} mins`);
        res.json({
            success: true,
            // "簽退成功"
            message: '\u7c3d\u9000\u6210\u529f',
            record: { ...activeRecord, clock_out: clockOutTime.toISOString(), duration_minutes: durationMinutes, status: 'OFFLINE' }
        });
    } catch (error) {
        console.error('[Attendance V37.1] Clock-out error:', error.message);
        // "伺服器錯誤，無法完成簽退"
        res.status(500).json({ success: false, error: '\u4f3a\u670d\u5668\u932f\u8aa4\uff0c\u7121\u6cd5\u5b8c\u6210\u7c3d\u9000' });
    }
});

router.get('/status', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const today = getTaiwanToday();
        
        // Find most recent record for today
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
            // Check for any open record from past days
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
        
        // Week stats (simplified boundary)
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
        console.error('[Attendance V37.1] Status error:', error.message);
        // "無法獲取打卡狀態"
        res.status(500).json({ success: false, error: '\u7121\u6cd5\u7372\u53d6\u6253\u5361\u72c0\u614b' });
    }
});

exports.attendanceRoutes = router;
console.log('[Attendance V37.1] Module export complete. Exported as attendanceRoutes.');
