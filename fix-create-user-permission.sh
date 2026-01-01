#!/bin/bash
echo "=== 修復建立用戶權限問題 ==="

# 修改 POST /api/users 的權限檢查，改用自訂的權限檢查
docker exec taskflow-pro sed -i "s/router.post('\/', auth_1.authenticateToken, (0, auth_1.requireRole)(\[types_1.Role.BOSS, types_1.Role.MANAGER\]), async (req, res) => {/router.post('\/', auth_1.authenticateToken, async (req, res) => {\n    \/\/ 檢查權限：BOSS, MANAGER, SUPERVISOR，或有 MANAGE_USERS 權限的人\n    const currentUser = req.user;\n    const isAdmin = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER' || currentUser.role === 'SUPERVISOR';\n    const hasManagePermission = currentUser.permissions \&\& (Array.isArray(currentUser.permissions) ? currentUser.permissions.includes('MANAGE_USERS') : JSON.parse(currentUser.permissions || '[]').includes('MANAGE_USERS'));\n    if (!isAdmin \&\& !hasManagePermission) {\n        return res.status(403).json({ error: '無權建立用戶' });\n    }/g" /app/dist/routes/users.js

echo "✓ 已修改建立用戶權限檢查"

# 重啟容器
docker restart taskflow-pro
sleep 3

echo "=== 完成 ==="
echo "現在有 MANAGE_USERS 權限的員工也可以新增人員了"
