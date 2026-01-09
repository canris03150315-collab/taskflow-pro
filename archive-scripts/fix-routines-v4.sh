#!/bin/bash
# 修復 routines API v4 - 使用 app 內的 node_modules

echo "=== 開始修復 routines API v4 ==="

# 1. 創建修復腳本並在 app 目錄執行（這樣可以找到 node_modules）
docker exec taskflow-pro sh -c 'cat > /app/fix-db.js << EOF
const Database = require("better-sqlite3");
const db = new Database("/app/data/taskflow.db");

try {
  // 檢查表是否存在
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type=\"table\" AND name=\"routine_templates\"").get();
  
  if (tableExists) {
    // 檢查 is_daily 欄位是否存在
    const columns = db.prepare("PRAGMA table_info(routine_templates)").all();
    const hasIsDaily = columns.some(c => c.name === "is_daily");
    
    if (!hasIsDaily) {
      db.exec("ALTER TABLE routine_templates ADD COLUMN is_daily INTEGER DEFAULT 0");
      console.log("✓ 已添加 is_daily 欄位");
    } else {
      console.log("✓ is_daily 欄位已存在");
    }
  } else {
    // 創建表
    db.exec("CREATE TABLE routine_templates (id TEXT PRIMARY KEY, department_id TEXT NOT NULL, title TEXT NOT NULL, items TEXT DEFAULT \"[]\", last_updated TEXT, read_by TEXT DEFAULT \"[]\", is_daily INTEGER DEFAULT 0)");
    console.log("✓ 已創建 routine_templates 表");
  }
  
  // 創建 routine_records 表
  db.exec("CREATE TABLE IF NOT EXISTS routine_records (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, user_id TEXT NOT NULL, date TEXT NOT NULL, items TEXT DEFAULT \"[]\", completed_at TEXT)");
  console.log("✓ routine_records 表已就緒");
  
  // 顯示表結構
  const cols = db.prepare("PRAGMA table_info(routine_templates)").all();
  console.log("routine_templates 欄位:", cols.map(c => c.name).join(", "));
  
} catch (e) {
  console.error("錯誤:", e.message);
}

db.close();
EOF'

echo "執行資料庫修復..."
docker exec -w /app taskflow-pro node /app/fix-db.js

# 2. 重啟容器
echo "重啟容器..."
docker restart taskflow-pro

sleep 3

# 3. 測試 API
echo "=== 測試 API ==="
curl -s http://localhost:3000/api/health | head -c 150
echo ""

echo "=== 修復完成 ==="
