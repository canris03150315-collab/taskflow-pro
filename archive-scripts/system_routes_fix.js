"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.systemRoutes = router;

// 輔助函數：新增審計日誌
const addAuditLog = async (db, log) => {
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                user_id TEXT,
                user_name TEXT,
                action TEXT NOT NULL,
                details TEXT,
                level TEXT DEFAULT 'INFO'
            )
        `);
        const id = 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        await db.run(
            `INSERT INTO system_logs (id, timestamp, user_id, user_name, action, details, level) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, new Date().toISOString(), log.userId, log.userName, log.action, log.details, log.level || 'INFO']
        );
    } catch (e) {
        console.error('審計日誌寫入失敗:', e);
    }
};

// GET /export - 匯出所有資料
router.get("/export", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        
        // 記錄操作
        await addAuditLog(db, {
            userId: req.user.id,
            userName: req.user.name,
            action: '系統備份',
            details: '執行資料庫匯出備份',
            level: 'WARNING'
        });
        
        // 匯出所有資料表
        const backup = {
            version: "1.0",
            exportedAt: new Date().toISOString(),
            exportedBy: req.user.id,
            data: {}
        };
        
        // 獲取所有資料表名稱
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        
        for (const table of tables) {
            const tableName = table.name;
            try {
                const rows = await db.all(`SELECT * FROM ${tableName}`);
                backup.data[tableName] = rows || [];
            } catch (err) {
                console.error(`匯出資料表 ${tableName} 失敗:`, err);
                backup.data[tableName] = [];
            }
        }
        
        console.log('[System] 資料匯出完成，資料表數量:', Object.keys(backup.data).length);
        res.json(backup);
    } catch (error) {
        console.error("匯出資料錯誤:", error);
        res.status(500).json({ error: "匯出失敗" });
    }
});

// POST /import - 匯入備份資料
router.post("/import", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { json } = req.body;
        
        // 記錄操作 (在匯入前)
        await addAuditLog(db, {
            userId: req.user.id,
            userName: req.user.name,
            action: '系統還原',
            details: '執行資料庫還原操作',
            level: 'DANGER'
        });
        
        let backup;
        try {
            backup = typeof json === 'string' ? JSON.parse(json) : json;
        } catch (parseError) {
            return res.status(400).json({ error: "無效的 JSON 格式" });
        }
        
        if (!backup.data) {
            return res.status(400).json({ error: "無效的備份檔案格式" });
        }
        
        console.log('[System] 開始匯入資料，資料表數量:', Object.keys(backup.data).length);
        
        // 開始事務
        await db.run("BEGIN TRANSACTION");
        
        try {
            for (const [tableName, rows] of Object.entries(backup.data)) {
                if (!Array.isArray(rows) || rows.length === 0) continue;
                
                // 清空現有資料
                await db.run(`DELETE FROM ${tableName}`);
                
                // 插入備份資料
                for (const row of rows) {
                    const columns = Object.keys(row);
                    const placeholders = columns.map(() => '?').join(', ');
                    const values = columns.map(col => {
                        const val = row[col];
                        // 如果是物件或陣列，轉為 JSON 字串
                        if (typeof val === 'object' && val !== null) {
                            return JSON.stringify(val);
                        }
                        return val;
                    });
                    
                    try {
                        await db.run(
                            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
                            values
                        );
                    } catch (insertErr) {
                        console.warn(`插入 ${tableName} 資料失敗:`, insertErr.message);
                    }
                }
                
                console.log(`[System] 匯入 ${tableName}: ${rows.length} 筆`);
            }
            
            await db.run("COMMIT");
            console.log('[System] 資料匯入完成');
            res.json({ success: true, message: "資料匯入成功" });
        } catch (transactionError) {
            await db.run("ROLLBACK");
            throw transactionError;
        }
    } catch (error) {
        console.error("匯入資料錯誤:", error);
        res.status(500).json({ error: "匯入失敗", details: error.message });
    }
});

