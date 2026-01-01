// 綜合修復腳本 - 一次性應用所有修復
const fs = require('fs');

console.log('=== 開始應用所有修復 ===\n');

// 1. 修復 users.js - permissions 查詢
const usersPath = '/app/dist/routes/users.js';
let usersContent = fs.readFileSync(usersPath, 'utf8');

// 修復 GET /users 查詢
usersContent = usersContent.replace(
    /SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users/g,
    'SELECT id, name, role, department, avatar, username, created_at, updated_at, permissions FROM users'
);
console.log('✓ 1. 修復 permissions 查詢');

// 修復建立用戶權限檢查
const oldCreatePattern = /router\.post\('\/', auth_1\.authenticateToken, \(0, auth_1\.requireRole\)\(\[types_1\.Role\.BOSS, types_1\.Role\.MANAGER\]\), async \(req, res\) => \{\s*try \{\s*const db = req\.db;/;
const newCreateCode = `router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        // 檢查權限：BOSS, MANAGER, SUPERVISOR，或有 MANAGE_USERS 權限的人
        const currentUser = req.user;
        const isAdminRole = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER' || currentUser.role === 'SUPERVISOR';
        let userPerms = currentUser.permissions || [];
        if (typeof userPerms === 'string') {
            try { userPerms = JSON.parse(userPerms); } catch(e) { userPerms = []; }
        }
        const hasManageUsersPerm = Array.isArray(userPerms) && userPerms.includes('MANAGE_USERS');
        if (!isAdminRole && !hasManageUsersPerm) {
            return res.status(403).json({ error: '無權建立用戶' });
        }`;

if (oldCreatePattern.test(usersContent)) {
    usersContent = usersContent.replace(oldCreatePattern, newCreateCode);
    console.log('✓ 2. 修復建立用戶權限檢查');
} else {
    console.log('⚠ 2. 建立用戶權限檢查已修復或格式不同');
}

fs.writeFileSync(usersPath, usersContent);

// 2. 修復 auth.js - 添加修改密碼端點
const authPath = '/app/dist/routes/auth.js';
let authContent = fs.readFileSync(authPath, 'utf8');

// 檢查是否已經有 change-password 路由
if (!authContent.includes('/change-password')) {
    const changePasswordRoute = `
// POST /auth/change-password - 修改密碼
router.post("/change-password", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { userId, currentPassword, newPassword } = req.body;

        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "請提供完整資訊" });
        }

        const isAdmin = currentUser.role === "BOSS" || currentUser.role === "MANAGER";
        if (currentUser.id !== userId && !isAdmin) {
            return res.status(403).json({ success: false, message: "無權修改他人密碼" });
        }

        const targetUser = await db.get("SELECT * FROM users WHERE id = ?", [userId]);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "用戶不存在" });
        }

        const bcrypt = require("bcrypt");
        const validPassword = await bcrypt.compare(currentPassword, targetUser.password);
        if (!validPassword) {
            return res.status(400).json({ success: false, message: "目前密碼不正確" });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, message: "新密碼不能與目前密碼相同" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.run("UPDATE users SET password = ?, updated_at = ? WHERE id = ?",
            [hashedPassword, new Date().toISOString(), userId]);

        console.log("[Auth] 密碼已修改:", userId);
        res.json({ success: true, message: "密碼修改成功" });
    } catch (error) {
        console.error("[Auth] 修改密碼錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器錯誤" });
    }
});
`;

    // 在 exports.default 之前添加
    if (authContent.includes('exports.default = router;')) {
        authContent = authContent.replace(
            'exports.default = router;',
            changePasswordRoute + '\nexports.default = router;'
        );
        console.log('✓ 3. 添加修改密碼端點');
    } else {
        console.log('⚠ 3. 找不到 exports.default');
    }
    
    fs.writeFileSync(authPath, authContent);
} else {
    console.log('⚠ 3. 修改密碼端點已存在');
}

// 3. 修復 reports.js - 添加刪除端點
const reportsPath = '/app/dist/routes/reports.js';
let reportsContent = fs.readFileSync(reportsPath, 'utf8');

if (!reportsContent.includes('router.delete')) {
    const deleteRoute = `
// DELETE /:id - 刪除報表
router.delete("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;

        const report = await db.get("SELECT * FROM reports WHERE id = ?", [id]);
        if (!report) {
            return res.status(404).json({ error: "報表不存在" });
        }

        const isOwner = report.submitted_by === currentUser.id;
        const isAdmin = currentUser.role === "BOSS" || currentUser.role === "MANAGER" || currentUser.role === "SUPERVISOR";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: "無權刪除此報表" });
        }

        await db.run("DELETE FROM report_edit_logs WHERE report_id = ?", [id]);
        await db.run("DELETE FROM reports WHERE id = ?", [id]);

        console.log("[Reports] 報表已刪除:", id, "by", currentUser.name);
        res.json({ ok: true, message: "報表已刪除" });
    } catch (error) {
        console.error("[Reports] 刪除錯誤:", error);
        res.status(500).json({ error: "刪除失敗: " + error.message });
    }
});
`;

    if (reportsContent.includes('exports.default = router;')) {
        reportsContent = reportsContent.replace(
            'exports.default = router;',
            deleteRoute + '\nexports.default = router;'
        );
        fs.writeFileSync(reportsPath, reportsContent);
        console.log('✓ 4. 添加報表刪除端點');
    }
} else {
    console.log('⚠ 4. 報表刪除端點已存在');
}

console.log('\n=== 所有修復已完成 ===');
