# 回歸測試解決方案

## 🔴 問題描述

**現象**：
- 新增或修改一個功能
- 可能造成其他功能缺失或異常
- 每次都要重複測試所有功能
- 測試工作量越來越大

## 🔍 根本原因

### 1. 代碼耦合度高
- 修改一處影響多處
- 共用的函數或組件被修改
- 資料庫結構變更影響多個功能

### 2. 沒有自動化測試
- 依賴手動測試
- 容易遺漏測試項目
- 測試不一致

### 3. 沒有測試檢查清單
- 不知道要測試哪些功能
- 測試範圍不明確
- 容易遺漏關鍵功能

### 4. 缺乏影響範圍分析
- 不知道修改會影響哪些功能
- 無法預測潛在問題

## ✅ 完整解決方案

### 方案 1：功能測試檢查清單（立即可用）

創建完整的功能測試清單，每次修改後快速檢查。

### 方案 2：自動化 API 測試（推薦）

使用腳本自動測試所有 API 端點。

### 方案 3：關鍵功能監控

監控關鍵功能的可用性。

### 方案 4：影響範圍分析

記錄每個功能依賴的組件，修改前評估影響。

---

## 📋 立即可用：功能測試檢查清單

### 核心功能測試清單

#### 1. 用戶認證 (Authentication)
- [ ] 登入功能
  - [ ] 正確帳密可登入
  - [ ] 錯誤帳密顯示錯誤
  - [ ] 記住登入狀態
- [ ] 登出功能
- [ ] 權限檢查
  - [ ] 管理員權限
  - [ ] 一般用戶權限

#### 2. 用戶管理 (Users)
- [ ] 查看用戶列表
- [ ] 新增用戶
- [ ] 編輯用戶資料
- [ ] 刪除用戶（如果有）
- [ ] 用戶搜尋

#### 3. 部門管理 (Departments)
- [ ] 查看部門列表
- [ ] 新增部門
- [ ] 編輯部門
- [ ] 刪除部門
- [ ] 部門員工列表

#### 4. 打卡系統 (Attendance)
- [ ] 上班打卡
- [ ] 下班打卡
- [ ] 查看打卡記錄
- [ ] 編輯打卡記錄
- [ ] 打卡統計

#### 5. 工作報表 (Work Logs)
- [ ] 新增工作報表
- [ ] 查看工作報表
- [ ] 編輯工作報表
- [ ] 刪除工作報表
- [ ] 按日期篩選

#### 6. 報表中心 (Reports)
- [ ] 查看報表列表
- [ ] 新增報表
- [ ] 編輯報表
- [ ] 刪除報表
- [ ] 報表統計

#### 7. 公告系統 (Announcements)
- [ ] 查看公告列表
- [ ] 發布公告
- [ ] 編輯公告
- [ ] 刪除公告
- [ ] 公告圖片上傳
- [ ] 公告圖片顯示
- [ ] 公告已讀標記

#### 8. 任務管理 (Tasks)
- [ ] 查看任務列表
- [ ] 新增任務
- [ ] 編輯任務
- [ ] 刪除任務
- [ ] 任務狀態變更
- [ ] 任務分配

#### 9. 排班系統 (Schedules)
- [ ] 查看排班表
- [ ] 新增排班
- [ ] 編輯排班
- [ ] 刪除排班
- [ ] 月份切換

#### 10. 財務管理 (Finance)
- [ ] 查看財務記錄
- [ ] 新增財務記錄
- [ ] 編輯財務記錄
- [ ] 刪除財務記錄
- [ ] 部門撥款
- [ ] 財務統計

#### 11. KOL 管理 (KOL)
- [ ] 查看 KOL 列表
- [ ] 新增 KOL
- [ ] 編輯 KOL 資料
- [ ] 刪除 KOL
- [ ] KOL 合約管理
- [ ] KOL 週薪管理
- [ ] Excel 匯入

#### 12. 請假系統 (Leave Requests)
- [ ] 提交請假申請
- [ ] 查看請假記錄
- [ ] 審批請假
- [ ] 取消請假

#### 13. 建議箱 (Suggestions)
- [ ] 提交建議
- [ ] 查看建議列表
- [ ] 回覆建議

#### 14. 聊天系統 (Chat)
- [ ] 發送訊息
- [ ] 接收訊息
- [ ] 查看聊天記錄
- [ ] 創建對話

#### 15. AI 助理 (AI Assistant)
- [ ] 發送問題
- [ ] 接收回答
- [ ] 查看對話歷史
- [ ] 創建新對話

