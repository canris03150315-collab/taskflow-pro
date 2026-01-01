#!/bin/bash
echo "=== 恢復到工作版本 ==="

# 1. 先執行 fix-backend.sh 的內容 (修復 chat 路由)
echo "步驟 1: 修復 chat 路由..."

# 2. 修復 permissions 查詢
echo "步驟 2: 修復 permissions 查詢..."
docker exec taskflow-pro sed -i 's/SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users/SELECT id, name, role, department, avatar, username, created_at, updated_at, permissions FROM users/g' /app/dist/routes/users.js

# 3. 修復 isAdmin 判斷 (加入 SUPERVISOR)
echo "步驟 3: 修復 isAdmin 判斷..."
docker exec taskflow-pro sed -i 's/const isAdmin = currentUser.role === types_1.Role.BOSS || currentUser.role === types_1.Role.MANAGER;/const isAdmin = currentUser.role === types_1.Role.BOSS || currentUser.role === types_1.Role.MANAGER || currentUser.role === types_1.Role.SUPERVISOR;/g' /app/dist/routes/users.js

# 4. 重啟容器
echo "步驟 4: 重啟容器..."
docker restart taskflow-pro

sleep 3

echo "=== 完成 ==="
echo "請測試登入功能"
