#!/bin/bash
echo "=== 完整修復腳本 ==="
echo "此腳本包含過去 6 天所有成功的修復"

CONTAINER="taskflow-pro"

echo ""
echo "步驟 1: 修復 permissions 查詢 (users.js)"
docker exec $CONTAINER sed -i 's/SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users/SELECT id, name, role, department, avatar, username, created_at, updated_at, permissions FROM users/g' /app/dist/routes/users.js

echo "步驟 2: 修復 isAdmin 判斷 (加入 SUPERVISOR)"
docker exec $CONTAINER sed -i 's/const isAdmin = currentUser.role === types_1.Role.BOSS || currentUser.role === types_1.Role.MANAGER;/const isAdmin = currentUser.role === types_1.Role.BOSS || currentUser.role === types_1.Role.MANAGER || currentUser.role === types_1.Role.SUPERVISOR;/g' /app/dist/routes/users.js

echo "步驟 3: 修復 MANAGE_USERS 權限檢查"
docker exec $CONTAINER sed -i "s/(0, auth_1.requireRole)(\[types_1.Role.BOSS, types_1.Role.MANAGER\])/(0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER], 'MANAGE_USERS')/g" /app/dist/routes/users.js

echo "步驟 4: 添加報表刪除端點 (reports.js)"
docker exec $CONTAINER sh -c 'cat >> /app/dist/routes/reports.js << "EOF"

// DELETE /api/reports/:id - 刪除報表
router.delete("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const reportId = req.params.id;
        const currentUser = req.user;
        
        // 檢查報表是否存在
        const report = await db.get("SELECT * FROM reports WHERE id = ?", [reportId]);
        if (!report) {
            return res.status(404).json({ error: "報表不存在" });
        }
        
        // 只有 BOSS、MANAGER 或報表建立者可以刪除
        const isAdmin = currentUser.role === "BOSS" || currentUser.role === "MANAGER";
        if (!isAdmin && report.user_id !== currentUser.id) {
            return res.status(403).json({ error: "無權刪除此報表" });
        }
        
        await db.run("DELETE FROM reports WHERE id = ?", [reportId]);
        res.json({ success: true, message: "報表已刪除" });
    } catch (error) {
        console.error("[Reports] 刪除報表錯誤:", error);
        res.status(500).json({ error: "刪除報表失敗" });
    }
});
EOF'

echo "步驟 5: 重啟容器應用修改"
docker restart $CONTAINER

echo ""
echo "等待容器啟動..."
sleep 5

echo ""
echo "驗證 API 狀態..."
docker exec $CONTAINER node -e "const http = require('http'); http.get('http://localhost:3000/api/health', (res) => { let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => console.log(data.slice(0, 50))); }).on('error', err => console.log('Error:', err.message));"
