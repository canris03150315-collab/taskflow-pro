#!/bin/sh
# 修復 TaskStatus 值不匹配的問題
# 資料庫期望: 'Open', 'Assigned', 'In Progress', 'Completed', 'Cancelled'
# 代碼使用: 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'

echo "=== 修復 TaskStatus 值 ==="

# 修改 types/index.js 中的 TaskStatus 定義
docker exec taskflow-pro sh -c 'cat > /tmp/fix-status.js << '"'"'EOF'"'"'
const fs = require("fs");

// 修復 types/index.js
const typesPath = "/app/dist/types/index.js";
let typesContent = fs.readFileSync(typesPath, "utf8");

// 替換 TaskStatus 值
typesContent = typesContent.replace(/TaskStatus\["OPEN"\] = "OPEN"/g, "TaskStatus[\"OPEN\"] = \"Open\"");
typesContent = typesContent.replace(/TaskStatus\["ASSIGNED"\] = "ASSIGNED"/g, "TaskStatus[\"ASSIGNED\"] = \"Assigned\"");
typesContent = typesContent.replace(/TaskStatus\["IN_PROGRESS"\] = "IN_PROGRESS"/g, "TaskStatus[\"IN_PROGRESS\"] = \"In Progress\"");
typesContent = typesContent.replace(/TaskStatus\["COMPLETED"\] = "COMPLETED"/g, "TaskStatus[\"COMPLETED\"] = \"Completed\"");
typesContent = typesContent.replace(/TaskStatus\["CANCELLED"\] = "CANCELLED"/g, "TaskStatus[\"CANCELLED\"] = \"Cancelled\"");

fs.writeFileSync(typesPath, typesContent);
console.log("已修復 types/index.js");

// 驗證
const newContent = fs.readFileSync(typesPath, "utf8");
const match = newContent.match(/TaskStatus\["OPEN"\] = "([^"]+)"/);
console.log("TaskStatus.OPEN 現在是:", match ? match[1] : "未找到");
EOF'

docker exec taskflow-pro node /tmp/fix-status.js

echo ""
echo "=== 重啟容器 ==="
docker restart taskflow-pro

sleep 3

echo ""
echo "=== 驗證修復 ==="
docker exec taskflow-pro grep 'TaskStatus\["OPEN"\]' /app/dist/types/index.js

echo ""
echo "=== 修復完成 ==="
