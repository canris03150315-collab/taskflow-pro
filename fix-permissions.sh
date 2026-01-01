#!/bin/bash
echo "=== 修復權限設定問題 ==="

# 備份原檔案
docker exec taskflow-pro cp /app/dist/routes/users.js /app/dist/routes/users.js.bak

# 修改 isAdmin 判斷，加入 SUPERVISOR
docker exec taskflow-pro sed -i 's/const isAdmin = currentUser.role === types_1.Role.BOSS || currentUser.role === types_1.Role.MANAGER;/const isAdmin = currentUser.role === types_1.Role.BOSS || currentUser.role === types_1.Role.MANAGER || currentUser.role === types_1.Role.SUPERVISOR;/' /app/dist/routes/users.js

echo "✓ 已將 SUPERVISOR 加入可編輯權限的角色"

# 重啟容器
docker restart taskflow-pro
sleep 3

echo "=== 完成 ==="
echo "現在 SUPERVISOR（主管）也可以修改員工的權限了"

# 驗證修改
echo ""
echo "驗證修改結果："
docker exec taskflow-pro grep "isAdmin" /app/dist/routes/users.js | head -2
