# 用戶管理 API 重構 - 錯誤與解決方案記錄

**日期**: 2026-01-29  
**任務**: 將用戶管理 API 從直接資料庫操作改為使用服務層  
**狀態**: 第一階段完成（GET / 路由）

---

## 🔴 遇到的錯誤

### 錯誤 1：MODULE_NOT_FOUND - 服務層目錄不存在

**發生時間**: 第一次重構嘗試  
**錯誤訊息**:
```
Error: Cannot find module '../../services/userService'
code: 'MODULE_NOT_FOUND'
```

**原因分析**:
- 在 `v8.9.182-remove-employee-delete` 映像上進行重構
- 該映像沒有 `/app/services/` 目錄
- 服務層只存在於 `v8.9.183-service-layer` 映像中

**解決方案**:
```bash
# 切換到包含服務層的映像
docker stop taskflow-pro
docker rm taskflow-pro
docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 \
  -e PORT=3000 -v /root/taskflow-data:/app/data \
  taskflow-pro:v8.9.183-service-layer
```

**教訓**:
- ✅ 重構前必須確認目標映像包含所需的基礎架構
- ✅ 檢查 Docker 映像版本和內容

---

### 錯誤 2：MODULE_NOT_FOUND - 路徑錯誤

**發生時間**: 第二次重構嘗試  
**錯誤訊息**:
```
Error: Cannot find module '../services/userService'
code: 'MODULE_NOT_FOUND'
```

**原因分析**:
- 使用了錯誤的相對路徑 `../services/userService`
- 實際路徑結構：
  - 路由文件：`/app/dist/routes/users.js`
  - 服務層：`/app/services/userService.js`
- 正確的相對路徑應該是 `../../services/userService`

**錯誤的重構腳本**:
```javascript
// ❌ 錯誤
const importStatement = "const UserService = require('../services/userService');";
```

**正確的重構腳本**:
```javascript
// ✅ 正確
const importStatement = "const UserService = require('../../services/userService');";
```

**路徑計算**:
```
從: /app/dist/routes/users.js
到: /app/services/userService.js

步驟:
1. 從 /app/dist/routes/ 往上一層 → /app/dist/
2. 再往上一層 → /app/
3. 進入 services/ → /app/services/
4. 找到 userService.js

相對路徑: ../../services/userService
```

**教訓**:
- ✅ 必須正確計算相對路徑
- ✅ 使用 `ls -la` 確認實際目錄結構
- ✅ 測試路徑是否正確

---

### 錯誤 3：服務層導出方式不匹配

**發生時間**: 第一次修正 UserService 時  
**問題描述**:
- 原始 UserService 使用實例模式（需要 `new UserService(dbPath)`）
- 路由使用 `req.db`（已初始化的資料庫實例）
- 兩者不匹配

**原始錯誤的 UserService**:
```javascript
// ❌ 錯誤：需要 dbPath 並創建新的 db 實例
class UserService {
  constructor(dbPath) {
    this.db = new Database(dbPath);
  }

  getAllUsers() {
    return this.db.prepare('SELECT * FROM users').all();
  }
}
```

**修正後的 UserService**:
```javascript
// ✅ 正確：使用靜態方法，接受已初始化的 db 實例
class UserService {
  static async getAllUsers(db, currentUser) {
    let query = 'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users';
    let params = [];
    
    const users = await db.all(query, params);
    
    return users.map(user => ({
      ...user,
      permissions: user.permissions ? JSON.parse(user.permissions) : undefined
    }));
  }
}
```

**教訓**:
- ✅ 服務層必須接受 `req.db` 實例，不是路徑
- ✅ 使用靜態方法避免實例化問題
- ✅ 保持與現有架構一致

---

### 錯誤 4：重構腳本中文字符導致語法錯誤

**發生時間**: 第一次執行重構腳本  
**錯誤訊息**:
```
SyntaxError: Invalid or unexpected token
```

