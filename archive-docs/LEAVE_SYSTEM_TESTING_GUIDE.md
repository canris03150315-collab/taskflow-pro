# 假表系統測試流程指南

**版本**: v8.9.54-leave-db-api-fixed  
**測試日期**: 2026-01-08  
**狀態**: ✅ 後端 API 已修復，準備測試

---

## 🎯 測試目標

驗證假表系統的核心功能：
1. ✅ 查看假期列表
2. ✅ 創建假期申請
3. ✅ 審核假期（批准/駁回）
4. ✅ 衝突檢查
5. ✅ 覆蓋衝突批准
6. ✅ 權限控制

---

## 📋 測試階段一：基本查看功能（5分鐘）

### 步驟 1：進入假表管理

1. 訪問：https://transcendent-basbousa-6df2d2.netlify.app
2. 登入您的帳號
3. 在左側選單找到「**工作執行**」分組
4. 點擊「**📅 假表管理**」

**預期結果**：
- ✅ 頁面正常載入
- ✅ 看到「申請假期」按鈕
- ✅ 看到假期列表（目前應該是空的）
- ✅ 看到篩選器（狀態、假別）

### 步驟 2：測試篩選功能

1. 點擊「狀態」下拉選單
2. 選擇不同的狀態（待審核、已批准等）
3. 點擊「假別」下拉選單
4. 選擇不同的假別（病假、事假等）

**預期結果**：
- ✅ 下拉選單正常運作
- ✅ 可以看到所有假別選項

---

## 📋 測試階段二：創建假期申請（10分鐘）

由於申請表單尚未完成，我們使用 API 測試。

### 方法 A：使用瀏覽器 Console（推薦）

1. 按 `F12` 打開開發者工具
2. 切換到「Console」標籤
3. 複製以下代碼並執行：

```javascript
// 創建測試假期
const token = localStorage.getItem('auth_token');

fetch('/api/leaves', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    leave_type: 'ANNUAL',
    start_date: '2026-01-15',
    end_date: '2026-01-17',
    days: 3,
    reason: '測試特休假期'
  })
}).then(r => r.json()).then(data => {
  console.log('✅ 創建成功:', data);
  alert('假期創建成功！請重新整理頁面查看。');
}).catch(err => {
  console.error('❌ 創建失敗:', err);
  alert('創建失敗，請查看 Console');
});
```

4. 重新整理頁面
5. 確認可以看到新創建的假期

**預期結果**：
- ✅ Console 顯示「創建成功」
- ✅ 假期列表中出現新的假期記錄
- ✅ 假期狀態為「待審核」或「有衝突」
- ✅ 可以看到假期詳情（日期、天數、原因）

### 方法 B：創建多個測試假期

```javascript
// 創建多個不同類型的假期
const token = localStorage.getItem('auth_token');
const leaves = [
  { leave_type: 'SICK', start_date: '2026-01-20', end_date: '2026-01-21', days: 2, reason: '測試病假' },
  { leave_type: 'PERSONAL', start_date: '2026-01-25', end_date: '2026-01-25', days: 1, reason: '測試事假' },
  { leave_type: 'MARRIAGE', start_date: '2026-02-01', end_date: '2026-02-03', days: 3, reason: '測試婚假' }
];

Promise.all(leaves.map(leave => 
  fetch('/api/leaves', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(leave)
  }).then(r => r.json())
)).then(results => {
  console.log('✅ 全部創建成功:', results);
  alert(`成功創建 ${results.length} 個假期！請重新整理頁面。`);
  location.reload();
});
```

---

## 📋 測試階段三：審核功能（10分鐘）

**前置條件**：
- 需要使用主管或 BOSS 帳號
- 或者賦予員工 `APPROVE_LEAVES` 權限

### 步驟 1：切換到主管帳號

1. 登出當前帳號
2. 使用主管帳號登入
3. 進入假表管理頁面

### 步驟 2：查看待審核假期

1. 使用篩選器選擇「待審核」狀態
2. 找到剛才創建的假期

**預期結果**：
- ✅ 可以看到部門內的待審核假期
- ✅ 假期卡片右側有審核按鈕：
  - ✓ 批准
  - ✗ 駁回

### 步驟 3：批准假期

1. 點擊「✓ 批准」按鈕
2. 確認顯示成功訊息
3. 假期狀態變更為「已批准」

**預期結果**：
- ✅ 顯示成功訊息
- ✅ 假期狀態變為綠色「已批准」
- ✅ 假期卡片顯示批准者和批准時間

### 步驟 4：駁回假期

1. 創建另一個測試假期
2. 點擊「✗ 駁回」按鈕
3. 在彈出框中輸入駁回原因：「測試駁回功能」
4. 確認

**預期結果**：
- ✅ 顯示成功訊息
- ✅ 假期狀態變為紅色「已駁回」
- ✅ 可以看到駁回原因

---

## 📋 測試階段四：衝突檢查（15分鐘）

