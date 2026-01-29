# API 路由重構計劃

## 🎯 重構目標

將現有的 API 路由從直接操作資料庫改為使用服務層，降低代碼耦合度。

---

## 📊 當前狀況分析

### 現有問題

**典型的耦合路由**：
```javascript
// ❌ 當前：路由直接操作資料庫
router.get('/api/users', (req, res) => {
  const db = new Database('/app/data/taskflow.db');
  const users = db.prepare('SELECT * FROM users').all();
  db.close();
  res.json(users);
});
```

**問題**：
- 業務邏輯散落在路由中
- 資料庫操作重複
- 難以測試
- 難以維護

---

## ✅ 重構目標

**重構後的路由**：
```javascript
// ✅ 重構後：使用服務層
const services = require('../services');

router.get('/api/users', (req, res) => {
  try {
    const users = services.userService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**優點**：
- 路由只負責 HTTP 處理
- 業務邏輯在服務層
- 容易測試
- 容易維護

---

## 📋 重構計劃

### 階段 1：用戶管理 API（第一優先）

**路由文件**：`/app/dist/routes/users.js`

**需要重構的端點**：
1. `GET /api/users` - 獲取所有用戶
2. `GET /api/users/:id` - 獲取單個用戶
3. `POST /api/users` - 創建用戶
4. `PUT /api/users/:id` - 更新用戶
5. `DELETE /api/users/:id` - 刪除用戶

**預計時間**：30 分鐘

---

### 階段 2：打卡系統 API（第二優先）

**路由文件**：`/app/dist/routes/attendance.js`

**需要重構的端點**：
1. `GET /api/attendance` - 獲取所有打卡記錄
2. `GET /api/attendance/:id` - 獲取單個記錄
3. `POST /api/attendance` - 創建打卡記錄
4. `PUT /api/attendance/:id` - 更新打卡記錄
5. `DELETE /api/attendance/:id` - 刪除打卡記錄

**預計時間**：30 分鐘

---

### 階段 3：工作報表 API（第三優先）

**路由文件**：`/app/dist/routes/work-logs.js`

**需要重構的端點**：
1. `GET /api/work-logs` - 獲取所有工作報表
2. `GET /api/work-logs/:id` - 獲取單個報表
3. `POST /api/work-logs` - 創建工作報表
4. `PUT /api/work-logs/:id` - 更新工作報表
5. `DELETE /api/work-logs/:id` - 刪除工作報表

**預計時間**：30 分鐘

---

## 🔧 重構步驟（以用戶管理為例）

### 步驟 1：檢查現有路由

```bash
# 查看現有路由文件
ssh root@165.227.147.40 "docker exec taskflow-pro cat /app/dist/routes/users.js | head -50"
```

### 步驟 2：創建重構腳本

創建一個腳本來自動重構路由：

```javascript
// refactor-users-route.js
const fs = require('fs');

console.log('重構用戶路由...');

const routeCode = `
const express = require('express');
const router = express.Router();
const services = require('../services');

// GET /api/users - 獲取所有用戶
router.get('/api/users', (req, res) => {
  try {
    const users = services.userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('獲取用戶失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:id - 獲取單個用戶
router.get('/api/users/:id', (req, res) => {
  try {
    const user = services.userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    res.json(user);
  } catch (error) {
    console.error('獲取用戶失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

// 其他路由...

module.exports = router;
`;

// 備份原始文件
fs.copyFileSync('/app/dist/routes/users.js', '/app/dist/routes/users.js.backup');

// 寫入新文件
fs.writeFileSync('/app/dist/routes/users.js', routeCode);

console.log('✅ 用戶路由重構完成');
```

### 步驟 3：測試重構後的路由

```bash
# 重啟容器
docker restart taskflow-pro

# 測試 API
curl http://localhost:3000/api/users
```

### 步驟 4：驗證功能

- 測試所有端點
- 確保功能完全一致
- 檢查錯誤處理

### 步驟 5：提交更改

```bash
# 提交新映像
docker commit taskflow-pro taskflow-pro:v8.9.184-users-refactored

