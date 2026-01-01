#!/bin/bash
# 修復 types/index.js 中的 TaskStatus 定義以匹配資料庫 CHECK 約束
docker cp taskflow-pro:/app/dist/types/index.js /tmp/types_index.js

# 修改 TaskStatus 定義
sed -i 's/TaskStatus\["OPEN"\] = "OPEN"/TaskStatus["OPEN"] = "Open"/' /tmp/types_index.js
sed -i 's/TaskStatus\["ASSIGNED"\] = "ASSIGNED"/TaskStatus["ASSIGNED"] = "Assigned"/' /tmp/types_index.js
sed -i 's/TaskStatus\["IN_PROGRESS"\] = "IN_PROGRESS"/TaskStatus["IN_PROGRESS"] = "In Progress"/' /tmp/types_index.js
sed -i 's/TaskStatus\["COMPLETED"\] = "COMPLETED"/TaskStatus["COMPLETED"] = "Completed"/' /tmp/types_index.js
sed -i 's/TaskStatus\["CANCELLED"\] = "CANCELLED"/TaskStatus["CANCELLED"] = "Cancelled"/' /tmp/types_index.js

# 複製回容器並重啟
docker cp /tmp/types_index.js taskflow-pro:/app/dist/types/index.js
docker restart taskflow-pro
sleep 5
docker logs taskflow-pro --tail 20