**原因分析**:
- 重構腳本包含中文字符（console.log 訊息）
- Node.js 執行時出現編碼問題

**解決方案**:
```javascript
// ❌ 錯誤：包含中文
console.log('✓ 添加 UserService 引入');

// ✅ 正確：使用純 ASCII
console.log('+ Added UserService import');
```

**教訓**:
- ✅ 後端腳本必須使用純 ASCII
- ✅ 避免在腳本中使用中文或特殊字符
- ✅ 遵循 Pure ASCII 規則

---

## ✅ 成功的解決方案

### 解決方案總結

**1. 正確的映像選擇**
```bash
# 使用包含服務層的映像
taskflow-pro:v8.9.183-service-layer
```

**2. 正確的路徑引用**
```javascript
const UserService = require('../../services/userService');
```

**3. 正確的服務層設計**
```javascript
class UserService {
  static async getAllUsers(db, currentUser) { ... }
  static async getUserById(db, id) { ... }
  static async createUser(db, userData) { ... }
  static async updateUser(db, id, userData) { ... }
  static async deleteUser(db, id) { ... }
}
```

**4. 正確的重構流程**
```
1. 創建快照（修改前）
2. 修正 UserService（靜態方法）
3. 重構路由（添加引用 + 替換調用）
4. 重啟容器
5. 測試驗證
6. Commit 新映像
7. 創建快照（修改後）
8. 更新文檔
9. Git commit
```

---

## 📊 重構統計

### 嘗試次數
- ❌ 失敗：3 次
- ✅ 成功：1 次

### 回退次數
- 回退到穩定版本：3 次
- 使用快照恢復：0 次（因為及時回退）

### 創建的快照
1. `v8.9.182-before-users-refactor` (238MB)
2. `v8.9.183-before-userservice-update` (238MB)
3. `v8.9.184-users-get-refactored` (238MB) ✅ 成功版本

### 耗時
- 總耗時：約 30 分鐘
- 錯誤診斷：約 20 分鐘
- 成功實施：約 10 分鐘

---

## 🎯 關鍵成功因素

### 1. 漸進式重構策略
- ✅ 一次只重構一個路由
- ✅ 每步都測試驗證
- ✅ 成功後立即 commit

### 2. 完善的備份機制
- ✅ 修改前創建快照
- ✅ 保留多個穩定版本
- ✅ 快速回退能力

### 3. 精確的診斷方法
- ✅ 使用容器內 Node.js 腳本測試
- ✅ 檢查實際目錄結構
- ✅ 驗證路徑是否正確

### 4. 遵循核心規則
- ✅ Pure ASCII 腳本
- ✅ 使用 `Get-Content | ssh` 上傳
- ✅ 修改後必須 docker commit

---

## 📝 下次重構檢查清單

### 開始前
- [ ] 確認目標映像包含所需基礎架構
- [ ] 檢查目錄結構和路徑
- [ ] 創建快照備份
- [ ] 準備測試腳本

### 實施中
- [ ] 使用 Pure ASCII 腳本
- [ ] 正確計算相對路徑
- [ ] 一次只修改一個路由
- [ ] 每步都測試驗證

### 完成後
- [ ] 重啟容器測試
- [ ] 執行測試腳本驗證
- [ ] Commit 新映像
- [ ] 創建快照
- [ ] 更新文檔
- [ ] Git commit

---

## 🔮 下一步重構計劃

### GET /:id 路由重構

**預期修改**:
```javascript
// 修改前
const userRow = await db.get(
  'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = ?',
  [id]
);

// 修改後
const userRow = await UserService.getUserById(db, id);
```

**預期挑戰**:
- 需要處理 permissions 欄位解析
- 需要處理用戶不存在的情況

**準備工作**:
- ✅ UserService.getUserById 已實現
- ✅ 包含 permissions 解析邏輯
- ✅ 返回 null 如果用戶不存在

---

**最後更新**: 2026-01-29 19:30  
**狀態**: ✅ 第一階段完成，準備繼續