#### 16. 審計日誌 (Audit Logs)
- [ ] 查看操作記錄
- [ ] 按用戶篩選
- [ ] 按操作類型篩選

---

## 🤖 自動化 API 測試腳本

### 基礎 API 測試腳本

```javascript
// test-all-apis.js
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = '';

// 測試結果
const results = {
  passed: [],
  failed: [],
  total: 0
};

// 測試函數
async function test(name, fn) {
  results.total++;
  try {
    await fn();
    results.passed.push(name);
    console.log(`✅ ${name}`);
  } catch (error) {
    results.failed.push({ name, error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

// 登入獲取 token
async function login() {
  const response = await axios.post(`${BASE_URL}/api/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  authToken = response.data.token;
}

// API 測試
async function runTests() {
  console.log('=== 開始 API 測試 ===\n');

  // 1. 認證測試
  await test('登入 API', async () => {
    await login();
    if (!authToken) throw new Error('未獲取到 token');
  });

  const headers = { Authorization: `Bearer ${authToken}` };

  // 2. 用戶 API
  await test('獲取用戶列表', async () => {
    const res = await axios.get(`${BASE_URL}/api/users`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 3. 部門 API
  await test('獲取部門列表', async () => {
    const res = await axios.get(`${BASE_URL}/api/departments`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 4. 打卡 API
  await test('獲取打卡記錄', async () => {
    const res = await axios.get(`${BASE_URL}/api/attendance`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 5. 工作報表 API
  await test('獲取工作報表', async () => {
    const res = await axios.get(`${BASE_URL}/api/work-logs`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 6. 報表中心 API
  await test('獲取報表列表', async () => {
    const res = await axios.get(`${BASE_URL}/api/reports`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 7. 公告 API
  await test('獲取公告列表', async () => {
    const res = await axios.get(`${BASE_URL}/api/announcements`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 8. 任務 API
  await test('獲取任務列表', async () => {
    const res = await axios.get(`${BASE_URL}/api/tasks`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 9. 排班 API
  await test('獲取排班列表', async () => {
    const res = await axios.get(`${BASE_URL}/api/schedules`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 10. 財務 API
  await test('獲取財務記錄', async () => {
    const res = await axios.get(`${BASE_URL}/api/finance`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 11. KOL API
  await test('獲取 KOL 列表', async () => {
    const res = await axios.get(`${BASE_URL}/api/kol/profiles`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 12. 請假 API
  await test('獲取請假記錄', async () => {
    const res = await axios.get(`${BASE_URL}/api/leave-requests`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 13. 建議箱 API
  await test('獲取建議列表', async () => {
    const res = await axios.get(`${BASE_URL}/api/suggestions`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 14. 備忘錄 API
  await test('獲取備忘錄', async () => {
    const res = await axios.get(`${BASE_URL}/api/memos`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 15. 聊天 API
  await test('獲取聊天對話', async () => {
    const res = await axios.get(`${BASE_URL}/api/chat/conversations`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 16. AI 助理 API
  await test('獲取 AI 對話', async () => {
    const res = await axios.get(`${BASE_URL}/api/ai/conversations`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 17. 審計日誌 API
  await test('獲取審計日誌', async () => {
    const res = await axios.get(`${BASE_URL}/api/audit-logs`, { headers });
    if (!Array.isArray(res.data)) throw new Error('返回格式錯誤');
  });

  // 顯示結果
  console.log('\n=== 測試結果 ===');
  console.log(`總測試數: ${results.total}`);
  console.log(`通過: ${results.passed.length}`);
  console.log(`失敗: ${results.failed.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n失敗的測試:');
    results.failed.forEach(f => {
      console.log(`  ❌ ${f.name}: ${f.error}`);
    });
  }

  console.log('\n=== 測試完成 ===');
  
  // 返回退出碼
  process.exit(results.failed.length > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('測試執行失敗:', error);
  process.exit(1);
});
```

### 使用方法

```bash
# 1. 安裝依賴
npm install axios

# 2. 執行測試
node test-all-apis.js

# 3. 在容器內執行
docker exec taskflow-pro node /app/test-all-apis.js
```

---

## 🔧 快速測試腳本

### 創建一鍵測試腳本

```bash
#!/bin/bash
# quick-test.sh

echo "=========================================="
echo "快速功能測試"
echo "=========================================="

# 測試後端 API
echo "1. 測試後端 API..."
docker exec taskflow-pro node /app/test-all-apis.js

if [ $? -ne 0 ]; then
    echo "❌ 後端 API 測試失敗"
    exit 1
fi

echo "✅ 後端 API 測試通過"

# 測試資料庫連接
echo "2. 測試資料庫..."
docker exec taskflow-pro node -e "
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');
const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log('用戶數:', users.count);
db.close();
"

if [ $? -ne 0 ]; then
    echo "❌ 資料庫測試失敗"
    exit 1
fi

echo "✅ 資料庫測試通過"

# 測試容器狀態
echo "3. 測試容器狀態..."
docker ps | grep taskflow-pro

if [ $? -ne 0 ]; then
    echo "❌ 容器未運行"
    exit 1
fi

echo "✅ 容器運行正常"

echo "=========================================="
echo "✅ 所有測試通過"
echo "=========================================="
```

---

## 📊 功能依賴關係圖

記錄每個功能依賴的組件，修改前評估影響。

### 依賴關係表

| 功能 | 依賴的 API | 依賴的組件 | 依賴的資料表 |
|------|-----------|-----------|------------|
| 登入 | /api/auth/login | LoginForm | users |
| 用戶列表 | /api/users | UserList | users, departments |
| 打卡 | /api/attendance | AttendanceWidget | attendance_records, users |
| 工作報表 | /api/work-logs | WorkLogView | work_logs, users, departments |
| 公告 | /api/announcements | BulletinView | announcements, users |
| 任務 | /api/tasks | TaskView | tasks, users |
| KOL | /api/kol/* | KOLManagementView | kol_profiles, kol_contracts |

### 修改影響評估

**修改前問題**：
1. 這個修改會影響哪些 API？
2. 哪些前端組件使用這些 API？
3. 哪些功能會受影響？
4. 需要測試哪些功能？

---

## 🎯 實施建議

### 階段 1：立即實施（今天）

1. ✅ 創建功能測試檢查清單
2. ✅ 每次修改後按清單測試
3. ✅ 記錄測試結果

### 階段 2：短期實施（本週）

1. 🔧 部署 API 自動化測試腳本
2. 🔧 創建一鍵測試腳本
3. 🔧 建立功能依賴關係表

### 階段 3：中期實施（本月）

1. 📦 完善自動化測試覆蓋率
2. 📦 建立持續集成測試
3. 📦 設置測試環境

---

## 💡 最佳實踐

### 1. 修改前評估影響

```
修改前問自己：
- 這個修改會影響哪些功能？
- 需要測試哪些相關功能？
- 是否需要更新測試腳本？
```

### 2. 小範圍修改

```
- 一次只修改一個功能
- 修改後立即測試
- 測試通過後再繼續
```

### 3. 使用自動化測試

```
- 修改後運行自動化測試
- 快速發現問題
- 減少手動測試工作量
```

### 4. 記錄測試結果

```
- 記錄每次測試的結果
- 發現問題立即修復
- 建立測試歷史
```

---

## 🔴 常見問題

### 問題 1：修改後忘記測試相關功能

**解決**：
- 使用測試檢查清單
- 運行自動化測試腳本
- 建立測試習慣

### 問題 2：不知道修改會影響哪些功能

**解決**：
- 建立功能依賴關係表
- 修改前查看依賴
- 評估影響範圍

### 問題 3：手動測試太耗時

**解決**：
- 使用自動化測試
- 優先測試核心功能
- 建立快速測試腳本

### 問題 4：測試不一致

**解決**：
- 使用標準化測試清單
- 自動化測試保證一致性
- 記錄測試步驟

---

## 📝 測試記錄模板

```markdown
## 測試記錄

**日期**: 2026-01-29
**版本**: v8.9.182
**修改內容**: [描述修改]

### 測試結果

#### 核心功能
- [x] 登入功能 - 正常
- [x] 用戶管理 - 正常
- [x] 打卡系統 - 正常
- [x] 工作報表 - 正常
- [ ] 公告系統 - **異常：圖片無法顯示**

#### 受影響功能
- [x] [列出預期受影響的功能]
- [x] [測試結果]

#### 發現的問題
1. 公告圖片無法顯示
   - 原因：[分析原因]
   - 修復：[修復方法]

#### 測試結論
- [ ] 通過，可以部署
- [x] 失敗，需要修復
```

---

## 總結

**問題**：修改功能導致其他功能缺失，需要重複測試

**解決方案**：
1. 功能測試檢查清單（立即可用）
2. 自動化 API 測試（推薦）
3. 一鍵測試腳本（快速驗證）
4. 功能依賴關係表（影響評估）

**立即行動**：
1. 使用功能測試檢查清單
2. 每次修改後按清單測試
3. 記錄測試結果
4. 逐步實施自動化測試

**長期目標**：
- 建立完整的自動化測試體系
- 減少手動測試工作量
- 提高測試覆蓋率和一致性
