#!/bin/sh
# 修復所有缺失的後端路由

echo "=== 修復所有缺失的路由 ==="

# 1. 添加 attendance/today 路由
echo "1. 添加 attendance/today 路由..."
docker exec taskflow-pro sh -c 'cat > /tmp/fix-attendance.js << '"'"'EOF'"'"'
const fs = require("fs");
const path = "/app/dist/routes/attendance.js";
let content = fs.readFileSync(path, "utf8");

// 檢查是否已有 /today 路由
if (content.includes("router.get(\"/today\"") || content.includes("router.get('\'''/today'\''")) {
    console.log("attendance/today 路由已存在");
} else {
    // 在 router.get("/status" 之前插入 /today 路由
    const todayRoute = `
// GET /today - 獲取今日考勤狀態
router.get("/today", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.query.userId || req.user.id;
        const today = new Date().toISOString().split("T")[0];
        const record = await db.get("SELECT * FROM attendance_records WHERE user_id = ? AND date = ?", [userId, today]);
        res.json(record || null);
    } catch (error) {
        console.error("獲取今日考勤錯誤:", error);
        res.json(null);
    }
});

`;
    content = content.replace("router.get('/status'", todayRoute + "router.get('/status'");
    content = content.replace('router.get("/status"', todayRoute + 'router.get("/status"');
    fs.writeFileSync(path, content);
    console.log("已添加 attendance/today 路由");
}
EOF'
docker exec taskflow-pro node /tmp/fix-attendance.js

# 2. 修復 finance 路由
echo "2. 修復 finance 路由..."
docker exec taskflow-pro sh -c 'cat > /app/dist/routes/finance.js << '"'"'EOF'"'"'
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

// GET / - 獲取所有財務記錄
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

// POST / - 創建財務記錄
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

// POST /:id/confirm - 確認財務記錄
router.post("/:id/confirm", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await db.run("UPDATE finance_records SET status = ? WHERE id = ?", ["confirmed", req.params.id]);
        res.json({ ok: true });
    } catch (error) {
        console.error("確認財務記錄錯誤:", error);
        res.status(500).json({ error: "確認失敗" });
    }
});

// DELETE /:id - 刪除財務記錄
router.delete("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await db.run("DELETE FROM finance_records WHERE id = ?", [req.params.id]);
        res.json({ ok: true });
    } catch (error) {
        console.error("刪除財務記錄錯誤:", error);
        res.status(500).json({ error: "刪除失敗" });
    }
});
EOF'
echo "已修復 finance 路由"

# 3. 修復 routines 路由
echo "3. 修復 routines 路由..."
docker exec taskflow-pro sh -c 'cat > /app/dist/routes/routines.js << '"'"'EOF'"'"'
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

// GET /templates - 獲取例行工作模板
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

// POST /templates - 創建例行工作模板
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

// DELETE /templates/:id - 刪除例行工作模板
router.delete("/templates/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await db.run("DELETE FROM routine_templates WHERE id = ?", [req.params.id]);
        res.json({ ok: true });
    } catch (error) {
        console.error("刪除例行工作模板錯誤:", error);
        res.status(500).json({ error: "刪除失敗" });
    }
});

// GET /today - 獲取今日例行工作
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

// GET /history - 獲取例行工作歷史
router.get("/history", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const records = await db.all("SELECT * FROM routine_records ORDER BY date DESC LIMIT 100");
        res.json(records || []);
    } catch (error) {
        console.error("獲取例行工作歷史錯誤:", error);
        res.json([]);
    }
});

// POST /records/:id/toggle - 切換例行工作完成狀態
router.post("/records/:id/toggle", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const record = await db.get("SELECT * FROM routine_records WHERE id = ?", [req.params.id]);
        if (record) {
            await db.run("UPDATE routine_records SET completed = ? WHERE id = ?", [!record.completed, req.params.id]);
        }
        res.json({ ok: true });
    } catch (error) {
        console.error("切換例行工作狀態錯誤:", error);
        res.status(500).json({ error: "操作失敗" });
    }
});
EOF'
echo "已修復 routines 路由"

# 4. 確保資料庫有必要的表格
echo "4. 確保資料庫有必要的表格..."
docker exec taskflow-pro sh -c 'cat > /tmp/fix-tables.js << '"'"'EOF'"'"'
const Database = require("better-sqlite3");
const db = new Database("/app/data/taskflow.db");

const tables = [
    `CREATE TABLE IF NOT EXISTS finance_records (
        id TEXT PRIMARY KEY,
        type TEXT,
        amount REAL,
        description TEXT,
        category TEXT,
        attachments TEXT,
        user_id TEXT,
        status TEXT DEFAULT "pending",
        created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS routine_templates (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        frequency TEXT,
        department_id TEXT,
        created_by TEXT,
        created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS routine_records (
        id TEXT PRIMARY KEY,
        template_id TEXT,
        user_id TEXT,
        department_id TEXT,
        date TEXT,
        completed INTEGER DEFAULT 0,
        created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS chat_channels (
        id TEXT PRIMARY KEY,
        type TEXT,
        name TEXT,
        participants TEXT,
        created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        channel_id TEXT,
        user_id TEXT,
        user_name TEXT,
        avatar TEXT,
        content TEXT,
        timestamp TEXT,
        read_by TEXT
    )`
];

tables.forEach(sql => {
    try {
        db.exec(sql);
        console.log("表格創建/確認成功");
    } catch (e) {
        console.error("表格創建錯誤:", e.message);
    }
});

db.close();
console.log("資料庫表格修復完成");
EOF'
docker exec taskflow-pro node /tmp/fix-tables.js

# 5. 重啟容器
echo "5. 重啟容器..."
docker restart taskflow-pro

sleep 3

echo ""
echo "=== 驗證修復 ==="
echo "檢查 finance 路由:"
docker exec taskflow-pro grep -c "router.get" /app/dist/routes/finance.js
echo "檢查 routines 路由:"
docker exec taskflow-pro grep -c "router.get" /app/dist/routes/routines.js

echo ""
echo "=== 所有路由修復完成 ==="
