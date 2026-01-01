#!/bin/bash
# 修復任務權限邏輯腳本

echo "=== 開始修復任務權限邏輯 ==="

# 備份當前的 tasks.js
docker exec taskflow-pro cp /app/dist/routes/tasks.js /app/dist/routes/tasks.js.backup
echo "✓ 已備份原始 tasks.js"

# 修復 1: 員工查詢邏輯 - 增加 created_by 條件
docker exec taskflow-pro sed -i "s/query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ?)';/query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)';/" /app/dist/routes/tasks.js

docker exec taskflow-pro sed -i "s/params.push(currentUser.id, currentUser.department);/params.push(currentUser.id, currentUser.department, currentUser.id);/" /app/dist/routes/tasks.js

echo "✓ 修復員工查詢邏輯"

# 修復 2: 主管查詢邏輯 - 增加 assigned_to_department 條件
docker exec taskflow-pro sed -i "s/query += ' AND (t.target_department = ? OR t.created_by = ?)';/query += ' AND (t.target_department = ? OR t.assigned_to_department = ? OR t.created_by = ?)';/" /app/dist/routes/tasks.js

# 找到主管的 params.push 並修改（第二個出現的）
docker exec taskflow-pro sed -i "0,/params.push(currentUser.department, currentUser.id);/! s/params.push(currentUser.department, currentUser.id);/params.push(currentUser.department, currentUser.department, currentUser.id);/" /app/dist/routes/tasks.js

echo "✓ 修復主管查詢邏輯"

# 修復 3: 接取任務邏輯 - 允許員工接取部門任務
docker exec taskflow-pro sed -i "s/(task.assigned_to_department === currentUser.department && currentUser.role === types_1.Role.SUPERVISOR);/(task.assigned_to_department === currentUser.department);/" /app/dist/routes/tasks.js

echo "✓ 修復接取任務邏輯"

# 修復 4: 同步修復 countQuery 中的員工邏輯
docker exec taskflow-pro sed -i "s/countQuery += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ?)';/countQuery += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)';/" /app/dist/routes/tasks.js

docker exec taskflow-pro sed -i "s/countParams.push(currentUser.id, currentUser.department);/countParams.push(currentUser.id, currentUser.department, currentUser.id);/" /app/dist/routes/tasks.js

echo "✓ 修復員工計數查詢邏輯"

# 修復 5: 同步修復 countQuery 中的主管邏輯
docker exec taskflow-pro sed -i "s/countQuery += ' AND (t.target_department = ? OR t.created_by = ?)';/countQuery += ' AND (t.target_department = ? OR t.assigned_to_department = ? OR t.created_by = ?)';/" /app/dist/routes/tasks.js

docker exec taskflow-pro sed -i "0,/countParams.push(currentUser.department, currentUser.id);/! s/countParams.push(currentUser.department, currentUser.id);/countParams.push(currentUser.department, currentUser.department, currentUser.id);/" /app/dist/routes/tasks.js

echo "✓ 修復主管計數查詢邏輯"

# 重啟容器
echo "正在重啟容器..."
docker restart taskflow-pro

sleep 10

# 檢查容器狀態
if docker ps | grep -q taskflow-pro; then
    echo "✓ 容器重啟成功"
    echo ""
    echo "=== 查看最新日誌 ==="
    docker logs taskflow-pro --tail 20
else
    echo "✗ 容器重啟失敗"
    exit 1
fi

echo ""
echo "=== 修復完成 ==="
echo "已修復的問題："
echo "1. ✓ 員工可以看到自己創建的任務"
echo "2. ✓ 主管可以看到分配給自己部門的任務"
echo "3. ✓ 員工可以接取分配給自己部門的任務"
echo "4. ✓ 同步修復了任務計數查詢邏輯"
