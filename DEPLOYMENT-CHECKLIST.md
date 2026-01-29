# 部署檢查清單

每次修改系統時，請嚴格遵循此清單，避免恢復快照後缺失問題。

## 📋 修改前（必做）

### 1. 創建快照
```bash
ssh root@165.227.147.40 "/root/create-complete-snapshot.sh v當前版本-before-修改描述"
```

### 2. 記錄當前狀態
```bash
# 記錄當前後端版本
ssh root@165.227.147.40 "docker images | grep taskflow-pro | head -1"

# 記錄當前前端版本（從 Netlify 查看）
# Deploy ID: [從 Netlify 複製]
```

### 3. 確認系統正常
- [ ] 後端 API 正常
- [ ] 前端功能正常
- [ ] 資料庫正常

---

## 🔧 修改過程

### 後端修改

#### 如果修改容器內文件：
```bash
# 1. 進入容器修改
ssh root@165.227.147.40 "docker exec -it taskflow-pro bash"

# 2. 修改文件
# [執行修改操作]

# 3. 立即 commit（重要！）
exit
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v新版本-temp"

# 4. 測試
ssh root@165.227.147.40 "docker restart taskflow-pro"
# 測試 API 是否正常
```

#### 如果使用腳本修改：
```bash
# 1. 上傳腳本
Get-Content "修改腳本.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/script.js"

# 2. 複製到容器
ssh root@165.227.147.40 "docker cp /tmp/script.js taskflow-pro:/app/script.js"

# 3. 執行腳本
ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node script.js"

# 4. 立即 commit（重要！）
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v新版本"

# 5. 重啟容器
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 前端修改

```bash
# 1. 修改代碼
# [修改前端代碼]

# 2. 構建
Remove-Item -Recurse -Force dist
npm run build

# 3. 部署到 Netlify
netlify deploy --prod --dir=dist --no-build

# 4. 記錄 Deploy ID
# Deploy ID: [從 Netlify 複製]
```

---

## ✅ 修改後（必做）

### 1. 完整測試
- [ ] 後端 API 測試
- [ ] 前端功能測試
- [ ] 資料庫查詢測試
- [ ] 用戶操作測試

### 2. 創建新映像（如果後端有修改）
```bash
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v新版本"
```

### 3. 創建快照
```bash
ssh root@165.227.147.40 "/root/create-complete-snapshot.sh v新版本"
```

### 4. 記錄版本配對
```bash
# 編輯版本記錄文件
ssh root@165.227.147.40 "nano /root/version-history.txt"

# 填寫：
# - 前端 Deploy ID
# - 修改內容描述
# - 測試結果
```

### 5. 驗證快照
```bash
# 查看快照是否創建成功
ssh root@165.227.147.40 "ls -lh /root/taskflow-snapshots/ | tail -3"

# 查看快照內容
ssh root@165.227.147.40 "cat /root/taskflow-snapshots/complete-v新版本-*/snapshot-info.txt"
```

---

## 🔴 出錯恢復流程

### 1. 不要慌張
保持冷靜，按照流程恢復

### 2. 查看版本記錄
```bash
ssh root@165.227.147.40 "cat /root/version-history.txt | tail -20"
```

### 3. 確定要恢復的版本
找到最後一個穩定版本

### 4. 恢復後端
```bash
# 停止當前容器
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro"

# 啟動穩定版本
ssh root@165.227.147.40 "docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 -e PORT=3000 -v /root/taskflow-data:/app/data taskflow-pro:v穩定版本"
```

### 5. 恢復資料庫（如果需要）
```bash
# 從快照恢復
ssh root@165.227.147.40 "tar -xzf /root/taskflow-snapshots/complete-v穩定版本-*.tar.gz -C /tmp/"
ssh root@165.227.147.40 "cp /tmp/complete-v穩定版本-*/taskflow.db /root/taskflow-data/"
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 6. 恢復前端
在 Netlify 控制台：
1. 找到對應的 Deploy ID（從版本記錄中查看）
2. 點擊 "Publish deploy"
3. 等待部署完成

### 7. 驗證恢復
- [ ] 後端 API 正常
- [ ] 前端功能正常
- [ ] 資料完整
- [ ] 用戶可以正常使用

---

## 💡 最佳實踐

### 1. 小步快跑
- 每次只修改一個功能
- 修改後立即測試
- 測試通過後立即 commit

### 2. 頻繁 commit
- 容器內修改後立即 commit
- 不要等到一天結束才 commit
- commit 後立即測試

### 3. 詳細記錄
- 每次修改都記錄做了什麼
- 記錄前後端版本配對
- 記錄測試結果

### 4. 保留穩定版本
- 至少保留最近 3 個穩定版本
- 不要刪除穩定版本的映像
- 定期清理測試版本

### 5. 前後端同步
- 先部署後端，測試 API
- 再部署前端，測試功能
- 確保版本匹配

---

## ⚠️ 常見錯誤

### 錯誤 1：忘記 commit
```
❌ docker exec 修改 → 創建快照
✅ docker exec 修改 → docker commit → 創建快照
```

### 錯誤 2：只恢復後端
```
❌ 只恢復後端容器
✅ 同時恢復前端到對應版本
```

### 錯誤 3：沒有記錄版本
```
❌ 不知道當前是什麼版本
✅ 詳細記錄每個版本和配對
```

### 錯誤 4：沒有測試就部署
```
❌ 修改 → 直接部署
✅ 修改 → 測試 → commit → 再測試 → 部署
```

---

## 📝 快速參考

### 創建完整快照
```bash
ssh root@165.227.147.40 "/root/create-complete-snapshot.sh v版本號"
```

### 查看版本記錄
```bash
ssh root@165.227.147.40 "cat /root/version-history.txt"
```

### 恢復到穩定版本
```bash
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro && docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 -e PORT=3000 -v /root/taskflow-data:/app/data taskflow-pro:v穩定版本"
```

### 手動觸發備份
```bash
ssh root@165.227.147.40 "/root/trigger-backup.sh"
```

---

## 🎯 記住

**修改前**：創建快照、記錄版本
**修改中**：小步快跑、頻繁 commit
**修改後**：完整測試、創建快照、記錄配對
**出錯時**：查記錄、恢復版本、前後端同步

**關鍵原則**：永遠知道當前版本，永遠能恢復到穩定版本
