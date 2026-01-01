#!/bin/bash
# 部署績效考核 API 到後端伺服器

SERVER="165.227.147.40"
SSH_USER="root"

echo "=== 部署績效考核 API ==="

# 建立 performance.js 路由
ssh ${SSH_USER}@${SERVER} 'docker exec taskflow-pro sh -c '"'"'cat > /app/dist/routes/performance.js << "EOF"
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.performanceRoutes = router;

// 初始化資料表
const initPerformanceTable = async (db) => {
    await db.run(`
        CREATE TABLE IF NOT EXISTS performance_reviews (
            id TEXT PRIMARY KEY,
            target_user_id TEXT NOT NULL,
            period TEXT NOT NULL,
            reviewer_id TEXT,
            updated_at TEXT NOT NULL,
            metrics TEXT NOT NULL,
            rating_work_attitude INTEGER DEFAULT 3,
            rating_professionalism INTEGER DEFAULT 3,
            rating_teamwork INTEGER DEFAULT 3,
            manager_comment TEXT DEFAULT "",
            total_score INTEGER DEFAULT 0,
            grade TEXT DEFAULT "C",
            status TEXT DEFAULT "DRAFT"
        )
    `);
};

// GET /reviews - 獲取績效考核列表
router.get("/reviews", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await initPerformanceTable(db);
        
        const { period, userId } = req.query;
        
        let query = "SELECT * FROM performance_reviews WHERE 1=1";
        const params = [];
        
        if (period) {
            query += " AND period = ?";
            params.push(period);
        }
        if (userId) {
            query += " AND target_user_id = ?";
            params.push(userId);
        }
        
        const reviews = await db.all(query, params);
        
        const result = reviews.map(r => ({
            id: r.id,
            targetUserId: r.target_user_id,
            period: r.period,
            reviewerId: r.reviewer_id,
            updatedAt: r.updated_at,
            metrics: JSON.parse(r.metrics || "{\"taskCompletionRate\":0,\"sopCompletionRate\":0,\"attendanceRate\":0}"),
            ratingWorkAttitude: r.rating_work_attitude,
            ratingProfessionalism: r.rating_professionalism,
            ratingTeamwork: r.rating_teamwork,
            managerComment: r.manager_comment || "",
            totalScore: r.total_score,
            grade: r.grade,
            status: r.status
        }));
        
        res.json(result);
    } catch (error) {
        console.error("獲取績效考核錯誤:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// GET /stats - 獲取用戶統計數據 (自動計算)
router.get("/stats", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { userId, period } = req.query;
        
        if (!userId || !period) {
            return res.status(400).json({ error: "Missing userId or period" });
        }
        
        const periodStart = period + "-01";
        const periodEnd = period + "-31";
        
        // 任務完成率
        const taskStats = await db.get(
            "SELECT COUNT(*) as total, SUM(CASE WHEN status = \"Completed\" THEN 1 ELSE 0 END) as completed FROM tasks WHERE (assigned_to_user_id = ? OR accepted_by_user_id = ?) AND created_at >= ? AND created_at <= ?",
            [userId, userId, periodStart, periodEnd]
        );
        
        const taskCompletionRate = taskStats && taskStats.total > 0 
            ? Math.round((taskStats.completed / taskStats.total) * 100) 
            : 100;
        
        // SOP 執行率
        const sopStats = await db.get(
            "SELECT COUNT(*) as total, SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed FROM routine_records WHERE user_id = ? AND date >= ? AND date <= ?",
            [userId, periodStart, periodEnd]
        );
        
        const sopCompletionRate = sopStats && sopStats.total > 0 
            ? Math.round((sopStats.completed / sopStats.total) * 100) 
            : 100;
        
        // 出勤率
        const attendanceStats = await db.get(
            "SELECT COUNT(DISTINCT date) as daysPresent FROM attendance_records WHERE user_id = ? AND date >= ? AND date <= ?",
            [userId, periodStart, periodEnd]
        );
        
        const now = new Date();
        const periodMonth = parseInt(period.split("-")[1]);
        const periodYear = parseInt(period.split("-")[0]);
        const isCurrentMonth = now.getMonth() + 1 === periodMonth && now.getFullYear() === periodYear;
        const workDays = isCurrentMonth ? Math.min(now.getDate(), 22) : 22;
        
        const attendanceRate = attendanceStats 
            ? Math.min(100, Math.round((attendanceStats.daysPresent / workDays) * 100))
            : 0;
        
        res.json({
            taskCompletionRate,
            sopCompletionRate,
            attendanceRate
        });
    } catch (error) {
        console.error("獲取統計數據錯誤:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// POST /reviews - 儲存績效考核
router.post("/reviews", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        await initPerformanceTable(db);
        
        const review = req.body;
        const currentUser = req.user;
        
        // 計算總分和等級
        const autoScore = ((review.metrics.taskCompletionRate + review.metrics.sopCompletionRate + review.metrics.attendanceRate) / 3) * 0.6;
        const manualScore = ((review.ratingWorkAttitude + review.ratingProfessionalism + review.ratingTeamwork) / 15) * 40;
        const totalScore = Math.round(autoScore + manualScore);
        
        let grade = "C";
        if (totalScore >= 95) grade = "S";
        else if (totalScore >= 85) grade = "A";
        else if (totalScore >= 70) grade = "B";
        else if (totalScore >= 60) grade = "C";
        else grade = "D";
        
        const now = new Date().toISOString();
        
        const existing = await db.get(
            "SELECT id FROM performance_reviews WHERE target_user_id = ? AND period = ?",
            [review.targetUserId, review.period]
        );
        
        if (existing) {
            await db.run(
                "UPDATE performance_reviews SET reviewer_id = ?, updated_at = ?, metrics = ?, rating_work_attitude = ?, rating_professionalism = ?, rating_teamwork = ?, manager_comment = ?, total_score = ?, grade = ?, status = ? WHERE id = ?",
                [currentUser.id, now, JSON.stringify(review.metrics), review.ratingWorkAttitude, review.ratingProfessionalism, review.ratingTeamwork, review.managerComment, totalScore, grade, review.status, existing.id]
            );
            res.json({ ...review, id: existing.id, totalScore, grade, updatedAt: now });
        } else {
            const id = review.id || "pr-" + Date.now();
            await db.run(
                "INSERT INTO performance_reviews (id, target_user_id, period, reviewer_id, updated_at, metrics, rating_work_attitude, rating_professionalism, rating_teamwork, manager_comment, total_score, grade, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [id, review.targetUserId, review.period, currentUser.id, now, JSON.stringify(review.metrics), review.ratingWorkAttitude, review.ratingProfessionalism, review.ratingTeamwork, review.managerComment, totalScore, grade, review.status]
            );
            res.json({ ...review, id, totalScore, grade, updatedAt: now });
        }
    } catch (error) {
        console.error("儲存績效考核錯誤:", error);
        res.status(500).json({ error: "Server error: " + error.message });
    }
});
EOF'"'"''

echo "=== 註冊路由到 index.js ==="

# 檢查並更新 index.js 來引入 performance 路由
ssh ${SSH_USER}@${SERVER} 'docker exec taskflow-pro sh -c '"'"'
# 檢查是否已經有 performance 路由
if ! grep -q "performanceRoutes" /app/dist/index.js; then
    # 在 chatRoutes 之前添加 performance 路由引入
    sed -i "/const chat_1/a const performance_1 = require(\"./routes/performance\");" /app/dist/index.js
    # 在 app.use.*chat 之前添加路由使用
    sed -i "/app.use.*\\/api\\/chat/i app.use(\"/api/performance\", performance_1.performanceRoutes);" /app/dist/index.js
    echo "Performance 路由已註冊"
else
    echo "Performance 路由已存在"
fi
'"'"''

echo "=== 重啟容器 ==="
ssh ${SSH_USER}@${SERVER} 'docker restart taskflow-pro'

echo "=== 驗證部署 ==="
ssh ${SSH_USER}@${SERVER} 'docker exec taskflow-pro head -30 /app/dist/routes/performance.js'

echo "=== 部署完成 ==="
