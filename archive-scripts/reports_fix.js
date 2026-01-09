"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = express_1.Router();
exports.reportRoutes = router;

router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        console.log("[Reports] 用戶查詢報表:", currentUser.id, "角色:", currentUser.role);
        
        let reports;
        // 所有用戶都可以看到自己的報表，主管可以看到所有報表
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
        }
        res.json({ reports });
    } catch (error) {
        console.error("[Reports] 錯誤:", error);
        res.status(500).json({ error: "Server error" });
    }
});

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
