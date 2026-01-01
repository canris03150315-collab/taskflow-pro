"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.financeRoutes = router;

// 初始化資料表欄位
const ensureColumns = async (db) => {
    const columns = [
        "ALTER TABLE finance_records ADD COLUMN date TEXT",
        "ALTER TABLE finance_records ADD COLUMN scope TEXT DEFAULT 'DEPARTMENT'",
        "ALTER TABLE finance_records ADD COLUMN department_id TEXT",
        "ALTER TABLE finance_records ADD COLUMN owner_id TEXT",
        "ALTER TABLE finance_records ADD COLUMN recorded_by TEXT",
        "ALTER TABLE finance_records ADD COLUMN attachment TEXT"
    ];
    for (const sql of columns) {
        try { await db.run(sql); } catch (e) {}
    }
};

router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await ensureColumns(db);
        const records = await db.all("SELECT * FROM finance_records ORDER BY created_at DESC");
        res.json(records || []);
    } catch (error) {
        console.error("獲取財務記錄錯誤:", error);
        res.json([]);
    }
});

router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await ensureColumns(db);
        const { type, amount, description, category, attachment, date, scope, departmentId, ownerId, recordedBy, status } = req.body;
        const id = "fin-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
        
        await db.run(
            `INSERT INTO finance_records (id, type, amount, description, category, attachment, user_id, status, created_at, date, scope, department_id, owner_id, recorded_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, type, amount, description || '', category || '', attachment || '', req.user.id, status || 'COMPLETED', new Date().toISOString(), date || new Date().toISOString().split('T')[0], scope || 'DEPARTMENT', departmentId || '', ownerId || '', recordedBy || req.user.id]
        );
        
        const newRecord = await db.get("SELECT * FROM finance_records WHERE id = ?", [id]);
        console.log("創建財務記錄成功:", id);
        res.json(newRecord);
    } catch (error) {
        console.error("創建財務記錄錯誤:", error);
        res.status(500).json({ error: "創建失敗: " + error.message });
    }
});

router.post("/:id/confirm", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await db.run("UPDATE finance_records SET status = ? WHERE id = ?", ["COMPLETED", req.params.id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: "確認失敗" });
    }
});

router.delete("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await db.run("DELETE FROM finance_records WHERE id = ?", [req.params.id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: "刪除失敗" });
    }
});
