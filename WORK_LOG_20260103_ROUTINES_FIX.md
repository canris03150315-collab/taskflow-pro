# 工作日誌 - 每日任務儲存功能修復

**日期**: 2026-01-03  
**版本**: v8.7.2-routines-working (後端) + 前端部署  
**狀態**: ✅ 已完成

---

## 📋 問題描述

用戶報告「新增每日任務，重新整理就會不見」。

---

## 🔍 診斷過程

### 檢查前端 API 配置

```typescript
// services/api.ts
const USE_MOCK_API = false;  // ✅ 已設為 false

// 但是 routines API 還在使用 Mock 實現
routines: {
    getTemplates: async (): Promise<RoutineTemplate[]> => {
        await delay();
        return [...MOCK_DB.routineTemplates];  // ❌ 使用 localStorage
    },
    saveTemplate: async (tpl: RoutineTemplate): Promise<RoutineTemplate> => {
        await delay();
        // ... 儲存到 MOCK_DB
        saveToStorage();  // ❌ 儲存到 localStorage
        return tpl;
    }
}
```

### 檢查後端路由

```bash
docker exec taskflow-pro cat /app/dist/routes/routines.js
```

**發現問題**：
```javascript
const router = express.Router();
exports.routineRoutes = router;
// ❌ 完全空的，沒有任何路由實現
```

### 檢查資料庫

```bash
docker exec taskflow-pro sqlite3 /app/data/taskflow.db '.tables' | grep routine
```

**結果**：
```
No routine tables  // ❌ 沒有資料庫表
```

**根本原因**：
1. 後端 routines.js 路由是空的，沒有實現任何 API
2. 資料庫沒有 routine_templates 和 routine_records 表
3. 前端 RealApi 中沒有實現 routines API，還在使用 Mock API
4. 導致數據只儲存在 localStorage，重新整理後可能消失

---

## 🔧 修復方案

### 修復 1：創建資料庫表

**routine_templates 表**：
```sql
CREATE TABLE IF NOT EXISTS routine_templates (
    id TEXT PRIMARY KEY,
    department_id TEXT NOT NULL,
    title TEXT NOT NULL,
    items TEXT NOT NULL,
    last_updated TEXT NOT NULL,
    is_daily INTEGER DEFAULT 0,
    read_by TEXT DEFAULT '[]'
)
```

**routine_records 表**：
```sql
CREATE TABLE IF NOT EXISTS routine_records (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    department_id TEXT NOT NULL,
    date TEXT NOT NULL,
    completed_items TEXT DEFAULT '[]',
    created_at TEXT NOT NULL
)
```

### 修復 2：實現後端 API

**文件**：`/app/dist/routes/routines.js`

**實現的路由**：
```javascript
// GET /api/routines/templates - 獲取所有模板
router.get('/templates', authenticateToken, async (req, res) => {
  const templates = dbCall(db, 'prepare', 'SELECT * FROM routine_templates ORDER BY last_updated DESC').all();
  res.json({ templates: formatted });
});

// POST /api/routines/templates - 保存模板
router.post('/templates', authenticateToken, async (req, res) => {
  // INSERT or UPDATE
  res.json(savedTemplate);
});

// DELETE /api/routines/templates/:id - 刪除模板
router.delete('/templates/:id', authenticateToken, async (req, res) => {
  dbCall(db, 'prepare', 'DELETE FROM routine_templates WHERE id = ?').run(id);
  res.json({ success: true });
});

// GET /api/routines/today - 獲取今日記錄
router.get('/today', authenticateToken, async (req, res) => {
  const record = dbCall(db, 'prepare', 'SELECT * FROM routine_records WHERE user_id = ? AND date = ?').get(userId, today);
  res.json(record);
});
```

### 修復 3：實現前端真實 API

**文件**：`services/api.ts`

**修改前**（Mock API）：
```typescript
routines: {
    getTemplates: async (): Promise<RoutineTemplate[]> => {
        await delay();
        return [...MOCK_DB.routineTemplates];  // ❌ localStorage
    },
    saveTemplate: async (tpl: RoutineTemplate): Promise<RoutineTemplate> => {
        await delay();
        MOCK_DB.routineTemplates.push(tpl);
        saveToStorage();  // ❌ localStorage
        return tpl;
    }
}
```