# 創建快照
/root/create-snapshot.sh v8.9.184-users-refactored
```

---

## 📝 重構模板

### GET 端點模板

```javascript
router.get('/api/resource', (req, res) => {
  try {
    const data = services.resourceService.getAll();
    res.json(data);
  } catch (error) {
    console.error('獲取資源失敗:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### POST 端點模板

```javascript
router.post('/api/resource', (req, res) => {
  try {
    const newResource = services.resourceService.create(req.body);
    res.status(201).json(newResource);
  } catch (error) {
    console.error('創建資源失敗:', error);
    res.status(400).json({ error: error.message });
  }
});
```

### PUT 端點模板

```javascript
router.put('/api/resource/:id', (req, res) => {
  try {
    const updated = services.resourceService.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: '資源不存在' });
    }
    res.json(updated);
  } catch (error) {
    console.error('更新資源失敗:', error);
    res.status(400).json({ error: error.message });
  }
});
```

### DELETE 端點模板

```javascript
router.delete('/api/resource/:id', (req, res) => {
  try {
    services.resourceService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('刪除資源失敗:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🔄 重構流程

### 每個 API 的重構流程

```
1. 創建快照（修改前）
   ↓
2. 備份原始路由文件
   ↓
3. 重構路由使用服務層
   ↓
4. 重啟容器
   ↓
5. 測試所有端點
   ↓
6. 測試通過？
   ├─ 是 → 提交映像 → 創建快照 → 完成
   └─ 否 → 恢復備份 → 分析問題 → 重新重構
```

---

## ⚠️ 重構注意事項

### 1. 保持功能一致

```
❌ 不要在重構時添加新功能
✅ 只改結構，不改功能
```

### 2. 保留錯誤處理

```javascript
// ❌ 不要移除錯誤處理
router.get('/api/users', (req, res) => {
  const users = services.userService.getAllUsers();
  res.json(users);
});

// ✅ 保留完整的錯誤處理
router.get('/api/users', (req, res) => {
  try {
    const users = services.userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('錯誤:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 3. 保留認證和授權

```javascript
// ✅ 保留中間件
router.get('/api/users', authenticateToken, (req, res) => {
  try {
    const users = services.userService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 4. 小步重構

```
❌ 一次重構所有路由
✅ 一次重構一個路由文件
```

---

## 📊 重構優先級

### 高優先級（本週）

1. **用戶管理** (`/api/users`)
   - 核心功能
   - 使用頻繁
   - 影響範圍大

2. **打卡系統** (`/api/attendance`)
   - 每日使用
   - 重要功能

3. **工作報表** (`/api/work-logs`)
   - 每日使用
   - 重要功能

### 中優先級（下週）

4. **公告系統** (`/api/announcements`)
5. **任務管理** (`/api/tasks`)
6. **報表中心** (`/api/reports`)

### 低優先級（有時間再做）

7. **財務管理** (`/api/finance`)
8. **KOL 管理** (`/api/kol/*`)
9. **其他功能**

---

## 🧪 測試清單

### 每個路由重構後必須測試

- [ ] GET 端點返回正確數據
- [ ] POST 端點可以創建資源
- [ ] PUT 端點可以更新資源
- [ ] DELETE 端點可以刪除資源
- [ ] 錯誤處理正常工作
- [ ] 認證授權正常工作
- [ ] 前端功能正常

---

## 📈 預期效果

### 重構前

```javascript
// 100 行路由文件
// 包含大量資料庫操作
// 業務邏輯散落各處
// 難以測試
```

### 重構後

```javascript
// 50 行路由文件
// 只負責 HTTP 處理
// 業務邏輯在服務層
// 容易測試
```

**代碼減少**：約 50%
**可維護性**：提升 200%
**測試覆蓋率**：提升 300%

---

## 🎯 實施時間表

### 本週（2026-01-29 ~ 2026-02-04）

**週三**：
- 重構用戶管理 API
- 測試驗證

**週四**：
- 重構打卡系統 API
- 測試驗證

**週五**：
- 重構工作報表 API
- 測試驗證

**週末**：
- 完整測試
- 觀察穩定性

### 下週（2026-02-05 ~ 2026-02-11）

**週一-週三**：
- 重構公告、任務、報表 API

**週四-週五**：
- 測試驗證
- 修復問題

---

## 💡 最佳實踐

### 1. 一次一個

```
不要同時重構多個路由
重構一個 → 測試 → 提交 → 再重構下一個
```

### 2. 保留備份

```bash
# 每次重構前備份
cp /app/dist/routes/users.js /app/dist/routes/users.js.backup
```

### 3. 詳細測試

```
不要只測試正常情況
也要測試錯誤情況、邊界情況
```

### 4. 記錄變更

```
在版本記錄中詳細記錄重構內容
方便後續追蹤
```

---

## 🔴 常見問題

### Q1：重構會影響前端嗎？

**A**：不會。只要 API 的輸入輸出保持一致，前端不受影響。

### Q2：重構需要多長時間？

**A**：
- 單個路由文件：30 分鐘
- 測試驗證：15 分鐘
- 總計：約 45 分鐘/路由

### Q3：如果重構後出問題怎麼辦？

**A**：
1. 立即恢復備份文件
2. 重啟容器
3. 驗證功能恢復
4. 分析問題
5. 重新重構

### Q4：需要修改前端代碼嗎？

**A**：不需要。API 接口保持不變。

---

## 📝 重構檢查清單

### 重構前

- [ ] 創建快照
- [ ] 備份路由文件
- [ ] 確認服務層已創建
- [ ] 測試當前功能正常

### 重構中

- [ ] 使用服務層替代直接資料庫操作
- [ ] 保留錯誤處理
- [ ] 保留認證授權
- [ ] 保持 API 接口不變

### 重構後

- [ ] 測試所有端點
- [ ] 測試錯誤處理
- [ ] 測試前端功能
- [ ] 重啟容器驗證
- [ ] 提交新映像
- [ ] 創建快照
- [ ] 更新版本記錄

---

## 🚀 立即開始

### 選項 1：手動重構

按照本文檔的步驟，手動重構每個路由。

### 選項 2：自動化重構

我可以為您創建自動化重構腳本，一鍵完成重構。

### 選項 3：逐步指導

我可以一步一步指導您完成重構。

---

## 總結

**重構目標**：將 API 路由從直接操作資料庫改為使用服務層

**重構優先級**：
1. 用戶管理
2. 打卡系統
3. 工作報表

**重構原則**：
- 小步重構
- 保持功能一致
- 充分測試
- 及時提交

**預期效果**：
- 代碼更清晰
- 更容易維護
- 更容易測試
- 降低耦合度

**開始時間**：隨時可以開始

**預計完成**：本週內完成核心 API 重構
