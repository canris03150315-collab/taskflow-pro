#!/bin/bash

# TaskFlow Pro 健康檢查腳本
# 檢查所有服務是否正常運行

echo "🔍 TaskFlow Pro 系統健康檢查"
echo "================================"

# 檢查 Docker 容器狀態
echo "📦 檢查 Docker 容器..."
containers=("taskflow-postgres" "taskflow-backend" "taskflow-frontend")

for container in "${containers[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "$container"; then
        echo "✅ $container - 運行中"
    else
        echo "❌ $container - 未運行"
    fi
done

echo ""

# 檢查端口連接
echo "🌐 檢查端口連接..."
ports=("5432:PostgreSQL" "5000:Backend API" "3000:Frontend")

for port_info in "${ports[@]}"; do
    port=$(echo $port_info | cut -d: -f1)
    service=$(echo $port_info | cut -d: -f2)
    
    if netstat -tuln | grep -q ":$port "; then
        echo "✅ $service (端口 $port) - 可連接"
    else
        echo "❌ $service (端口 $port) - 無法連接"
    fi
done

echo ""

# 檢查資料庫連接
echo "🗄️ 檢查資料庫連接..."
if docker exec taskflow-postgres pg_isready -U taskflow_user >/dev/null 2>&1; then
    echo "✅ PostgreSQL - 連接正常"
else
    echo "❌ PostgreSQL - 連接失敗"
fi

# 檢查後端 API
echo "🔌 檢查後端 API..."
if curl -s http://localhost:5000/api/users >/dev/null 2>&1; then
    echo "✅ Backend API - 響應正常"
else
    echo "❌ Backend API - 無響應"
fi

# 檢查前端服務
echo "🖥️ 檢查前端服務..."
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend - 運行正常"
else
    echo "❌ Frontend - 無響應"
fi

echo ""

# 檢查磁碟空間
echo "💾 檢查磁碟空間..."
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $disk_usage -lt 80 ]; then
    echo "✅ 磁碟空間 - 使用率 $disk_usage%"
else
    echo "⚠️ 磁碟空間 - 使用率 $disk_usage% (建議清理)"
fi

echo ""
echo "🏁 健康檢查完成"
echo "如需重啟服務，請執行: docker-compose restart"
