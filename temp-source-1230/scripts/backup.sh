#!/bin/bash

# TaskFlow Pro 自動備份腳本
# 使用方法: ./scripts/backup.sh

# 配置
BACKUP_DIR="./backups"
DB_NAME="taskflow_pro"
DB_USER="taskflow_user"
UPLOAD_DIR="./uploads"
RETENTION_DAYS=7

# 創建備份目錄
mkdir -p $BACKUP_DIR

# 生成時間戳
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "開始備份 TaskFlow Pro..."

# 1. 備份資料庫
echo "備份資料庫..."
docker exec taskflow-postgres pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/database_$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
    echo "✅ 資料庫備份完成"
else
    echo "❌ 資料庫備份失敗"
    exit 1
fi

# 2. 備份上傳檔案
echo "備份上傳檔案..."
tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" $UPLOAD_DIR

if [ $? -eq 0 ]; then
    echo "✅ 檔案備份完成"
else
    echo "❌ 檔案備份失敗"
    exit 1
fi

# 3. 清理舊備份
echo "清理 $RETENTION_DAYS 天前的備份..."
find $BACKUP_DIR -name "database_*.sql" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ 備份完成！"
echo "備份位置: $BACKUP_DIR"
echo "下次備份時間: $(date -d '+1 day' '+%Y-%m-%d %H:%M:%S')"
