"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = express_1.Router();
exports.reportRoutes = router;

// 初始化修改紀錄表
const initEditLogTable = async (db) => {
    await db.run(`
        CREATE TABLE IF NOT EXISTS report_edit_logs (
            id TEXT PRIMARY KEY,
            report_id TEXT NOT NULL,
            editor_id TEXT NOT NULL,
            editor_name TEXT NOT NULL,
            edited_at TEXT NOT NULL,
            old_content TEXT,
            new_content TEXT,
            reason TEXT
        )
    `);
};

// GET / - 獲取報表
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        console.log("[Reports] 用戶查詢報表:", currentUser.id, "角色:", currentUser.role);
        
        let reports;
        if (currentUser.role === "EMPLOYEE") {
            console.log("[Reports] 員工查詢，篩選 user_id =", currentUser.id);
            reports = await db.all("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [currentUser.id]);
        } else {
            console.log("[Reports] 主管查詢，顯示所有報表");
            reports = await db.all("SELECT * FROM reports ORDER BY created_at DESC LIMIT 50");
        }
        
        console.log("[Reports] 查詢結果數量:", reports.length);
        
        for (const r of reports) {
            try { r.content = JSON.parse(r.content || "{}"); } catch(e) { r.content = {}; }
            // 獲取修改紀錄
            try {
                const logs = await db.all("SELECT * FROM report_edit_logs WHERE report_id = ? ORDER BY edited_at DESC", [r.id]);
                r.editLogs = logs || [];
            } catch(e) {
                r.editLogs = [];
            }
        }
        res.json({ reports });
    } catch (error) {
        console.error("[Reports] 錯誤:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// POST / - 新增報表
router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { type, content } = req.body;
        const id = "report-" + Date.now();
        const now = new Date().toISOString();
        
        console.log("[Reports] 新增報表:", id, "用戶:", currentUser.id);
        
        await db.run("INSERT INTO reports (id, type, user_id, created_at, content) VALUES (?, ?, ?, ?, ?)",
            [id, type || "DAILY", currentUser.id, now, JSON.stringify(content)]);
        const report = await db.get("SELECT * FROM reports WHERE id = ?", [id]);
        report.content = JSON.parse(report.content);
        
        console.log("[Reports] 報表已儲存:", report.id, "user_id:", report.user_id);
        res.json({ report });
    } catch (error) {
        console.error("[Reports] 新增錯誤:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// PUT /:id - 主管修改報表
router.put("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await initEditLogTable(db);
        
        const currentUser = req.user;
        const { id } = req.params;
        const { content, reason } = req.body;
        
        // 檢查權限：只有主管可以修改
        if (currentUser.role === "EMPLOYEE") {
            return res.status(403).json({ error: "無權修改報表" });
        }
        
        // 獲取原始報表
        const original = await db.get("SELECT * FROM reports WHERE id = ?", [id]);
        if (!original) {
            return res.status(404).json({ error: "報表不存在" });
        }
        
        const oldContent = original.content;
        const newContent = JSON.stringify(content);
        const now = new Date().toISOString();
        const logId = "log-" + Date.now();
        
        // 記錄修改日誌
        await db.run(
            "INSERT INTO report_edit_logs (id, report_id, editor_id, editor_name, edited_at, old_content, new_content, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [logId, id, currentUser.id, currentUser.name || currentUser.id, now, oldContent, newContent, reason || "主管修正"]
        );
        
        // 更新報表
        await db.run("UPDATE reports SET content = ? WHERE id = ?", [newContent, id]);
        
        const updated = await db.get("SELECT * FROM reports WHERE id = ?", [id]);
        updated.content = JSON.parse(updated.content);
        
        // 獲取修改紀錄
        const logs = await db.all("SELECT * FROM report_edit_logs WHERE report_id = ? ORDER BY edited_at DESC", [id]);
        updated.editLogs = logs;
        
        console.log("[Reports] 報表已修改:", id, "by", currentUser.name, "reason:", reason);
        res.json({ report: updated });
    } catch (error) {
        console.error("[Reports] 修改錯誤:", error);
        res.status(500).json({ error: "Server error: " + error.message });
    }
});

// GET /:id/logs - 獲取報表修改紀錄
router.get("/:id/logs", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await initEditLogTable(db);
        
        const { id } = req.params;
        const logs = await db.all("SELECT * FROM report_edit_logs WHERE report_id = ? ORDER BY edited_at DESC", [id]);
        res.json({ logs });
    } catch (error) {
        console.error("[Reports] 獲取日誌錯誤:", error);
        res.status(500).json({ error: "Server error" });
    }
});
