"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = express_1.Router();
exports.reportRoutes = router;

// Init edit log table
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

// GET / - Get reports
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        console.log("[Reports] User query:", currentUser.id, "Role:", currentUser.role);
        
        let reports;
        if (currentUser.role === "EMPLOYEE") {
            console.log("[Reports] Employee query, filter user_id =", currentUser.id);
            reports = await db.all("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [currentUser.id]);
        } else {
            console.log("[Reports] Manager query, show all reports");
            reports = await db.all("SELECT * FROM reports ORDER BY created_at DESC LIMIT 50");
        }
        
        console.log("[Reports] Query result count:", reports.length);
        
        for (const r of reports) {
            try { r.content = JSON.parse(r.content || "{}"); } catch(e) { r.content = {}; }
            // Get edit logs
            try {
                const logs = await db.all("SELECT * FROM report_edit_logs WHERE report_id = ? ORDER BY edited_at DESC", [r.id]);
                r.editLogs = logs || [];
            } catch(e) {
                r.editLogs = [];
            }
        }
        res.json({ reports });
    } catch (error) {
        console.error("[Reports] Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// POST / - Create report
router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { type, content } = req.body;
        const id = "report-" + Date.now();
        const now = new Date().toISOString();
        
        console.log("[Reports] Create report:", id, "User:", currentUser.id);
        
        await db.run("INSERT INTO reports (id, type, user_id, created_at, content) VALUES (?, ?, ?, ?, ?)",
            [id, type || "DAILY", currentUser.id, now, JSON.stringify(content)]);
        const report = await db.get("SELECT * FROM reports WHERE id = ?", [id]);
        report.content = JSON.parse(report.content);
        
        console.log("[Reports] Report saved:", report.id, "user_id:", report.user_id);
        res.json({ report });
    } catch (error) {
        console.error("[Reports] Create error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// PUT /:id - Manager edit report
router.put("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await initEditLogTable(db);
        
        const currentUser = req.user;
        const { id } = req.params;
        const { content, reason } = req.body;
        
        // Check permission: only managers can edit
        if (currentUser.role === "EMPLOYEE") {
            return res.status(403).json({ error: "\u7121\u6b0a\u4fee\u6539\u5831\u8868" });
        }
        
        // Get original report
        const original = await db.get("SELECT * FROM reports WHERE id = ?", [id]);
        if (!original) {
            return res.status(404).json({ error: "\u5831\u8868\u4e0d\u5b58\u5728" });
        }
        
        const oldContent = original.content;
        const newContent = JSON.stringify(content);
        const now = new Date().toISOString();
        const logId = "log-" + Date.now();
        
        // Log edit
        await db.run(
            "INSERT INTO report_edit_logs (id, report_id, editor_id, editor_name, edited_at, old_content, new_content, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [logId, id, currentUser.id, currentUser.name || currentUser.id, now, oldContent, newContent, reason || "\u4e3b\u7ba1\u4fee\u6b63"]
        );
        
        // Update report
        await db.run("UPDATE reports SET content = ? WHERE id = ?", [newContent, id]);
        
        const updated = await db.get("SELECT * FROM reports WHERE id = ?", [id]);
        updated.content = JSON.parse(updated.content);
        
        // Get edit logs
        const logs = await db.all("SELECT * FROM report_edit_logs WHERE report_id = ? ORDER BY edited_at DESC", [id]);
        updated.editLogs = logs;
        
        console.log("[Reports] Report edited:", id, "by", currentUser.name, "reason:", reason);
        res.json({ report: updated });
    } catch (error) {
        console.error("[Reports] Edit error:", error);
        res.status(500).json({ error: "Server error: " + error.message });
    }
});

// DELETE /:id - Delete report
router.delete("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        
        const report = await db.get("SELECT * FROM reports WHERE id = ?", [id]);
        if (!report) {
            return res.status(404).json({ error: "\u5831\u8868\u4e0d\u5b58\u5728" });
        }
        
        // Only owner or manager can delete
        if (currentUser.role === "EMPLOYEE" && report.user_id !== currentUser.id) {
            return res.status(403).json({ error: "\u7121\u6b0a\u522a\u9664" });
        }
        
        await db.run("DELETE FROM reports WHERE id = ?", [id]);
        await db.run("DELETE FROM report_edit_logs WHERE report_id = ?", [id]);
        
        console.log("[Reports] Report deleted:", id);
        res.json({ success: true });
    } catch (error) {
        console.error("[Reports] Delete error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// GET /:id/logs - Get report edit logs
router.get("/:id/logs", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await initEditLogTable(db);
        
        const { id } = req.params;
        const logs = await db.all("SELECT * FROM report_edit_logs WHERE report_id = ? ORDER BY edited_at DESC", [id]);
        res.json({ logs });
    } catch (error) {
        console.error("[Reports] Get logs error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
