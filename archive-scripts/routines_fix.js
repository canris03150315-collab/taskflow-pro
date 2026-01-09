"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routineRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.routineRoutes = router;

// 初始化資料表 (包含 items 欄位)
const initTable = async (db) => {
    await db.run(`
        CREATE TABLE IF NOT EXISTS routine_templates (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            department_id TEXT,
            items TEXT,
            read_by TEXT DEFAULT '[]',
            last_updated TEXT,
            created_at TEXT,
            created_by TEXT
        )
    `);
    // 確保 items 欄位存在
    try {
        await db.run("ALTER TABLE routine_templates ADD COLUMN items TEXT");
    } catch(e) {}
    try {
        await db.run("ALTER TABLE routine_templates ADD COLUMN read_by TEXT DEFAULT '[]'");
    } catch(e) {}
    try {
        await db.run("ALTER TABLE routine_templates ADD COLUMN last_updated TEXT");
    } catch(e) {}
};

// GET /templates - 獲取所有文件模板
router.get("/templates", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await initTable(db);
        const templates = await db.all("SELECT * FROM routine_templates ORDER BY last_updated DESC, created_at DESC");
        
        // 解析 JSON 欄位
        const result = (templates || []).map(t => ({
            id: t.id,
            title: t.title,
            departmentId: t.department_id,
            items: t.items ? JSON.parse(t.items) : [],
            readBy: t.read_by ? JSON.parse(t.read_by) : [],
            lastUpdated: t.last_updated || t.created_at
        }));
        
        res.json(result);
    } catch (error) {
        console.error("獲取文件模板錯誤:", error);
        res.json([]);
    }
});

// POST /templates - 儲存文件模板
router.post("/templates", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await initTable(db);
        
        const { id, title, departmentId, items, lastUpdated } = req.body;
        const now = new Date().toISOString();
        
        // 檢查是否已存在
        const existing = await db.get("SELECT id FROM routine_templates WHERE id = ?", [id]);
        
        if (existing) {
            // 更新
            await db.run(
                `UPDATE routine_templates SET 
                    title = ?, 
                    department_id = ?, 
                    items = ?, 
                    last_updated = ?
                WHERE id = ?`,
                [title, departmentId, JSON.stringify(items || []), lastUpdated || now, id]
            );
        } else {
            // 新增
            await db.run(
                `INSERT INTO routine_templates (id, title, department_id, items, read_by, last_updated, created_at, created_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, title, departmentId, JSON.stringify(items || []), '[]', lastUpdated || now, now, req.user.id]
            );
        }
        
        const saved = await db.get("SELECT * FROM routine_templates WHERE id = ?", [id]);
        res.json({
            id: saved.id,
            title: saved.title,
            departmentId: saved.department_id,
            items: saved.items ? JSON.parse(saved.items) : [],
            readBy: saved.read_by ? JSON.parse(saved.read_by) : [],
            lastUpdated: saved.last_updated
        });
    } catch (error) {
        console.error("儲存文件模板錯誤:", error);
        res.status(500).json({ error: "儲存失敗" });
    }
});

// DELETE /templates/:id - 刪除文件模板
router.delete("/templates/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await db.run("DELETE FROM routine_templates WHERE id = ?", [req.params.id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: "刪除失敗" });
    }
});

// POST /templates/:id/read - 標記已讀
router.post("/templates/:id/read", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { userId } = req.body;
        const templateId = req.params.id;
        
        const template = await db.get("SELECT read_by FROM routine_templates WHERE id = ?", [templateId]);
        if (!template) {
            return res.status(404).json({ error: "文件不存在" });
        }
        
        let readBy = [];
        try {
            readBy = JSON.parse(template.read_by || '[]');
        } catch(e) {
            readBy = [];
        }
        
        if (!readBy.includes(userId)) {
            readBy.push(userId);
            await db.run("UPDATE routine_templates SET read_by = ? WHERE id = ?", [JSON.stringify(readBy), templateId]);
        }
        
        res.json({ ok: true });
    } catch (error) {
        console.error("標記已讀錯誤:", error);
        res.status(500).json({ error: "操作失敗" });
    }
});

// --- 以下為例行工作記錄相關 API ---

router.get("/today", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { userId, deptId } = req.query;
        const today = new Date().toISOString().split("T")[0];
        const records = await db.all(
            "SELECT * FROM routine_records WHERE date = ? AND (user_id = ? OR department_id = ?)",
            [today, userId || req.user.id, deptId || req.user.department]
        );
        res.json(records || []);
    } catch (error) {
        console.error("獲取今日例行工作錯誤:", error);
        res.json([]);
    }
});

router.get("/history", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const records = await db.all("SELECT * FROM routine_records ORDER BY date DESC LIMIT 100");
        res.json(records || []);
    } catch (error) {
        res.json([]);
    }
});

router.post("/records/:id/toggle", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const record = await db.get("SELECT * FROM routine_records WHERE id = ?", [req.params.id]);
        if (record) {
            await db.run("UPDATE routine_records SET completed = ? WHERE id = ?", [!record.completed, req.params.id]);
        }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: "操作失敗" });
    }
});
