#!/bin/bash
echo "=== 修復 Token 驗證端點 ==="

# 取得現有的 auth.js 結尾部分並加入 verify 端點
docker exec taskflow-pro sh -c 'cat >> /app/dist/routes/auth.js << '"'"'VERIFYEOF'"'"'

// Token 驗證路由 - 用於刷新頁面時驗證登入狀態
router.post("/verify", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "未提供認證 Token" });
    }

    const token = authHeader.substring(7);
    const db = req.db;

    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await db.get("SELECT * FROM users WHERE id = ?", [decoded.id]);

        if (!user) {
            return res.status(401).json({ error: "用戶不存在" });
        }

        res.json({
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
                avatar: user.avatar,
                username: user.username,
                permissions: user.permissions ? JSON.parse(user.permissions) : null
            }
        });
    } catch (error) {
        console.error("Token 驗證失敗:", error.message);
        return res.status(401).json({ error: "Token 無效或已過期" });
    }
});

VERIFYEOF'

echo "✓ verify 端點已添加"

# 重啟容器
docker restart taskflow-pro
sleep 3

echo "=== 完成 ==="
echo "現在刷新頁面後應該可以保持登入狀態"

# 驗證端點是否存在
echo ""
echo "驗證端點是否添加成功："
docker exec taskflow-pro grep -c "verify" /app/dist/routes/auth.js
