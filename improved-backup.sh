#!/bin/bash

# TaskFlow Pro 改善版備份腳本 v3
# 功能：使用 SQLite BACKUP API 進行安全備份，並驗證備份完整性

# 配置
BACKUP_DIR="/root/taskflow-backups"
DATA_DIR="/root/taskflow-data"
DB_FILE="taskflow.db"
CONTAINER_NAME="taskflow-pro"
KEEP_DAYS=7

# 創建備份目錄
mkdir -p "$BACKUP_DIR"

# 生成備份檔名
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/taskflow_backup_$TIMESTAMP.db"
TEMP_BACKUP="/tmp/taskflow_backup_temp_$TIMESTAMP.db"

echo "=========================================="
echo "TaskFlow Pro 資料庫備份 (改善版)"
echo "時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 檢查容器是否運行
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ 錯誤: 容器 $CONTAINER_NAME 未運行"
    exit 1
fi

# 方法1: 使用 SQLite BACKUP API (最安全的方法)
echo "📦 正在使用 SQLite BACKUP API 備份資料庫..."

# 創建備份腳本
cat > /tmp/sqlite_backup_$TIMESTAMP.js << 'EOF'
const Database = require('better-sqlite3');
const fs = require('fs');

const sourceDb = process.argv[2];
const targetDb = process.argv[3];

console.log('開始備份...');
console.log('來源:', sourceDb);
console.log('目標:', targetDb);

try {
  // 開啟來源資料庫
  const source = new Database(sourceDb, { readonly: true });
  
  // 使用 backup API
  const backup = source.backup(targetDb);
  
  // 執行備份
  let remaining = -1;
  while (remaining !== 0) {
    backup.step(100);
    remaining = backup.remainingPages;
  }
  
  backup.close();
  source.close();
  
  console.log('✅ 備份完成');
  process.exit(0);
} catch (error) {
  console.error('❌ 備份失敗:', error.message);
  process.exit(1);
}
EOF

# 執行備份
docker cp /tmp/sqlite_backup_$TIMESTAMP.js $CONTAINER_NAME:/tmp/sqlite_backup.js
docker exec $CONTAINER_NAME node /tmp/sqlite_backup.js /app/data/$DB_FILE $TEMP_BACKUP

if [ $? -ne 0 ]; then
    echo "❌ 備份失敗"
    rm -f /tmp/sqlite_backup_$TIMESTAMP.js
    exit 1
fi

# 從容器複製備份到主機
docker cp $CONTAINER_NAME:$TEMP_BACKUP $BACKUP_FILE

# 清理容器內的臨時文件
docker exec $CONTAINER_NAME rm -f $TEMP_BACKUP /tmp/sqlite_backup.js
rm -f /tmp/sqlite_backup_$TIMESTAMP.js

# 驗證備份
echo "🔍 驗證備份完整性..."

# 創建驗證腳本
cat > /tmp/verify_backup_$TIMESTAMP.js << 'EOF'
const Database = require('better-sqlite3');

const dbFile = process.argv[2];

try {
  const db = new Database(dbFile, { readonly: true });
  
  // 檢查資料庫完整性
  const integrity = db.pragma('integrity_check');
  
  if (integrity[0].integrity_check !== 'ok') {
    console.error('❌ 資料庫完整性檢查失敗');
    process.exit(1);
  }
  
  // 檢查關鍵表
  const tables = ['users', 'work_logs', 'reports', 'announcements', 'tasks', 'attendance_records'];
  for (const table of tables) {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    console.log(`  ${table}: ${count.count} 筆`);
  }
  
  db.close();
  console.log('✅ 備份驗證通過');
  process.exit(0);
} catch (error) {
  console.error('❌ 驗證失敗:', error.message);
  process.exit(1);
}
EOF

# 複製驗證腳本到容器
docker cp /tmp/verify_backup_$TIMESTAMP.js $CONTAINER_NAME:/tmp/verify_backup.js
docker cp $BACKUP_FILE $CONTAINER_NAME:/tmp/verify_db.db

# 執行驗證
docker exec $CONTAINER_NAME node /tmp/verify_backup.js /tmp/verify_db.db

if [ $? -ne 0 ]; then
    echo "❌ 備份驗證失敗，刪除損壞的備份"
    rm -f $BACKUP_FILE
    docker exec $CONTAINER_NAME rm -f /tmp/verify_backup.js /tmp/verify_db.db
    rm -f /tmp/verify_backup_$TIMESTAMP.js
    exit 1
fi

# 清理驗證文件
docker exec $CONTAINER_NAME rm -f /tmp/verify_backup.js /tmp/verify_db.db
rm -f /tmp/verify_backup_$TIMESTAMP.js

# 檢查備份是否成功
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ 備份成功: $BACKUP_FILE ($BACKUP_SIZE)"
    
    # 刪除超過保留天數的舊備份
    echo "🗑️  清理舊備份（保留最近 $KEEP_DAYS 天）..."
    find "$BACKUP_DIR" -name "taskflow_backup_*.db" -type f -mtime +$KEEP_DAYS -delete
    
    # 統計備份數量
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/taskflow_backup_*.db 2>/dev/null | wc -l)
    echo "📊 總共 $BACKUP_COUNT 個備份檔案"
    
    # 創建最新備份的符號連結
    ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest.db"
    echo "🔗 最新備份連結: $BACKUP_DIR/latest.db"
else
    echo "❌ 備份失敗"
    exit 1
fi

echo "=========================================="
echo "✅ 備份完成並驗證"
echo "=========================================="
