# TaskFlow Pro 功能更新部署指南

## 🎯 更新部署策略總覽

### 簡單更新（90% 情況）
- **代碼修改**：重新部署即可
- **配置更新**：重啟服務即可
- **時間**：5-10 分鐘完成

### 複雜更新（10% 情況）
- **資料庫結構變更**：需要遷移腳本
- **加密金鑰變更**：需要資料重新加密
- **時間**：30-60 分鐘完成

---

## 🚀 簡單更新流程（代碼修改）

### 方法 1：手動更新（推薦新手）
```bash
# 1. 連接到伺服器
ssh user@your-server-ip

# 2. 進入專案目錄
cd /path/to/taskflow-pro

# 3. 備份當前版本（可選但推薦）
cp -r server server-backup-$(date +%Y%m%d)

# 4. 拉取最新代碼
git pull origin main

# 5. 安裝新依賴（如果有）
npm install

# 6. 重新建置
npm run build

# 7. 重啟服務
pm2 restart taskflow-pro
# 或者
sudo systemctl restart taskflow-pro
```

### 方法 2：自動化腳本（推薦熟手）
```bash
# 創建更新腳本
nano deploy.sh
```

```bash
#!/bin/bash
# deploy.sh - 自動部署腳本

set -e  # 遇到錯誤立即停止

echo "🚀 開始部署 TaskFlow Pro..."

# 1. 備份資料庫
echo "📦 備份資料庫..."
cp ./data/taskflow.db ./data/taskflow.db.backup.$(date +%Y%m%d_%H%M%S)

# 2. 拉取最新代碼
echo "📥 拉取最新代碼..."
git pull origin main

# 3. 安裝依賴
echo "📦 安裝依賴..."
npm install

# 4. 建置專案
echo "🔨 建置專案..."
npm run build

# 5. 重啟服務
echo "🔄 重啟服務..."
pm2 restart taskflow-pro

# 6. 檢查服務狀態
echo "✅ 檢查服務狀態..."
pm2 status

echo "🎉 部署完成！"
```

```bash
# 設置執行權限
chmod +x deploy.sh

# 執行部署
./deploy.sh
```

---

## 🗄️ 資料庫遷移流程（結構變更）

### 遷移腳本結構
```
migrations/
├── 001_initial_schema.sql
├── 002_add_user_fields.sql
├── 003_add_task_priority.sql
└── migration_log.sql
```

### 遷移日誌表
```sql
-- migrations/migration_log.sql
CREATE TABLE IF NOT EXISTS migration_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version VARCHAR(10) NOT NULL UNIQUE,
    filename VARCHAR(100) NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 自動遷移腳本
```bash
#!/bin/bash
# migrate.sh - 資料庫遷移腳本

DB_PATH="./data/taskflow.db"
MIGRATIONS_DIR="./migrations"

echo "🗄️ 開始資料庫遷移..."

# 1. 檢查已應用的遷移
applied_migrations=$(sqlite3 "$DB_PATH" "SELECT version FROM migration_log ORDER BY version;")

# 2. 執行未應用的遷移
for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    filename=$(basename "$migration_file")
    version=$(echo "$filename" | cut -d'_' -f1)
    
    if [[ $applied_migrations != *"$version"* ]]; then
        echo "📝 應用遷移: $filename"
        sqlite3 "$DB_PATH" < "$migration_file"
        sqlite3 "$DB_PATH" "INSERT INTO migration_log (version, filename) VALUES ('$version', '$filename');"
        echo "✅ 遷移 $filename 完成"
    fi
done

echo "🎉 資料庫遷移完成！"
```

---

## 🔒 零停機更新（生產環境）

### 使用 PM2 的 Cluster 模式
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'taskflow-pro',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 零停機部署腳本
```bash
#!/bin/bash
# zero-downtime-deploy.sh

echo "🔄 開始零停機部署..."

# 1. 備份
cp -r server server-backup-$(date +%Y%m%d_%H%M%S)

# 2. 拉取代碼
git pull origin main

# 3. 建置新版本
npm install
npm run build

# 4. 零停機重啟
pm2 reload taskflow-pro

# 5. 驗證
sleep 10
curl -f http://localhost:3000/health || exit 1

echo "✅ 零停機部署完成！"
```

---

## 📋 版本控制最佳實踐

### Git 工作流程
```bash
# 1. 創建功能分支
git checkout -b feature/new-functionality

# 2. 開發和測試
# ... 開發過程 ...

# 3. 提交變更
git add .
git commit -m "feat: 添加新功能描述"

# 4. 推送到遠端
git push origin feature/new-functionality

# 5. 合併到主分支
git checkout main
git merge feature/new-functionality
git push origin main

# 6. 創建版本標籤
git tag -a v1.1.0 -m "版本 1.1.0：添加新功能"
git push origin v1.1.0
```

### 版本號規範
```
v1.0.0 - 主要版本（重大變更）
v1.1.0 - 次要版本（新功能）
v1.1.1 - 修補版本（錯誤修復）
```

---

## 🛠️ 實際部署範例

### 範例 1：添加新的 API 端點
```bash
# 1. 本地開發完成
git add .
git commit -m "feat: 添加報表統計 API"
git push origin main

# 2. 伺服器部署
ssh user@server
cd /path/to/taskflow-pro
./deploy.sh

# 3. 測試新功能
curl -X GET "https://your-domain.com/api/reports/stats"
```

### 範例 2：修改資料庫結構
```bash
# 1. 創建遷移腳本
nano migrations/004_add_report_table.sql

-- 004_add_report_table.sql
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

# 2. 提交變更
git add migrations/004_add_report_table.sql
git commit -m "feat: 添加報表表格"
git push origin main

# 3. 伺服器部署
ssh user@server
cd /path/to/taskflow-pro
./deploy.sh
./migrate.sh
pm2 restart taskflow-pro
```

---

## 🔍 更新前檢查清單

### ✅ 每次更新前檢查
- [ ] 代碼已提交到 Git
- [ ] 本地測試通過
- [ ] 準備回滾方案
- [ ] 備份資料庫
- [ ] 通知用戶維護時間（如需要）

### ✅ 更新後驗證
- [ ] 服務正常啟動
- [ ] 資料庫連接正常
- [ ] 核心功能測試
- [ ] API 端點響應正常
- [ ] 前端頁面載入正常

---

## 🚨 緊急回滾流程

### 快速回滾腳本
```bash
#!/bin/bash
# rollback.sh - 緊急回滾腳本

echo "🚨 開始緊急回滾..."

# 1. 恢復資料庫
LATEST_BACKUP=$(ls -t ./data/taskflow.db.backup.* | head -1)
cp "$LATEST_BACKUP" ./data/taskflow.db

# 2. 回滾代碼
git reset --hard HEAD~1

# 3. 重新建置
npm run build

# 4. 重啟服務
pm2 restart taskflow-pro

echo "✅ 緊急回滾完成！"
```

---

## 📞 技術支援

### 常見問題
1. **部署失敗**：檢查 Git 狀態和依賴安裝
2. **資料庫錯誤**：檢查遷移腳本和備份
3. **服務無法啟動**：檢查日誌和配置文件

### 聯絡方式
- 技術支援：提供錯誤日誌
- 緊急情況：執行回滾腳本

---

## 🎯 總結

**90% 的更新只需要簡單的重新部署**：
```bash
git pull && npm install && npm run build && pm2 restart
```

**10% 的複雜更新需要額外步驟**：
- 資料庫遷移
- 配置變更
- 金鑰更新

**關鍵是建立標準化的部署流程和自動化腳本！** 🚀