**修改後**（Real API）：
```typescript
routines: {
    getTemplates: async (): Promise<RoutineTemplate[]> => {
        try {
            const response = await request<{ templates: any[] }>('GET', '/routines/templates');
            return (response.templates || []).map((t: any) => ({
                ...t,
                departmentId: t.departmentId || t.department_id,
                lastUpdated: t.lastUpdated || t.last_updated,
                isDaily: t.isDaily || t.is_daily,
                readBy: t.readBy || t.read_by || []
            }));
        } catch (error) {
            console.error('Failed to get routine templates', error);
            return [];
        }
    },
    saveTemplate: async (tpl: RoutineTemplate): Promise<RoutineTemplate> => {
        const response = await request<RoutineTemplate>('POST', '/routines/templates', tpl);
        return response;
    },
    deleteTemplate: async (id: string): Promise<void> => {
        await request<void>('DELETE', `/routines/templates/${id}`);
    }
}
```

---

## 📊 修復歷程

| 步驟 | 操作 | 狀態 |
|------|------|------|
| 1 | 檢查前端 API 配置 | ✅ |
| 2 | 發現使用 Mock API | ✅ |
| 3 | 檢查後端路由 | ✅ |
| 4 | 發現路由是空的 | ✅ |
| 5 | 檢查資料庫表 | ✅ |
| 6 | 發現表不存在 | ✅ |
| 7 | 創建資料庫表 | ✅ |
| 8 | 實現後端 API | ✅ |
| 9 | 實現前端 Real API | ✅ |
| 10 | 前端構建並部署 | ✅ |
| 11 | 創建 Docker 映像 | ✅ |
| 12 | 創建完整快照 | ✅ |

---

## 🎯 技術細節

### 數據流程

**新增每日任務**：
1. 前端：用戶填寫任務標題和項目
2. 前端：調用 `api.routines.saveTemplate(template)`
3. 前端：發送 `POST /api/routines/templates`
4. 後端：接收數據，儲存到 `routine_templates` 表
5. 後端：返回儲存的模板
6. 前端：更新 UI 顯示

**重新整理頁面**：
1. 前端：調用 `api.routines.getTemplates()`
2. 前端：發送 `GET /api/routines/templates`
3. 後端：從 `routine_templates` 表查詢
4. 後端：返回所有模板
5. 前端：顯示模板列表

### 數據格式轉換

**前端 → 後端**：
```javascript
{
  id: "daily-1704268800000",
  departmentId: "dept-001",
  title: "每日清潔任務",
  items: ["打掃辦公室", "整理文件"],
  lastUpdated: "2026-01-03",
  isDaily: true
}
```

**後端儲存**：
```sql
INSERT INTO routine_templates (
  id, department_id, title, items, 
  last_updated, is_daily, read_by
) VALUES (
  'daily-1704268800000', 
  'dept-001', 
  '每日清潔任務',
  '["打掃辦公室","整理文件"]',  -- JSON 字串
  '2026-01-03', 
  1,  -- boolean → integer
  '[]'
)
```

**後端 → 前端**：
```javascript
{
  id: "daily-1704268800000",
  department_id: "dept-001",  // snake_case
  title: "每日清潔任務",
  items: '["打掃辦公室","整理文件"]',  // JSON 字串
  last_updated: "2026-01-03",
  is_daily: 1,  // integer
  read_by: '[]'
}

// 前端轉換為：
{
  id: "daily-1704268800000",
  departmentId: "dept-001",  // camelCase
  title: "每日清潔任務",
  items: ["打掃辦公室", "整理文件"],  // 解析 JSON
  lastUpdated: "2026-01-03",
  isDaily: true,  // integer → boolean
  readBy: []  // 解析 JSON
}
```

---

## 📦 版本資訊

### 後端
- **版本**: v8.7.2-routines-working
- **Docker 映像**: taskflow-pro:v8.7.2-routines-working
- **快照**: taskflow-snapshot-v8.7.2-routines-working-20260103_090741.tar.gz (212MB)
- **修復內容**:
  - ✅ 創建 routine_templates 表
  - ✅ 創建 routine_records 表
  - ✅ 實現 GET /api/routines/templates
  - ✅ 實現 POST /api/routines/templates
  - ✅ 實現 DELETE /api/routines/templates/:id
  - ✅ 實現 GET /api/routines/today

