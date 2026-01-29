#!/bin/bash

# 設置改善版備份系統

echo "=========================================="
echo "設置改善版備份系統"
echo "=========================================="

# 1. 上傳改善版備份腳本
echo "1. 上傳改善版備份腳本..."
chmod +x /root/improved-backup.sh

# 2. 測試新的備份腳本
echo "2. 測試新的備份腳本..."
/root/improved-backup.sh

if [ $? -ne 0 ]; then
    echo "❌ 備份腳本測試失敗"
    exit 1
fi

# 3. 更新 crontab，增加備份頻率（每 2 小時一次）
echo "3. 更新 crontab（每 2 小時備份一次）..."

# 備份現有 crontab
crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S).txt

# 創建新的 crontab
cat > /tmp/new_crontab.txt << 'EOF'
# Database backup - Every 2 hours (更頻繁的備份)
0 */2 * * * /root/improved-backup.sh >> /var/log/taskflow-backup.log 2>&1

# Chat cleanup - daily at 03:00
0 3 * * * /root/run-chat-cleanup.sh >> /var/log/chat-cleanup.log 2>&1
EOF

# 安裝新的 crontab
crontab /tmp/new_crontab.txt

echo "✅ Crontab 已更新"
crontab -l

# 4. 創建實時備份觸發腳本（用於重要操作後立即備份）
echo "4. 創建實時備份觸發腳本..."

cat > /root/trigger-backup.sh << 'EOF'
#!/bin/bash
# 觸發立即備份（用於重要操作後）
echo "觸發立即備份..."
/root/improved-backup.sh
EOF

chmod +x /root/trigger-backup.sh

echo "✅ 實時備份觸發器已創建: /root/trigger-backup.sh"

# 5. 創建備份監控腳本
echo "5. 創建備份監控腳本..."

cat > /root/check-backup-health.sh << 'EOF'
#!/bin/bash

echo "=========================================="
echo "備份系統健康檢查"
echo "時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

BACKUP_DIR="/root/taskflow-backups"
CURRENT_DB="/root/taskflow-data/taskflow.db"

# 檢查最新備份
LATEST_BACKUP=$(ls -t $BACKUP_DIR/taskflow_backup_*.db 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ 錯誤: 沒有找到任何備份"
    exit 1
fi

echo "最新備份: $LATEST_BACKUP"

# 檢查備份時間
BACKUP_TIME=$(stat -c %Y "$LATEST_BACKUP")
CURRENT_TIME=$(date +%s)
TIME_DIFF=$((CURRENT_TIME - BACKUP_TIME))
HOURS_DIFF=$((TIME_DIFF / 3600))

echo "備份時間: $(date -d @$BACKUP_TIME '+%Y-%m-%d %H:%M:%S')"
echo "距今: $HOURS_DIFF 小時"

if [ $HOURS_DIFF -gt 3 ]; then
    echo "⚠️  警告: 最新備份超過 3 小時"
fi

# 檢查備份數量
BACKUP_COUNT=$(ls -1 $BACKUP_DIR/taskflow_backup_*.db 2>/dev/null | wc -l)
echo "備份數量: $BACKUP_COUNT"

if [ $BACKUP_COUNT -lt 5 ]; then
    echo "⚠️  警告: 備份數量少於 5 個"
fi

# 檢查當前資料庫大小
CURRENT_SIZE=$(stat -c %s "$CURRENT_DB")
BACKUP_SIZE=$(stat -c %s "$LATEST_BACKUP")

echo "當前資料庫大小: $(numfmt --to=iec $CURRENT_SIZE)"
echo "最新備份大小: $(numfmt --to=iec $BACKUP_SIZE)"

SIZE_DIFF=$((CURRENT_SIZE - BACKUP_SIZE))
if [ $SIZE_DIFF -gt 1048576 ]; then
    echo "⚠️  警告: 當前資料庫比最新備份大 $(numfmt --to=iec $SIZE_DIFF)"
    echo "建議立即執行備份: /root/trigger-backup.sh"
fi

echo "=========================================="
echo "✅ 健康檢查完成"
echo "=========================================="
EOF

chmod +x /root/check-backup-health.sh

echo "✅ 備份監控腳本已創建: /root/check-backup-health.sh"

echo ""
echo "=========================================="
echo "✅ 改善版備份系統設置完成"
echo "=========================================="
echo ""
echo "改善內容："
echo "1. ✅ 使用 SQLite BACKUP API（更安全）"
echo "2. ✅ 備份後自動驗證完整性"
echo "3. ✅ 備份頻率從 6 小時改為 2 小時"
echo "4. ✅ 提供實時備份觸發器"
echo "5. ✅ 提供備份健康檢查工具"
echo ""
echo "使用方法："
echo "- 自動備份: 每 2 小時自動執行"
echo "- 手動備份: /root/improved-backup.sh"
echo "- 立即備份: /root/trigger-backup.sh"
echo "- 健康檢查: /root/check-backup-health.sh"
echo "=========================================="
