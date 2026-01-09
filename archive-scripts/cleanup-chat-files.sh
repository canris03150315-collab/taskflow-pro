#!/bin/bash
# 聊天檔案清理腳本 - 刪除超過兩個月的圖片和檔案訊息
# 建議每天執行一次

SERVER="165.227.147.40"
CONTAINER="taskflow-pro"
DB_PATH="/app/data/taskflow.db"

# 計算兩個月前的日期 (ISO 格式)
TWO_MONTHS_AGO=$(date -d "2 months ago" +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -v-2m +%Y-%m-%dT%H:%M:%S)

echo "=== 聊天檔案清理腳本 ==="
echo "清理日期門檻: $TWO_MONTHS_AGO"

# 執行清理 SQL
ssh root@$SERVER << EOF
docker exec $CONTAINER sqlite3 $DB_PATH "
-- 統計將要刪除的訊息數量
SELECT '將刪除的圖片訊息數量: ' || COUNT(*) FROM chat_messages 
WHERE content LIKE '[IMG]%' AND created_at < '$TWO_MONTHS_AGO';

SELECT '將刪除的檔案訊息數量: ' || COUNT(*) FROM chat_messages 
WHERE content LIKE '[FILE]%' AND created_at < '$TWO_MONTHS_AGO';

-- 刪除超過兩個月的圖片訊息
DELETE FROM chat_messages 
WHERE content LIKE '[IMG]%' AND created_at < '$TWO_MONTHS_AGO';

-- 刪除超過兩個月的檔案訊息
DELETE FROM chat_messages 
WHERE content LIKE '[FILE]%' AND created_at < '$TWO_MONTHS_AGO';

-- 顯示剩餘的訊息統計
SELECT '剩餘圖片訊息: ' || COUNT(*) FROM chat_messages WHERE content LIKE '[IMG]%';
SELECT '剩餘檔案訊息: ' || COUNT(*) FROM chat_messages WHERE content LIKE '[FILE]%';

-- 清理資料庫碎片
VACUUM;
"
EOF

echo ""
echo "=== 清理完成 ==="
