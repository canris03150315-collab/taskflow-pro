#!/bin/bash
echo "=== 修復權限查詢問題 ==="

# 修改 GET /users 的 SQL 查詢，加入 permissions 欄位
docker exec taskflow-pro sed -i "s/SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users/SELECT id, name, role, department, avatar, username, created_at, updated_at, permissions FROM users/g" /app/dist/routes/users.js

echo "✓ 已修復 GET /users 查詢"

# 重啟容器
docker restart taskflow-pro
sleep 3

echo "=== 完成 ==="
echo "現在權限應該可以正常顯示了"

# 驗證
echo ""
echo "驗證修改："
docker exec taskflow-pro grep "SELECT id, name, role" /app/dist/routes/users.js | head -2
