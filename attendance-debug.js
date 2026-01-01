"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();

// POST /api/attendance/clock-in - 上班打卡（支援多次）
router.post('/clock-in', auth_1.authenticateToken, async (req, res) => {
  try {
    // 詳細的調試信息
    console.log('=== Clock In Debug ===');
    console.log('req.user exists:', !!req.user);
    console.log('req.user:', req.user);
    
    if (!req.user) {
      console.log('Error: req.user is undefined');
      return res.status(401).json({ error: '用戶未認證' });
    }
    
    if (!req.user.id) {
      console.log('Error: req.user.id is undefined');
      console.log('req.user keys:', Object.keys(req.user));
      return res.status(400).json({ error: '用戶信息不完整' });
    }
    
    const db = req.db;
    const currentUser = req.user;
    const {
      location_lat,
      location_lng,
      location_address,
      is_offline = false,
      client_timestamp
    } = req.body;

    console.log('User ID:', currentUser.id);
    console.log('Request body:', req.body);

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // 檢查今天最後一次打卡的類型
    const lastRecord = await db.get(
      `SELECT * FROM attendance_records 
       WHERE user_id = ? AND date = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [currentUser.id, today]
    );

    console.log('Last record:', lastRecord);

    // 如果今天還沒有打卡，或者最後一次是下班打卡，都可以上班打卡
    if (!lastRecord || lastRecord.type === 'clock-out') {
      const recordId = `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 轉換布爾值為數字
      const offlineFlag = is_offline ? 1 : 0;
      
      await db.run(
        `INSERT INTO attendance_records 
         (id, user_id, date, type, clock_in, location_lat, location_lng, location_address, is_offline, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recordId,
          currentUser.id,
          today,
          'clock-in',
          time,
          location_lat || null,
          location_lng || null,
          location_address || null,
          offlineFlag,  // 使用數字而不是布爾值
          now.toISOString()
        ]
      );

      console.log('Clock in successful!');
      res.json({
        success: true,
        message: '上班打卡成功',
        record_id: recordId,
        time: time,
        date: today
      });
    } else {
      console.log('User already clocked in');
      res.status(400).json({
        error: '您已經上班打卡了，請先下班打卡後再重新上班打卡'
      });
    }
  } catch (error) {
    console.error('上班打卡錯誤:', error);
    console.error('錯誤堆疊:', error.stack);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// 其他路由保持不變...
exports.attendanceRoutes = router;
