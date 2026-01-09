// 修復修改密碼端點 v2 - 在正確的位置添加
const fs = require('fs');

const filePath = '/app/dist/routes/auth.js';
let content = fs.readFileSync(filePath, 'utf8');

// 移除之前錯誤添加的代碼
if (content.includes('router.post("/change-password"')) {
    // 找到並移除之前添加的代碼
    const startIndex = content.indexOf('\n// POST /auth/change-password');
    if (startIndex > -1) {
        content = content.substring(0, startIndex);
        console.log('已移除之前添加的錯誤代碼');
    }
}

// 在 exports.default = router 之前，使用正確的方式添加路由
const changePasswordRoute = `
// POST /auth/change-password - 修改密碼
router.post("/change-password", (0, exports_1.authenticateToken), async (req, res) => {
    try {
        const db = req.db;
        const { userId, currentPassword, newPassword } = req.body;
        const currentUser = req.user;

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
        res.status(500).json({ success: false, message: "伺服器錯誤: " + error.message });
    }
});
`;

// 檢查是否已經有這個路由
if (!content.includes('"/change-password"')) {
    // 找到 authenticateToken 的引用方式
    let authMiddleware = 'authenticateToken';
    if (content.includes('(0, auth_1.authenticateToken)')) {
        authMiddleware = '(0, auth_1.authenticateToken)';
    } else if (content.includes('(0, exports_1.authenticateToken)')) {
        authMiddleware = '(0, exports_1.authenticateToken)';
    } else if (content.includes('authenticateToken')) {
        // 找到實際使用的方式
        const match = content.match(/router\.\w+\([^,]+,\s*(\([^)]+\)|[^,\s]+),/);
        if (match) {
            authMiddleware = match[1];
        }
    }
    
    console.log('使用的認證中間件:', authMiddleware);
    
    // 替換路由中的認證中間件
    const routeWithCorrectAuth = changePasswordRoute.replace(
        '(0, exports_1.authenticateToken)',
        authMiddleware
    );
    
    // 在 exports.default 之前添加
    if (content.includes('exports.default = router;')) {
        content = content.replace(
            'exports.default = router;',
            routeWithCorrectAuth + '\nexports.default = router;'
        );
    } else if (content.includes('module.exports')) {
        content = content.replace(
            /module\.exports\s*=/,
            routeWithCorrectAuth + '\nmodule.exports ='
        );
    } else {
        content += routeWithCorrectAuth;
    }
    
    fs.writeFileSync(filePath, content);
    console.log('✓ 已添加修改密碼端點');
} else {
    console.log('修改密碼端點已存在');
}
