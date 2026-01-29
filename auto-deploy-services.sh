#!/bin/bash

# 全自動化服務層部署腳本
# 功能：創建服務層 → 測試 → 成功則提交，失敗則回退

set -e  # 遇到錯誤立即退出

VERSION="v8.9.183-service-layer"
CURRENT_VERSION="v8.9.182"

echo "=========================================="
echo "全自動化服務層部署"
echo "時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 步驟 1：創建快照（回退點）
echo ""
echo "步驟 1：創建快照（回退點）..."
/root/create-complete-snapshot.sh ${CURRENT_VERSION}-before-service-layer
if [ $? -ne 0 ]; then
    echo "❌ 快照創建失敗"
    exit 1
fi
echo "✅ 快照已創建"

# 步驟 2：記錄當前映像
echo ""
echo "步驟 2：記錄當前映像..."
CURRENT_IMAGE=$(docker images taskflow-pro --format "{{.Repository}}:{{.Tag}}" | head -1)
echo "當前映像: $CURRENT_IMAGE"

# 步驟 3：上傳並執行服務層創建腳本
echo ""
echo "步驟 3：創建服務層..."
docker cp /tmp/auto-implement-services.js taskflow-pro:/app/auto-implement-services.js
docker exec -w /app taskflow-pro node auto-implement-services.js

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ 服務層創建失敗"
    echo "系統未修改，無需回退"
    exit 1
fi

echo "✅ 服務層創建成功"

# 步驟 4：測試現有功能
echo ""
echo "步驟 4：測試現有功能..."
echo "測試容器狀態..."
if ! docker ps | grep -q taskflow-pro; then
    echo "❌ 容器未運行"
    echo "正在回退..."
    docker stop taskflow-pro 2>/dev/null || true
    docker rm taskflow-pro 2>/dev/null || true
    docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 -e PORT=3000 -v /root/taskflow-data:/app/data $CURRENT_IMAGE
    echo "✅ 已回退到: $CURRENT_IMAGE"
    exit 1
fi

echo "測試資料庫連接..."
docker exec taskflow-pro sqlite3 /app/data/taskflow.db "SELECT COUNT(*) FROM users;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ 資料庫連接失敗"
    echo "正在回退..."
    docker stop taskflow-pro
    docker rm taskflow-pro
    docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 -e PORT=3000 -v /root/taskflow-data:/app/data $CURRENT_IMAGE
    echo "✅ 已回退到: $CURRENT_IMAGE"
    exit 1
fi

echo "✅ 所有測試通過"

# 步驟 5：提交新映像
echo ""
echo "步驟 5：提交新映像..."
docker commit taskflow-pro taskflow-pro:$VERSION
if [ $? -ne 0 ]; then
    echo "❌ 映像提交失敗"
    exit 1
fi
echo "✅ 新映像已創建: taskflow-pro:$VERSION"

# 步驟 6：重啟容器
echo ""
echo "步驟 6：重啟容器..."
docker restart taskflow-pro
sleep 5

# 步驟 7：驗證重啟後功能
echo ""
echo "步驟 7：驗證重啟後功能..."
docker exec taskflow-pro sqlite3 /app/data/taskflow.db "SELECT COUNT(*) FROM users;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ 重啟後驗證失敗"
    echo "正在回退..."
    docker stop taskflow-pro
    docker rm taskflow-pro
    docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 -e PORT=3000 -v /root/taskflow-data:/app/data $CURRENT_IMAGE
    echo "✅ 已回退到: $CURRENT_IMAGE"
    exit 1
fi

echo "✅ 重啟後驗證通過"

# 步驟 8：創建新快照
echo ""
echo "步驟 8：創建新快照..."
/root/create-complete-snapshot.sh $VERSION
echo "✅ 新快照已創建"

# 步驟 9：更新版本記錄
echo ""
echo "步驟 9：更新版本記錄..."
cat >> /root/version-history.txt << EOF
========================================
版本: $VERSION
日期: $(date '+%Y-%m-%d %H:%M:%S')
快照: complete-$VERSION-*.tar.gz
後端映像: taskflow-pro:$VERSION
前端 Deploy ID: [無需修改]
修改內容: 引入服務層架構（UserService, AttendanceService, WorkLogService）
狀態: ✅ 自動部署成功
========================================

EOF

echo "✅ 版本記錄已更新"

# 完成
echo ""
echo "=========================================="
echo "✅ 服務層部署成功"
echo "=========================================="
echo ""
echo "部署摘要:"
echo "- 舊版本: $CURRENT_IMAGE"
echo "- 新版本: taskflow-pro:$VERSION"
echo "- 服務層: UserService, AttendanceService, WorkLogService"
echo "- 測試狀態: 全部通過"
echo ""
echo "下一步:"
echo "1. 測試前端功能是否正常"
echo "2. 觀察系統穩定性"
echo "3. 逐步重構 API 路由使用服務層"
echo ""
echo "如需回退:"
echo "docker stop taskflow-pro && docker rm taskflow-pro"
echo "docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 -e PORT=3000 -v /root/taskflow-data:/app/data $CURRENT_IMAGE"
echo "=========================================="
