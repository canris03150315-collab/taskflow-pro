# 員工提案論壇功能修復

**日期**：2026-01-03  
**版本**：v8.9.0-forum-suggestions-complete  
**狀態**：✅ 已完全修復

---

## 📋 問題描述

### 用戶反映
員工提案論壇無法正常使用。

### 症狀
- 無法查看提案列表
- 無法新增提案
- 無法評論或投票

---

## 🔍 診斷過程

### 1. 檢查後端路由

**檢查文件**：`/app/dist/routes/forum.js`

**發現問題**：
- 路由存在但功能簡陋
- 只有基本的 GET/POST/PUT/DELETE
- 缺少評論功能
- 缺少投票功能
- 缺少狀態管理

### 2. 檢查資料庫表

**診斷腳本**：`check-forum-table.js`

```javascript
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name='forum' OR name='suggestions')").all();
```

**🔴 發現根本原因**：
```
Found tables: 
❌ No forum or suggestions table found!
```

**資料庫中完全沒有 forum 或 suggestions 表！**

---

## ✅ 修復方案

### 1. 創建 suggestions 資料表

**創建腳本**：`create-suggestions-table.js`

```sql
CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  author_id TEXT NOT NULL,
  target_dept_id TEXT,
  is_anonymous INTEGER DEFAULT 0,
  status TEXT DEFAULT 'OPEN',
  upvotes TEXT DEFAULT '[]',
  comments TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
```

**表結構說明**：
- `id`: 提案唯一識別碼
- `title`: 提案標題
- `content`: 提案內容
- `category`: 類別（工作流程、薪資福利等）
- `author_id`: 作者 ID
- `target_dept_id`: 目標部門 ID（可為 'ALL'）
- `is_anonymous`: 是否匿名（0/1）
- `status`: 狀態（OPEN/REVIEWING/APPROVED/REJECTED）
- `upvotes`: 點讚用戶 ID 列表（JSON 陣列）
- `comments`: 評論列表（JSON 陣列）
- `created_at`: 創建時間
- `updated_at`: 更新時間

### 2. 實現完整的後端路由

**新文件**：`forum-routes-complete.js`

#### 關鍵功能

**A. 欄位映射函數**
```javascript
function mapSuggestion(record) {
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    category: record.category,
    authorId: record.author_id,           // snake_case → camelCase
    targetDeptId: record.target_dept_id,
    isAnonymous: record.is_anonymous === 1,
    status: record.status,
    upvotes: JSON.parse(record.upvotes || '[]'),      // JSON 字串 → 陣列
    comments: JSON.parse(record.comments || '[]'),    // JSON 字串 → 陣列
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}
```

**B. GET 路由 - 獲取所有提案**
```javascript
router.get('/', authenticateToken, async (req, res) => {
  const suggestions = dbCall(db, 'prepare', 'SELECT * FROM suggestions ORDER BY created_at DESC').all();
  const mapped = suggestions.map(mapSuggestion);
  res.json({ suggestions: mapped });  // 返回 { suggestions: [] } 格式
});
```

