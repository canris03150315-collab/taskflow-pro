# 備份系統改善方案

## 問題分析

### 當前備份系統的缺陷
1. **直接複製文件不安全**：使用 `cp` 命令可能在資料庫寫入時複製到不一致狀態
2. **備份頻率不足**：每 6 小時才備份一次，資料遺失風險高
3. **沒有驗證機制**：備份後不驗證完整性
4. **沒有實時備份**：重要操作後無法立即備份

## 改善方案

### 1. 使用 SQLite BACKUP API（最重要）

**為什麼重要**：
- SQLite BACKUP API 是官方推薦的備份方法
- 即使資料庫正在使用也能安全備份
- 保證備份的一致性和完整性

**實施方法**：
創建使用 better-sqlite3 的 backup() API 的備份腳本

### 2. 增加備份頻率

**改善**：
- 從每 6 小時改為每 2 小時
- 或每 1 小時（根據需求）

**Crontab 設定**：
```bash
# 每 2 小時備份
0 */2 * * * /root/improved-backup.sh >> /var/log/taskflow-backup.log 2>&1

# 或每 1 小時備份
0 * * * * /root/improved-backup.sh >> /var/log/taskflow-backup.log 2>&1
```

### 3. 添加備份驗證

**驗證步驟**：
1. 檢查 SQLite 完整性（PRAGMA integrity_check）
2. 驗證關鍵表的記錄數
3. 確認備份文件大小合理

### 4. 實時備份觸發器

**觸發時機**：
- 工作報表提交後
- 重要公告發布後
- 關鍵資料修改後

**實施方法**：
在後端 API 成功寫入資料後調用備份腳本

### 5. 備份監控和告警

**監控內容**：
- 最新備份時間
- 備份數量
- 備份文件大小
- 備份完整性

## 實施步驟

### 步驟 1：創建改善版備份腳本

使用 Node.js 腳本調用 SQLite BACKUP API：

```javascript
const Database = require('better-sqlite3');

// 開啟來源資料庫（只讀）
const source = new Database('/app/data/taskflow.db', { readonly: true });

// 執行備份
const backup = source.backup('/tmp/backup.db');

// 逐步備份（每次 100 頁）
let remaining = -1;
while (remaining !== 0) {
  backup.step(100);
  remaining = backup.remainingPages;
}

backup.close();
source.close();
```

### 步驟 2：添加驗證機制

```javascript
const db = new Database('/tmp/backup.db', { readonly: true });

// 完整性檢查
const integrity = db.pragma('integrity_check');
if (integrity[0].integrity_check !== 'ok') {
  throw new Error('備份完整性檢查失敗');
}

// 驗證關鍵表
const tables = ['users', 'work_logs', 'reports', 'announcements'];
for (const table of tables) {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
  console.log(`${table}: ${count.count} 筆`);
}

db.close();
```

### 步驟 3：更新 Crontab

```bash
# 備份現有 crontab
crontab -l > /tmp/crontab_backup.txt

# 更新為每 2 小時備份
crontab -e
# 修改為：0 */2 * * * /root/improved-backup.sh >> /var/log/taskflow-backup.log 2>&1
```

### 步驟 4：創建實時備份觸發器

```bash
#!/bin/bash
# /root/trigger-backup.sh
echo "觸發立即備份..."
/root/improved-backup.sh
```

### 步驟 5：添加備份健康檢查

```bash
#!/bin/bash
# /root/check-backup-health.sh

LATEST_BACKUP=$(ls -t /root/taskflow-backups/taskflow_backup_*.db | head -1)
BACKUP_TIME=$(stat -c %Y "$LATEST_BACKUP")
CURRENT_TIME=$(date +%s)
HOURS_DIFF=$(( (CURRENT_TIME - BACKUP_TIME) / 3600 ))

if [ $HOURS_DIFF -gt 3 ]; then
  echo "⚠️ 警告: 最新備份超過 3 小時"
  /root/trigger-backup.sh
fi
```

## 額外建議

### 1. 異地備份

**建議**：
- 將備份同步到其他伺服器
- 使用 rsync 或 rclone 同步到雲端儲存

```bash
# 同步到遠端伺服器
rsync -avz /root/taskflow-backups/ user@backup-server:/backups/taskflow/

# 或同步到 S3/Google Cloud Storage
rclone sync /root/taskflow-backups/ remote:taskflow-backups/
```

### 2. 保留更多備份

**建議**：
- 保留最近 7 天的所有備份
- 保留最近 4 週的每週備份
- 保留最近 12 個月的每月備份

### 3. 備份加密

**建議**：
對敏感資料進行加密備份

```bash
# 加密備份
gpg --encrypt --recipient your-email@example.com backup.db
```

### 4. 資料庫 WAL 模式

**建議**：
啟用 SQLite 的 WAL (Write-Ahead Logging) 模式

```sql
PRAGMA journal_mode=WAL;
```

**優點**：
- 提高併發性能
- 更安全的備份
- 減少資料庫鎖定

## 立即可執行的改善

### 最小改善（立即可做）

1. **增加備份頻率**：從 6 小時改為 2 小時
2. **添加備份驗證**：備份後檢查完整性
3. **創建手動備份腳本**：重要操作後立即執行

### 完整改善（建議實施）

1. 使用 SQLite BACKUP API
2. 每 1-2 小時自動備份
3. 備份後自動驗證
4. 實時備份觸發器
5. 備份監控和告警
6. 異地備份

## 測試計劃

### 測試項目

1. **備份功能測試**
   - 執行備份腳本
   - 驗證備份文件
   - 確認資料完整性

2. **恢復測試**
   - 從備份恢復資料庫
   - 驗證資料完整性
   - 確認應用程式正常運作

3. **壓力測試**
   - 在高負載下執行備份
   - 確認不影響系統性能

4. **故障測試**
   - 模擬資料遺失
   - 測試恢復流程
   - 驗證恢復時間

## 預期效果

實施改善後：
- ✅ 備份更安全可靠
- ✅ 資料遺失風險降低 75%（從 6 小時降到 1-2 小時）
- ✅ 備份完整性有保證
- ✅ 可以立即觸發備份
- ✅ 有監控和告警機制

## 成本評估

- **時間成本**：2-4 小時實施
- **儲存成本**：備份頻率增加，需要更多儲存空間
- **性能影響**：每次備份約 1-2 秒，影響極小

## 結論

當前備份系統確實存在可靠性問題，建議立即實施以下改善：

1. **立即**：增加備份頻率到每 2 小時
2. **優先**：使用 SQLite BACKUP API
3. **重要**：添加備份驗證機制
4. **建議**：實施實時備份觸發器
5. **長期**：考慮異地備份和加密

這些改善將大幅提升備份系統的可靠性，減少資料遺失風險。
