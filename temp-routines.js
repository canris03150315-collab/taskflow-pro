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

router.get("/templates", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const templates = await db.all("SELECT * FROM routine_templates ORDER BY created_at DESC");
        res.json(templates || []);
    } catch (error) {
        console.error("獲取例行工作模板錯誤:", error);
        res.json([]);
    }
});

router.post("/templates", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { title, description, frequency, department_id } = req.body;
        const id = "routine-" + Date.now();
        await db.run(
            "INSERT INTO routine_templates (id, title, description, frequency, department_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id, title, description, frequency, department_id, req.user.id, new Date().toISOString()]
        );
        res.json({ id, title, description, frequency, department_id });
    } catch (error) {
        console.error("創建例行工作模板錯誤:", error);
        res.status(500).json({ error: "創建失敗" });
    }
});

router.delete("/templates/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await db.run("DELETE FROM routine_templates WHERE id = ?", [req.params.id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: "刪除失敗" });
    }
});

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
