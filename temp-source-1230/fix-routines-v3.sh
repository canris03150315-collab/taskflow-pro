#!/bin/bash
# 修復 routines API v3 - 使用 sqlite3 CLI

echo "=== 開始修復 routines API v3 ==="

# 1. 使用 sqlite3 添加欄位
echo "添加 is_daily 欄位..."
docker exec taskflow-pro sh -c 'sqlite3 /app/data/taskflow.db "ALTER TABLE routine_templates ADD COLUMN is_daily INTEGER DEFAULT 0;" 2>/dev/null || echo "欄位已存在或表不存在"'

# 2. 創建表（如果不存在）
echo "確保表存在..."
docker exec taskflow-pro sh -c 'sqlite3 /app/data/taskflow.db "CREATE TABLE IF NOT EXISTS routine_templates (id TEXT PRIMARY KEY, department_id TEXT NOT NULL, title TEXT NOT NULL, items TEXT DEFAULT \"[]\", last_updated TEXT, read_by TEXT DEFAULT \"[]\", is_daily INTEGER DEFAULT 0);"'
docker exec taskflow-pro sh -c 'sqlite3 /app/data/taskflow.db "CREATE TABLE IF NOT EXISTS routine_records (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, user_id TEXT NOT NULL, date TEXT NOT NULL, items TEXT DEFAULT \"[]\", completed_at TEXT);"'

# 3. 驗證表結構
echo "驗證表結構..."
docker exec taskflow-pro sh -c 'sqlite3 /app/data/taskflow.db ".schema routine_templates"'

# 4. 重啟容器
echo "重啟容器..."
docker restart taskflow-pro

sleep 3

# 5. 測試 API
echo "=== 測試 API ==="
curl -s http://localhost:3000/api/health | head -c 100
echo ""

echo "=== 修復完成 ==="
