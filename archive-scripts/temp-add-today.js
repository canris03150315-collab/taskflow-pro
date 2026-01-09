const fs = require("fs");
const path = "/app/dist/routes/attendance.js";
let content = fs.readFileSync(path, "utf8");

// 檢查是否已有 /today 路由
if (content.includes('router.get("/today"') || content.includes("router.get('/today'")) {
    console.log("attendance/today 路由已存在");
} else {
    // 在 router.get('/status' 之前插入 /today 路由
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
    // 嘗試在 /status 路由之前插入
    if (content.includes("router.get('/status'")) {
        content = content.replace("router.get('/status'", todayRoute + "router.get('/status'");
    } else if (content.includes('router.get("/status"')) {
        content = content.replace('router.get("/status"', todayRoute + 'router.get("/status"');
    } else {
        // 如果找不到 /status，就在文件末尾添加
        content += todayRoute;
    }
    fs.writeFileSync(path, content);
    console.log("已添加 attendance/today 路由");
}