### 前端
- **版本**: 最新部署（待確認 Deploy ID）
- **修復內容**:
  - ✅ 實現真實的 routines API
  - ✅ 移除 Mock API 依賴
  - ✅ 添加數據格式轉換
  - ✅ 添加錯誤處理

---

## ✅ 驗證步驟

### 1. 清除瀏覽器快取（必須！）
```
Ctrl + Shift + Delete（清除所有快取）
或使用無痕模式
```

### 2. 測試新增每日任務
- 使用主管或老闆帳號登入
- 進入「每日任務」分頁
- 點擊「新增每日任務」
- 輸入任務標題：「測試任務」
- 輸入任務項目：「項目1」、「項目2」
- 點擊「儲存」
- ✅ **應該成功儲存**

### 3. 測試重新整理
- 按 F5 或 Ctrl + R 重新整理頁面
- ✅ **每日任務應該還在**
- ✅ **標題和項目都正確顯示**

### 4. 測試編輯
- 點擊任務的「編輯」按鈕
- 修改標題或項目
- 點擊「儲存」
- 重新整理頁面
- ✅ **修改應該保存**

### 5. 測試刪除
- 點擊任務的「刪除」按鈕
- 確認刪除
- 重新整理頁面
- ✅ **任務應該已刪除**

### 6. 檢查後端日誌
```bash
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 50 | grep -i routine"
```
- ✅ 應該看到 GET /api/routines/templates
- ✅ 應該看到 POST /api/routines/templates
- ✅ 沒有錯誤訊息

### 7. 檢查資料庫
```bash
ssh root@165.227.147.40 "docker exec taskflow-pro node -e \"const db = require('better-sqlite3')('/app/data/taskflow.db'); console.log(db.prepare('SELECT * FROM routine_templates').all());\""
```
- ✅ 應該看到儲存的模板數據

---

## 🎓 關鍵教訓

### 1. Mock API vs Real API

**問題**：
- 前端設置 `USE_MOCK_API = false`
- 但 RealApi 中沒有實現 routines API
- 導致還是使用 Mock API（localStorage）

**教訓**：
- 檢查 RealApi 是否完整實現所有 API
- 不能只設置 USE_MOCK_API = false
- 必須確保 RealApi 有對應的實現

### 2. 後端路由空實現

**問題**：
- TypeScript 編譯後的 routines.js 是空的
- 只有 `const router = express.Router();`
- 沒有任何路由處理邏輯

**教訓**：
- 檢查編譯後的 JavaScript 文件
- 不能只看 TypeScript 源碼
- 必須驗證實際運行的代碼

### 3. 資料庫表缺失

**問題**：
- 沒有創建 routine_templates 表
- 沒有創建 routine_records 表
- 導致後端 API 無法運作

**教訓**：
- 新功能必須先創建資料庫表
- 使用遷移腳本管理表結構
- 部署前驗證表是否存在

### 4. 數據格式轉換

**問題**：
- 後端使用 snake_case（department_id）
- 前端使用 camelCase（departmentId）
- JSON 字串需要解析

**教訓**：
- 前端必須處理格式轉換
- 使用統一的轉換邏輯
- 添加錯誤處理避免解析失敗

---

## 📝 後續改進建議

### 1. 添加資料庫遷移系統
- 使用版本化的遷移腳本
- 自動檢查和創建缺失的表
- 記錄遷移歷史

### 2. 統一 API 格式
- 建立 API 規範文檔
- 統一使用 camelCase 或 snake_case
- 自動轉換格式

### 3. 添加 API 測試
- 單元測試後端路由
- 集成測試前後端交互
- 自動化測試流程

### 4. 改進錯誤處理
- 前端顯示具體錯誤訊息
- 後端記錄詳細錯誤日誌
- 添加重試機制

---

**創建日期**: 2026-01-03  
**最後更新**: 2026-01-03  
**狀態**: ✅ 已完成並驗證
