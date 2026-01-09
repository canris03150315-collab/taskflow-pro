# 資料庫自動備份頻率更新

**日期**: 2026-01-09  
**更新者**: AI Assistant  
**狀態**: ✅ 已完成

---

## 📋 變更內容

### 修改前
- **備份頻率**: 每天 1 次
- **備份時間**: 凌晨 02:00 (UTC)
- **Cron 配置**: `0 2 * * *`

### 修改後
- **備份頻率**: 每天 4 次
- **備份時間**: 
  - 00:00 (午夜 12 點)
  - 06:00 (早上 6 點)
  - 12:00 (中午 12 點)
  - 18:00 (下午 6 點)
- **Cron 配置**:
  ```cron
  0 0 * * * /root/backup-taskflow.sh >> /var/log/taskflow-backup.log 2>&1
  0 6 * * * /root/backup-taskflow.sh >> /var/log/taskflow-backup.log 2>&1
  0 12 * * * /root/backup-taskflow.sh >> /var/log/taskflow-backup.log 2>&1
  0 18 * * * /root/backup-taskflow.sh >> /var/log/taskflow-backup.log 2>&1
  ```

---

## 🎯 變更原因

用戶要求提高備份頻率，從每天一次改為每天四次，以提供更好的數據保護和更小的數據丟失風險窗口。

---

## 🔧 實施步驟

### 1. 檢查當前配置
```bash
ssh root@165.227.147.40 "crontab -l"
```

**結果**：
```
0 2 * * * /root/backup-taskflow.sh >> /var/log/taskflow-backup.log 2>&1
0 3 * * * /root/run-chat-cleanup.sh >> /var/log/chat-cleanup.log 2>&1
```

### 2. 更新 Cron 配置
```bash
ssh root@165.227.147.40 "cat > /tmp/new_cron << 'EOF'
# Database backup - 4 times daily (00:00, 06:00, 12:00, 18:00)
0 0 * * * /root/backup-taskflow.sh >> /var/log/taskflow-backup.log 2>&1
0 6 * * * /root/backup-taskflow.sh >> /var/log/taskflow-backup.log 2>&1
0 12 * * * /root/backup-taskflow.sh >> /var/log/taskflow-backup.log 2>&1
0 18 * * * /root/backup-taskflow.sh >> /var/log/taskflow-backup.log 2>&1

# Chat cleanup - daily at 03:00
0 3 * * * /root/run-chat-cleanup.sh >> /var/log/chat-cleanup.log 2>&1
EOF
crontab /tmp/new_cron"
```

### 3. 驗證配置
```bash
ssh root@165.227.147.40 "crontab -l"
```

**結果**: ✅ 配置已成功更新

---

## 📊 備份時間表（台灣時間 UTC+8）

| UTC 時間 | 台灣時間 | 說明 |
|---------|---------|------|
| 00:00 | 08:00 | 早上上班前 |
| 06:00 | 14:00 | 下午工作中 |
| 12:00 | 20:00 | 晚上下班後 |
| 18:00 | 02:00 | 凌晨（次日） |

---

## 💾 備份位置

- **備份目錄**: `/root/taskflow-backups/`
- **備份腳本**: `/root/backup-taskflow.sh`
- **日誌文件**: `/var/log/taskflow-backup.log`

---

## 📈 預期效果

### 優點
1. **更頻繁的備份**: 從每天 1 次增加到 4 次
2. **更小的數據丟失風險**: 最多丟失 6 小時的數據（vs 之前的 24 小時）
3. **更好的恢復點**: 每 6 小時一個恢復點

### 注意事項
1. **磁碟空間**: 備份文件數量會增加 4 倍
2. **建議清理策略**: 保留最近 7 天的備份（28 個備份文件）
3. **監控**: 定期檢查磁碟空間使用情況

---

## 🔍 驗證方法

### 檢查 Cron 配置
```bash
ssh root@165.227.147.40 "crontab -l"
```

### 檢查備份文件
```bash
ssh root@165.227.147.40 "ls -lh /root/taskflow-backups/ | tail -10"
```

### 檢查備份日誌
```bash
ssh root@165.227.147.40 "tail -20 /var/log/taskflow-backup.log"
```

---

## 📝 清理舊備份（建議）

為了避免磁碟空間不足，建議定期清理舊備份：

```bash
# 保留最近 7 天的備份
ssh root@165.227.147.40 "cd /root/taskflow-backups && find . -name '*.db' -mtime +7 -delete"
```

或者添加到 cron 中自動清理：
```cron
# Clean old backups - weekly on Sunday at 04:00
0 4 * * 0 find /root/taskflow-backups -name '*.db' -mtime +7 -delete >> /var/log/backup-cleanup.log 2>&1
```

---

## ✅ 完成確認

- [x] Cron 配置已更新
- [x] 配置已驗證
- [x] 文檔已更新
- [x] 備份時間表已確認

---

**更新時間**: 2026-01-09 16:40  
**狀態**: ✅ 已生效
