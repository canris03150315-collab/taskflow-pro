// 添加修改密碼端點
const fs = require('fs');

const filePath = '/app/dist/routes/auth.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到 exports 或文件結尾前添加新路由
const changePasswordRoute = `
// POST /auth/change-password - 修改密碼
router.post("/change-password", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { userId, currentPassword, newPassword } = req.body;
        const currentUser = req.user;

        // 驗證參數
        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "請提供完整資訊" });
        }

        // 只能修改自己的密碼，除非是管理員
        const isAdmin = currentUser.role === "BOSS" || currentUser.role === "MANAGER";
        if (currentUser.id !== userId && !isAdmin) {
            return res.status(403).json({ success: false, message: "無權修改他人密碼" });
        }

        // 獲取目標用戶
        const targetUser = await db.get("SELECT * FROM users WHERE id = ?", [userId]);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "用戶不存在" });
        }

        // 驗證目前密碼
        const bcrypt = require("bcrypt");
        const validPassword = await bcrypt.compare(currentPassword, targetUser.password);
        if (!validPassword) {
            return res.status(400).json({ success: false, message: "目前密碼不正確" });
        }

        // 新密碼不能與舊密碼相同
        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, message: "新密碼不能與目前密碼相同" });
        }

        // 加密新密碼
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 更新密碼
        await db.run("UPDATE users SET password = ?, updated_at = ? WHERE id = ?", 
            [hashedPassword, new Date().toISOString(), userId]);

        console.log("[Auth] 密碼已修改:", userId);
        res.json({ success: true, message: "密碼修改成功" });
    } catch (error) {
        console.error("[Auth] 修改密碼錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器錯誤: " + error.message });
    }
});
`;

// 在 exports.default 之前添加
if (content.includes('exports.default = router;')) {
    content = content.replace('exports.default = router;', changePasswordRoute + '\nexports.default = router;');
    fs.writeFileSync(filePath, content);
    console.log('✓ 已添加修改密碼端點');
} else {
    // 嘗試在文件末尾添加
    content += changePasswordRoute;
    fs.writeFileSync(filePath, content);
    console.log('✓ 已在文件末尾添加修改密碼端點');
}
