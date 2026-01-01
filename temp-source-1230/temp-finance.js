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

router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
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
        const { type, amount, description, category, attachments } = req.body;
        const id = "fin-" + Date.now();
        await db.run(
            "INSERT INTO finance_records (id, type, amount, description, category, attachments, user_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [id, type, amount, description, category, JSON.stringify(attachments || []), req.user.id, "pending", new Date().toISOString()]
        );
        res.json({ id, type, amount, description, category, status: "pending" });
    } catch (error) {
        console.error("創建財務記錄錯誤:", error);
        res.status(500).json({ error: "創建失敗" });
    }
});

router.post("/:id/confirm", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await db.run("UPDATE finance_records SET status = ? WHERE id = ?", ["confirmed", req.params.id]);
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