### 步驟 1：創建衝突假期

使用 Console 創建多個重疊的假期：

```javascript
const token = localStorage.getItem('auth_token');

// 創建第一個假期
fetch('/api/leaves', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    leave_type: 'ANNUAL',
    start_date: '2026-03-10',
    end_date: '2026-03-12',
    days: 3,
    reason: '衝突測試 - 第一個'
  })
}).then(r => r.json()).then(data => {
  console.log('第一個假期:', data);
  
  // 創建第二個重疊的假期
  return fetch('/api/leaves', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      leave_type: 'ANNUAL',
      start_date: '2026-03-11',
      end_date: '2026-03-13',
      days: 3,
      reason: '衝突測試 - 第二個（重疊）'
    })
  });
}).then(r => r.json()).then(data => {
  console.log('第二個假期（可能有衝突）:', data);
  alert('衝突測試完成！請重新整理頁面查看。');
  location.reload();
});
```

**預期結果**：
- ✅ 第一個假期狀態為「待審核」
- ✅ 第二個假期可能顯示「有衝突」標記
- ✅ 可以看到衝突詳情

### 步驟 2：覆蓋衝突批准

1. 使用主管帳號
2. 找到有衝突的假期
3. 確認可以看到「⚠️ 覆蓋批准」按鈕
4. 點擊「⚠️ 覆蓋批准」
5. 確認批准

**預期結果**：
- ✅ 顯示成功訊息
- ✅ 假期狀態變為「已批准」
- ✅ 顯示「主管覆蓋衝突批准」備註

---

## 📋 測試階段五：權限控制（5分鐘）

### 測試 1：員工權限

1. 使用普通員工帳號登入
2. 進入假表管理
3. 確認：
   - ✅ 可以看到「申請假期」按鈕
   - ✅ 只能看到自己的假期
   - ❌ 沒有「排假規則」按鈕
   - ❌ 沒有審核按鈕

### 測試 2：主管權限

1. 使用主管帳號登入
2. 進入假表管理
3. 確認：
   - ✅ 可以看到「申請假期」按鈕
   - ✅ 可以看到「⚙️ 排假規則」按鈕
   - ✅ 可以看到部門內所有假期
   - ✅ 有審核按鈕

### 測試 3：BOSS 權限

1. 使用 BOSS 帳號登入
2. 進入假表管理
3. 確認：
   - ✅ 可以看到所有部門的假期
   - ✅ 可以審核所有假期
   - ✅ 可以設定所有部門的規則

---

## 📋 測試階段六：取消假期（5分鐘）

### 步驟 1：取消自己的假期

1. 使用員工帳號
2. 找到自己的待審核假期
3. 點擊「取消」按鈕
4. 確認取消

**預期結果**：
- ✅ 顯示成功訊息
- ✅ 假期狀態變為「已取消」

---

## 🧪 進階測試：API 直接測試

### 測試 1：查詢假期列表

```javascript
const token = localStorage.getItem('auth_token');

fetch('/api/leaves', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('假期列表:', data));
```

### 測試 2：查詢部門規則

```javascript
const token = localStorage.getItem('auth_token');
const departmentId = 'YOUR_DEPARTMENT_ID'; // 替換為實際部門 ID

fetch(`/api/leaves/rules/${departmentId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('部門規則:', data));
```

### 測試 3：檢查衝突

```javascript
const token = localStorage.getItem('auth_token');

fetch('/api/leaves/check-conflict', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    start_date: '2026-03-10',
    end_date: '2026-03-12'
  })
})
.then(r => r.json())
.then(data => console.log('衝突檢查結果:', data));
```

---

## 📝 測試記錄表

請在測試時填寫：

| 測試項目 | 狀態 | 備註 |
|---------|------|------|
| 進入假表管理頁面 | ⬜ |  |
| 查看假期列表 | ⬜ |  |
| 篩選功能 | ⬜ |  |
| 創建假期（API） | ⬜ |  |
| 批准假期 | ⬜ |  |
| 駁回假期 | ⬜ |  |
| 衝突檢查 | ⬜ |  |
| 覆蓋衝突批准 | ⬜ |  |
| 取消假期 | ⬜ |  |
| 員工權限控制 | ⬜ |  |
| 主管權限控制 | ⬜ |  |
| BOSS 權限控制 | ⬜ |  |

---

## 🐛 問題回報格式

如果發現問題，請提供：

1. **測試階段**：（例如：階段二 - 創建假期）
2. **操作步驟**：（詳細描述您做了什麼）
3. **預期結果**：（應該發生什麼）
4. **實際結果**：（實際發生了什麼）
5. **錯誤訊息**：（如果有，請提供 Console 截圖）
6. **使用帳號**：（員工/主管/BOSS）

---

## ✅ 測試完成後

請告訴我：
1. 哪些功能正常運作
2. 哪些功能有問題
3. 是否需要優先完成申請表單和規則設定介面

---

**祝測試順利！** 🎯
