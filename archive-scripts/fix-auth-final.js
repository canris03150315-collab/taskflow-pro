// 修復 auth.js - 移除壞掉的代碼，添加正確的修改密碼端點
const fs = require('fs');

const filePath = '/app/dist/routes/auth.js';
const brokenPath = '/tmp/auth-broken.js';

// 讀取原始壞掉的文件
let content = fs.readFileSync(brokenPath, 'utf8');

// 找到 exports.default 之前的部分（移除壞掉的 change-password 路由）
const exportIndex = content.indexOf('exports.default = router;');
const changePasswordIndex = content.indexOf('// POST /auth/change-password');

if (changePasswordIndex > -1 && changePasswordIndex < exportIndex) {
    // 移除壞掉的代碼
    content = content.substring(0, changePasswordIndex);
}

// 如果結尾有多餘的 exports.default，移除
content = content.replace(/exports\.default = router;\s*$/g, '');

// 添加正確的修改密碼路由
const changePasswordRoute = `
// POST /auth/change-password - 修改密碼
router.post("/change-password", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "未提供認證 Token" });
        }
        
        const token = authHeader.substring(7);
        const db = req.db;
        
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        } catch (e) {
            return res.status(401).json({ success: false, message: "Token 無效或已過期" });
        }
        
        const currentUser = await db.get("SELECT * FROM users WHERE id = ?", [decoded.id]);
        if (!currentUser) {
            return res.status(401).json({ success: false, message: "用戶不存在" });
        }

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

        const validPassword = await bcrypt_1.default.compare(currentPassword, targetUser.password);
        if (!validPassword) {
            return res.status(400).json({ success: false, message: "目前密碼不正確" });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, message: "新密碼不能與目前密碼相同" });
        }

        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await db.run("UPDATE users SET password = ?, updated_at = ? WHERE id = ?",
            [hashedPassword, new Date().toISOString(), userId]);

        console.log("[Auth] 密碼已修改:", userId);
        res.json({ success: true, message: "密碼修改成功" });
    } catch (error) {
        console.error("[Auth] 修改密碼錯誤:", error);
        res.status(500).json({ success: false, message: "伺服器錯誤" });
    }
});

exports.default = router;
`;

content = content.trim() + '\n' + changePasswordRoute;

fs.writeFileSync(filePath, content);
console.log('✓ auth.js 已修復');
