"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceRoutes = void 0;
const express_1 = __importDefault(require("express"));
const logger_1 = require("../utils/logger");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.attendanceRoutes = router;

// GET /api/attendance - 獲取出勤記錄
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { user_id, date_from, date_to, status, page = '1', limit = '50' } = req.query;
        let query = `
      SELECT a.*,
             u.name as user_name,
             u.department as user_department
      FROM attendance_records a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
        const params = [];
        if (currentUser.role === 'EMPLOYEE') {
            query += ' AND a.user_id = ?';
            params.push(currentUser.id);
        }
        else if (currentUser.role === 'SUPERVISOR') {
            if (user_id) {
                const targetUser = await db.get('SELECT department FROM users WHERE id = ?', [user_id]);
                if (!targetUser || targetUser.department !== currentUser.department) {
                    return res.status(403).json({ error: '無權查看其他部門的出勤記錄' });
                }
            }
            query += ' AND u.department = ?';
            params.push(currentUser.department);
        }
        if (user_id && (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER')) {
            query += ' AND a.user_id = ?';
            params.push(user_id);
        }
        if (date_from) {
            query += ' AND a.date >= ?';
            params.push(date_from);
        }
        if (date_to) {
            query += ' AND a.date <= ?';
            params.push(date_to);
        }
        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        }
        query += ' ORDER BY a.date DESC, a.clock_in DESC LIMIT ? OFFSET ?';
        const limitNum = parseInt(limit);
        const pageNum = parseInt(page);
        params.push(limitNum, (pageNum - 1) * limitNum);
        const records = await db.all(query, params);
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
    }
    catch (error) {
        console.error('獲取出勤記錄錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// POST /api/attendance/clock-in - 上班打卡 (支持一天多次)
router.post('/clock-in', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { location_lat, location_lng, location_address, is_offline = false, client_timestamp } = req.body;
        const today = new Date().toISOString().split('T')[0];

        // 檢查是否有未結束的班次
        const activeSession = await db.get(
            'SELECT * FROM attendance_records WHERE user_id = ? AND clock_out IS NULL',
            [currentUser.id]
        );
        if (activeSession) {
            return res.status(400).json({ error: '您有未結束的班次，請先下班打卡' });
        }

        // 總是創建新記錄
        const recordId = `attendance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const clockInTime = client_timestamp || new Date().toISOString();
        
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

        const locationInfo = location_address ? ` (地點: ${location_address})` : '';
        await (0, logger_1.logSystemAction)(db, currentUser, 'CLOCK_IN', `上班打卡${locationInfo}`);

        res.json({
            message: '上班打卡成功',
            record: {
                id: recordId,
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
    }
    catch (error) {
        console.error('上班打卡錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// POST /api/attendance/clock-out - 下班打卡
router.post('/clock-out', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { location_lat, location_lng, location_address, is_offline = false, client_timestamp } = req.body;

        // 找到最新未結束的班次
        const existingRecord = await db.get(
            'SELECT * FROM attendance_records WHERE user_id = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1',
            [currentUser.id]
        );

        if (!existingRecord || !existingRecord.clock_in) {
            return res.status(400).json({ error: '請先上班打卡' });
        }

        const clockInTime = new Date(existingRecord.clock_in);
        const clockOutTime = client_timestamp ? new Date(client_timestamp) : new Date();
        const durationMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60));

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

        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        const locationInfo = location_address ? ` (地點: ${location_address})` : '';
        await (0, logger_1.logSystemAction)(db, currentUser, 'CLOCK_OUT', 
            `下班打卡${locationInfo}，工作時長: ${hours}小時${minutes}分鐘`);

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
    }
    catch (error) {
        console.error('下班打卡錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// GET /api/attendance/status - 獲取當前打卡狀態
router.get('/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const today = new Date().toISOString().split('T')[0];

        // 先找活躍班次（未打卡下班的）
        let todayRecord = await db.get(
            'SELECT * FROM attendance_records WHERE user_id = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1',
            [currentUser.id]
        );
        
        // 如果沒有活躍班次，找今天最新的記錄
        if (!todayRecord) {
            todayRecord = await db.get(
                'SELECT * FROM attendance_records WHERE user_id = ? AND date = ? ORDER BY clock_in DESC LIMIT 1',
                [currentUser.id, today]
            );
        }

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
                canClockIn = true;  // 允許再次打卡
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
    }
    catch (error) {
        console.error('獲取打卡狀態錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// GET /api/attendance/history - 獲取打卡歷史
router.get('/history', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        
        const records = await db.all(
            'SELECT * FROM attendance_records WHERE user_id = ? ORDER BY clock_in DESC LIMIT 100',
            [currentUser.id]
        );
        
        res.json({ records });
    }
    catch (error) {
        console.error('獲取打卡歷史錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
