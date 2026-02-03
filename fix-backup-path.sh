#!/bin/bash
# 修復備份系統路徑不一致問題

echo "=========================================="
echo "修復備份系統路徑"
echo "=========================================="

# 1. 創建新的備份目錄（在掛載點內）
BACKUP_DIR="/root/taskflow-data/backups"
mkdir -p "$BACKUP_DIR"
echo "✅ 創建備份目錄: $BACKUP_DIR"

# 2. 複製現有備份到新目錄
echo "📦 複製現有備份檔案..."
cp /root/taskflow-backups/taskflow_backup_*.db "$BACKUP_DIR/" 2>/dev/null
COPIED_COUNT=$(ls -1 "$BACKUP_DIR"/taskflow_backup_*.db 2>/dev/null | wc -l)
echo "✅ 已複製 $COPIED_COUNT 個備份檔案"

# 3. 更新備份腳本
echo "📝 更新備份腳本..."
cat > /root/backup-taskflow.sh << 'EOF'
#!/bin/bash
# TaskFlow Pro 自動備份腳本 v3
# 修復：備份到容器掛載目錄

# 配置
BACKUP_DIR="/root/taskflow-data/backups"
DATA_DIR="/root/taskflow-data"
DB_FILE="taskflow.db"
KEEP_DAYS=7

# 創建備份目錄
mkdir -p "$BACKUP_DIR"

# 生成備份檔名
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/taskflow_backup_$TIMESTAMP.db"

echo "=========================================="
echo "TaskFlow Pro 資料庫備份"
echo "時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 複製資料庫檔案
echo "📦 正在備份資料庫..."
cp "$DATA_DIR/$DB_FILE" "$BACKUP_FILE"

# 同時備份 WAL 和 SHM 檔案（如果存在）
if [ -f "$DATA_DIR/$DB_FILE-wal" ]; then
    cp "$DATA_DIR/$DB_FILE-wal" "$BACKUP_FILE-wal"
fi
if [ -f "$DATA_DIR/$DB_FILE-shm" ]; then
    cp "$DATA_DIR/$DB_FILE-shm" "$BACKUP_FILE-shm"
fi

# 檢查備份是否成功
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ 備份成功: $BACKUP_FILE ($BACKUP_SIZE)"

    # 刪除超過保留天數的舊備份
    echo "🗑️  清理舊備份（保留最近 $KEEP_DAYS 天）..."
    find "$BACKUP_DIR" -name "taskflow_backup_*.db*" -type f -mtime +$KEEP_DAYS -delete

    # 顯示當前備份列表
    echo ""
    echo "📋 當前備份列表:"
    ls -lh "$BACKUP_DIR" | grep "taskflow_backup_" | grep "\.db$" | awk '{print "  " $9 " (" $5 ", " $6 " " $7 ")"}'

    # 統計備份數量
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/taskflow_backup_*.db 2>/dev/null | wc -l)
    echo ""
    echo "📊 總共 $BACKUP_COUNT 個備份檔案"

    # 創建最新備份的符號連結
    ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest.db"
    echo "🔗 最新備份連結: $BACKUP_DIR/latest.db"

else
    echo "❌ 備份失敗"
    exit 1
fi

echo "=========================================="
echo "✅ 備份完成"
echo "=========================================="
EOF

chmod +x /root/backup-taskflow.sh
echo "✅ 備份腳本已更新"

# 4. 立即執行一次備份測試
echo ""
echo "🧪 測試新備份腳本..."
/root/backup-taskflow.sh

echo ""
echo "=========================================="
echo "✅ 修復完成"
echo "=========================================="
echo ""
echo "📝 變更摘要："
echo "  - 備份目錄: /root/taskflow-backups/ → /root/taskflow-data/backups/"
echo "  - 已複製 $COPIED_COUNT 個現有備份"
echo "  - 備份腳本已更新"
echo "  - crontab 設定無需修改（仍為每小時執行）"
echo ""