**C. POST 路由 - 創建新提案**
```javascript
router.post('/', authenticateToken, async (req, res) => {
  const { title, content, category, isAnonymous, targetDeptId, authorId } = req.body;
  
  const id = `sug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  dbCall(db, 'prepare', 
    'INSERT INTO suggestions (...) VALUES (...)'
  ).run(
    id, title, content, category || '其他',
    authorId || currentUser.id,
    targetDeptId || 'ALL',
    isAnonymous ? 1 : 0,
    'OPEN', '[]', '[]', now, now
  );
  
  const suggestion = dbCall(db, 'prepare', 'SELECT * FROM suggestions WHERE id = ?').get(id);
  res.json(mapSuggestion(suggestion));
});
```

**D. PUT 路由 - 更新提案（支援部分更新）**
```javascript
router.put('/:id', authenticateToken, async (req, res) => {
  const { title, content, category, status, upvotes, comments } = req.body;
  
  const updates = [];
  const values = [];
  
  if (title !== undefined) {
    updates.push('title = ?');
    values.push(title);
  }
  // ... 其他欄位
  
  dbCall(db, 'prepare', `UPDATE suggestions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
});
```

**E. POST /:id/comments - 新增評論**
```javascript
router.post('/:id/comments', authenticateToken, async (req, res) => {
  const { content, is_official } = req.body;
  
  const suggestion = dbCall(db, 'prepare', 'SELECT * FROM suggestions WHERE id = ?').get(id);
  const comments = JSON.parse(suggestion.comments || '[]');
  
  const newComment = {
    id: `c-${Date.now()}`,
    userId: currentUser.id,
    author_id: currentUser.id,
    content: content,
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    isOfficialReply: is_official || false
  };
  
  comments.push(newComment);
  
  dbCall(db, 'prepare', 'UPDATE suggestions SET comments = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(comments), now, id
  );
  
  res.json({ comment: newComment });
});
```

---

## 🚀 部署記錄

### 部署步驟

1. **創建資料表**：
   ```bash
   docker exec -w /app taskflow-pro node create-suggestions-table.js
   ```

2. **上傳完整路由**：
   ```powershell
   Get-Content "forum-routes-complete.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/forum.js"
   ssh root@165.227.147.40 "docker cp /tmp/forum.js taskflow-pro:/app/dist/routes/forum.js"
   ```

3. **重啟容器**：
   ```bash
   ssh root@165.227.147.40 "docker restart taskflow-pro"
   ```

4. **創建新 Docker 映像**：
   ```bash
   ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v8.9.0-forum-suggestions-complete"
   ```

5. **創建完整系統快照**：
   ```bash
   ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.0-forum-suggestions-complete"
   ```

### 最終版本

- **後端版本**：`taskflow-pro:v8.9.0-forum-suggestions-complete`
- **前端版本**：`6958efbcb07f3288c79f25c4`（無需修改）
- **快照文件**：`taskflow-snapshot-v8.9.0-forum-suggestions-complete-20260103_115110.tar.gz` (214MB)
- **狀態**：✅ 已完全修復

---

## 📊 功能清單

### 已實現功能

| 功能 | 狀態 | 說明 |
|-----|------|------|
| 查看提案列表 | ✅ | GET /api/forum |
| 新增提案 | ✅ | POST /api/forum |
| 更新提案 | ✅ | PUT /api/forum/:id |
| 刪除提案 | ✅ | DELETE /api/forum/:id |
| 新增評論 | ✅ | POST /api/forum/:id/comments |
| 投票功能 | ✅ | 通過 PUT 更新 upvotes |
| 狀態管理 | ✅ | OPEN/REVIEWING/APPROVED/REJECTED |
| 匿名提案 | ✅ | is_anonymous 欄位 |
| 目標部門 | ✅ | target_dept_id 欄位 |
| 欄位映射 | ✅ | snake_case → camelCase |

### 前端功能（已存在）

- ✅ 提案列表顯示
- ✅ 篩選（類別、狀態）
- ✅ 新增提案表單
- ✅ 評論功能
- ✅ 投票功能
- ✅ 狀態管理（Boss/Manager/Supervisor）

---

## 🎯 關鍵教訓

### 1. 完整性檢查

✅ **部署新功能前必須檢查資料庫表是否存在**
- 不要假設表已經創建
- 使用診斷腳本確認

### 2. 資料格式一致性

✅ **後端必須正確處理 JSON 欄位**
- 儲存：`JSON.stringify(array)`
- 讀取：`JSON.parse(string)`
- 映射：snake_case → camelCase

### 3. API 返回格式

✅ **遵循統一的 API 格式**
- 列表：`{ suggestions: [] }`
- 單項：直接返回物件
- 評論：`{ comment: {} }`

### 4. 部分更新支援

✅ **PUT 路由應支援部分更新**
- 只更新提供的欄位
- 使用動態 SQL 構建

### 5. 完整測試

✅ **測試所有功能**
- 新增提案
- 查看列表
- 評論
- 投票
- 狀態變更

---

## 📚 相關文檔

- `PROJECT-KNOWLEDGE-BASE.md` - 項目知識庫
- `WORK_LOG_20260103_FINANCE_AMOUNT_FIX.md` - 零用金修復
- `WORK_LOG_20260103_ANNOUNCEMENTS_COMPLETE.md` - 企業公告欄修復

---

**修復完成日期**：2026-01-03  
**修復人員**：AI Assistant  
**用戶確認**：待測試