// POST /reset - 重置系統
router.post("/reset", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        
        // 獲取所有資料表
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        
        for (const table of tables) {
            // 保留 users 表中的管理員帳號
            if (table.name === 'users') {
                await db.run("DELETE FROM users WHERE role != 'BOSS'");
            } else {
                await db.run(`DELETE FROM ${table.name}`);
            }
        }
        
        console.log('[System] 系統已重置');
        res.json({ success: true });
    } catch (error) {
        console.error("重置系統錯誤:", error);
        res.status(500).json({ error: "重置失敗" });
    }
});

// GET /settings - 獲取系統設定
router.get("/settings", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        
        // 確保 system_settings 資料表存在
        await db.run(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);
        
        const menuGroupsRow = await db.get("SELECT value FROM system_settings WHERE key = 'menuGroups'");
        
        res.json({
            menuGroups: menuGroupsRow ? JSON.parse(menuGroupsRow.value) : null
        });
    } catch (error) {
        console.error("獲取設定錯誤:", error);
        res.json({ menuGroups: null });
    }
});

// POST /settings - 儲存系統設定
router.post("/settings", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { menuGroups } = req.body;
        
        // 確保資料表存在
        await db.run(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);
        
        if (menuGroups) {
            await db.run(
                "INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)",
                ['menuGroups', JSON.stringify(menuGroups)]
            );
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error("儲存設定錯誤:", error);
        res.status(500).json({ error: "儲存失敗" });
    }
});

// POST /optimize-db - 執行資料庫索引優化
router.post("/optimize-db", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        
        // 記錄操作
        await addAuditLog(db, {
            userId: req.user.id,
            userName: req.user.name,
            action: '資料庫優化',
            details: '執行索引建立與優化',
            level: 'WARNING'
        });
        
        const indexes = [
            { table: 'users', column: 'username', unique: true },
            { table: 'users', column: 'department' },
            { table: 'users', column: 'role' },
            { table: 'tasks', column: 'status' },
            { table: 'tasks', column: 'created_by' },
            { table: 'tasks', column: 'assigned_to_user_id' },
            { table: 'tasks', column: 'target_department' },
            { table: 'tasks', column: 'is_archived' },
            { table: 'tasks', column: 'created_at' },
            { table: 'messages', column: 'channel_id' },
            { table: 'messages', column: 'user_id' },
            { table: 'messages', column: 'created_at' },
            { table: 'channels', column: 'type' },
            { table: 'channels', column: 'updated_at' },
            { table: 'reports', column: 'user_id' },
            { table: 'reports', column: 'created_at' },
            { table: 'finance_records', column: 'department_id' },
            { table: 'finance_records', column: 'date' },
            { table: 'attendance', column: 'user_id' },
            { table: 'attendance', column: 'date' },
            { table: 'system_logs', column: 'level' },
            { table: 'system_logs', column: 'timestamp' }
        ];
        
        let created = 0, skipped = 0;
        
        for (const idx of indexes) {
            const indexName = `idx_${idx.table}_${idx.column}`;
            const uniqueStr = idx.unique ? 'UNIQUE ' : '';
            try {
                await db.run(`CREATE ${uniqueStr}INDEX IF NOT EXISTS ${indexName} ON ${idx.table}(${idx.column})`);
                created++;
            } catch (err) {
                skipped++;
            }
        }
        
        // 複合索引
        const composites = [
            { name: 'idx_tasks_status_archived', table: 'tasks', columns: 'status, is_archived' },
            { name: 'idx_messages_channel_time', table: 'messages', columns: 'channel_id, created_at' },
            { name: 'idx_attendance_user_date', table: 'attendance', columns: 'user_id, date' }
        ];
        
        for (const idx of composites) {
            try {
                await db.run(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.columns})`);
                created++;
            } catch (err) {}
        }
        
        // 更新統計資訊
        await db.run('ANALYZE');
        
        console.log(`[DB優化] 完成: ${created} 個索引建立`);
        res.json({ success: true, created, skipped, message: `已建立 ${created} 個索引` });
    } catch (error) {
        console.error("資料庫優化錯誤:", error);
        res.status(500).json({ error: "優化失敗" });
    }
});
