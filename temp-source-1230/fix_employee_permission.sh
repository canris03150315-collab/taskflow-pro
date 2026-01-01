#!/bin/bash
# 修復員工查詢任務權限

echo "=== 開始修復員工任務查詢權限 ==="

# 恢復備份
docker exec taskflow-pro cp /app/dist/routes/tasks.js.backup /app/dist/routes/tasks.js
echo "✓ 已恢復備份"

# 使用 awk 精確修改員工查詢邏輯
docker exec taskflow-pro awk '
/if \(currentUser\.role === types_1\.Role\.EMPLOYEE\)/ {
    print
    getline
    print
    getline
    print "            query += '"'"' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)'"'"';"
    getline
    print "            params.push(currentUser.id, currentUser.department, currentUser.id);"
    next
}
{ print }
' /app/dist/routes/tasks.js > /tmp/tasks_fixed.js

docker exec taskflow-pro cp /tmp/tasks_fixed.js /app/dist/routes/tasks.js
echo "✓ 修復員工查詢邏輯"

# 使用 awk 精確修改主管查詢邏輯
docker exec taskflow-pro awk '
/else if \(currentUser\.role === types_1\.Role\.SUPERVISOR\)/ {
    print
    getline
    print
    getline
    print "            query += '"'"' AND (t.target_department = ? OR t.assigned_to_department = ? OR t.created_by = ?)'"'"';"
    getline
    print "            params.push(currentUser.department, currentUser.department, currentUser.id);"
    next
}
{ print }
' /app/dist/routes/tasks.js > /tmp/tasks_fixed2.js

docker exec taskflow-pro cp /tmp/tasks_fixed2.js /app/dist/routes/tasks.js
echo "✓ 修復主管查詢邏輯"

# 修復接取任務邏輯
docker exec taskflow-pro sed -i 's/(task\.assigned_to_department === currentUser\.department && currentUser\.role === types_1\.Role\.SUPERVISOR);/(task.assigned_to_department === currentUser.department);/' /app/dist/routes/tasks.js
echo "✓ 修復接取任務邏輯"

# 同步修復 countQuery 的員工邏輯
docker exec taskflow-pro awk '
/countQuery \+= '"'"' AND \(t\.assigned_to_user_id = \? OR t\.assigned_to_department = \?\)'"'"';/ && !done1 {
    print "            countQuery += '"'"' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)'"'"';"
    done1=1
    getline
    print "            countParams.push(currentUser.id, currentUser.department, currentUser.id);"
    next
}
{ print }
' /app/dist/routes/tasks.js > /tmp/tasks_fixed3.js

docker exec taskflow-pro cp /tmp/tasks_fixed3.js /app/dist/routes/tasks.js
echo "✓ 修復員工計數查詢邏輯"

# 同步修復 countQuery 的主管邏輯
docker exec taskflow-pro awk '
/countQuery \+= '"'"' AND \(t\.target_department = \? OR t\.created_by = \?\)'"'"';/ && !done2 {
    print "            countQuery += '"'"' AND (t.target_department = ? OR t.assigned_to_department = ? OR t.created_by = ?)'"'"';"
    done2=1
    getline
    print "            countParams.push(currentUser.department, currentUser.department, currentUser.id);"
    next
}
{ print }
' /app/dist/routes/tasks.js > /tmp/tasks_fixed4.js

docker exec taskflow-pro cp /tmp/tasks_fixed4.js /app/dist/routes/tasks.js
echo "✓ 修復主管計數查詢邏輯"

# 重啟容器
echo "正在重啟容器..."
docker restart taskflow-pro
sleep 10

# 檢查容器狀態
if docker ps | grep -q taskflow-pro; then
    echo "✓ 容器重啟成功"
    echo ""
    echo "=== 驗證修改結果 ==="
    docker exec taskflow-pro grep -A 3 "currentUser.role === types_1.Role.EMPLOYEE" /app/dist/routes/tasks.js | head -10
else
    echo "✗ 容器重啟失敗"
    exit 1
fi

echo ""
echo "=== 修復完成 ==="
