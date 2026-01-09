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

        // For now, allow reading all records so department view works.
        // In a strict environment, we might restrict this to BOSS/MANAGER or own records.
        // But since the frontend does filtering, we send the dataset.
        
        const records = await dbCall(db, 'all',
            'SELECT * FROM attendance_records WHERE date >= ? ORDER BY date DESC, clock_in DESC',
            [dateLimit]
        );

        res.json({
            success: true,
            records: records || []
        });
    } catch (error) {
        console.error('[Attendance V37.3] History error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch attendance history' });
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
            return res.status(400).json({ success: false, error: 'Already clocked in today. Please clock out first.' });
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
            message: 'Clock-in success',
            record: { id, user_id: currentUser.id, date: today, clock_in: clockInTime.toISOString(), status: 'ONLINE' }
        });
    } catch (error) {
        console.error('[Attendance V37.3] Clock-in error:', error.message);
        res.status(500).json({ success: false, error: 'Server error during clock-in' });
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
            return res.status(400).json({ success: false, error: 'No active session found. Please clock-in first.' });
        }
        
        const clockOutTime = client_timestamp ? new Date(client_timestamp) : new Date();
        const clockInTime = new Date(activeRecord.clock_in);
        const durationMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60));
        
        await dbCall(db, 'run',
            "UPDATE attendance_records SET clock_out = ?, duration_minutes = ?, status = 'OFFLINE', location_lat = ?, location_lng = ?, location_address = ?, is_offline = ? WHERE id = ?",
            [clockOutTime.toISOString(), durationMinutes, location_lat || activeRecord.location_lat, location_lng || activeRecord.location_lng, location_address || activeRecord.location_address, is_offline ? 1 : 0, activeRecord.id]
        );
        
        console.log(`[Attendance V37.3] Clock-out success for ${currentUser.name}, duration: ${durationMinutes} mins`);
        res.json({
            success: true,
            message: 'Clock-out success',
            record: { ...activeRecord, clock_out: clockOutTime.toISOString(), duration_minutes: durationMinutes, status: 'OFFLINE' }
        });
    } catch (error) {
        console.error('[Attendance V37.3] Clock-out error:', error.message);
        res.status(500).json({ success: false, error: 'Server error during clock-out' });
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
        res.status(500).json({ success: false, error: 'Failed to fetch status' });
    }
});

exports.attendanceRoutes = router;
console.log('[Attendance V37.3] Module export complete. Exported as attendanceRoutes.');
