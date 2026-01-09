"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRoutes = exports.addLog = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.logRoutes = router;

// 初始化日誌資料表
const initLogsTable = async (db) => {
    await db.run(`
        CREATE TABLE IF NOT EXISTS system_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            user_id TEXT,
            user_name TEXT,
            action TEXT NOT NULL,
            details TEXT,
            level TEXT DEFAULT 'INFO',
            ip_address TEXT
        )
    `);
};

// 新增日誌的輔助函數 (可被其他路由呼叫)
const addLog = async (db, log) => {
    try {
        await initLogsTable(db);
        const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();
        
        await db.run(
            `INSERT INTO system_logs (id, timestamp, user_id, user_name, action, details, level, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                timestamp,
                log.userId || null,
                log.userName || '系統',
                log.action,
                log.details || '',
                log.level || 'INFO',
                log.ipAddress || null
            ]
        );
        
        console.log(`[Audit] ${log.level || 'INFO'}: ${log.action} - ${log.details}`);
        return { id, timestamp };
    } catch (error) {
        console.error('新增日誌失敗:', error);
        return null;
    }
};
exports.addLog = addLog;

// GET /logs - 獲取審計日誌
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await initLogsTable(db);
        
        const { level, limit = 200 } = req.query;
        
        let query = "SELECT * FROM system_logs";
        const params = [];
        
        if (level && level !== 'ALL') {
            query += " WHERE level = ?";
            params.push(level);
        }
        
        query += " ORDER BY timestamp DESC LIMIT ?";
        params.push(parseInt(limit) || 200);
        
        const logs = await db.all(query, params);
        
        // 轉換為前端格式
        const result = (logs || []).map(log => ({
            id: log.id,
            timestamp: log.timestamp,
            userId: log.user_id,
            userName: log.user_name,
            action: log.action,
            details: log.details,
            level: log.level
        }));
        
        res.json(result);
    } catch (error) {
        console.error("獲取日誌錯誤:", error);
        res.json([]);
    }
});

// POST /logs - 新增日誌 (內部使用或手動記錄)
router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { action, details, level } = req.body;
        
        const result = await addLog(db, {
            userId: req.user.id,
            userName: req.user.name,
            action,
            details,
            level: level || 'INFO',
            ipAddress: req.ip
        });
        
        if (result) {
            res.json({ success: true, ...result });
        } else {
            res.status(500).json({ error: "新增日誌失敗" });
        }
    } catch (error) {
        console.error("新增日誌錯誤:", error);
        res.status(500).json({ error: "新增日誌失敗" });
    }
});

// 預定義的操作類型
const ACTION_TYPES = {
    // 使用者相關
    LOGIN: '登入系統',
    LOGOUT: '登出系統',
    CREATE_USER: '建立使用者',
    UPDATE_USER: '更新使用者',
    DELETE_USER: '刪除使用者',
    
    // 任務相關
    CREATE_TASK: '建立任務',
    UPDATE_TASK: '更新任務',
    DELETE_TASK: '刪除任務',
    ACCEPT_TASK: '接取任務',
    COMPLETE_TASK: '完成任務',
    
    // 公告相關
    CREATE_ANNOUNCEMENT: '發布公告',
    DELETE_ANNOUNCEMENT: '刪除公告',
    
    // 財務相關
    CREATE_FINANCE: '新增財務紀錄',
    CONFIRM_FINANCE: '確認財務紀錄',
    DELETE_FINANCE: '刪除財務紀錄',
    
    // 系統相關
    SYSTEM_BACKUP: '系統備份',
    SYSTEM_RESTORE: '系統還原',
    SYSTEM_RESET: '系統重置',
    UPDATE_SETTINGS: '更新系統設定'
};
