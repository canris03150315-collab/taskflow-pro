# 工作日誌 - 公告圖片上傳功能實現

**日期**: 2026-01-08  
**版本**: v8.9.40-announcement-images-working  
**狀態**: ✅ 已完成並測試通過

---

## 📋 需求

在企業公告欄發布公告時，支援上傳和顯示圖片。

## 🔍 問題診斷過程

### 初始問題
- 前端有圖片上傳 UI，但一般員工看不到圖片
- Console 顯示圖片數據有正確傳遞到前端 API
- 資料庫中所有公告的 `images` 欄位都是空陣列 `[]`

### 診斷步驟

1. **檢查資料庫結構**
   ```bash
   docker exec -w /app taskflow-pro node diagnose-images.js
   ```
   - 發現：資料庫已有 `images` 欄位（TEXT 類型）
   - 問題：所有公告的 images 都是空陣列

2. **檢查前端數據流**
   - 添加 Console 調試
   - 確認：前端正確發送 Base64 圖片數據
   ```
   [App] Images from modal: ['data:image/bmp;base64,...']
   [API] Images in request: ['data:image/bmp;base64,...']
   ```

3. **檢查後端路由**
   ```bash
   docker exec taskflow-pro cat /app/dist/routes/announcements.js | grep -A 5 'INSERT INTO announcements'
   ```
   - **發現問題**：POST 路由的 INSERT 語句缺少 `images` 欄位

## 🐛 根本原因

**後端 POST 路由的 INSERT 語句不完整**：

```javascript
// ❌ 錯誤（缺少 images）
INSERT INTO announcements (id, title, content, priority, created_by, created_at, updated_at, read_by) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?)

// 參數列表也缺少 images
id, title, content, priority || 'NORMAL', created_by, now, now, '[]'
```

## 🔧 修復方案

### 1. 資料庫修改
添加 `images` 欄位（已存在，無需修改）：
```sql
ALTER TABLE announcements ADD COLUMN images TEXT DEFAULT '[]'
```

### 2. 後端路由修復

**文件**: `/app/dist/routes/announcements.js`

#### 修復 parseAnnouncementJson 函數
```javascript
function parseAnnouncementJson(ann) {
  if (!ann) return ann;

  try {
    ann.read_by = ann.read_by ? JSON.parse(ann.read_by) : [];
  } catch (e) {
    ann.read_by = [];
  }

  // 添加 images 解析
  try {
    ann.images = ann.images ? JSON.parse(ann.images) : [];
  } catch (e) {
    ann.images = [];
  }

  ann.createdBy = ann.created_by;
  ann.createdAt = ann.created_at;
  ann.updatedAt = ann.updated_at;
  ann.readBy = ann.read_by;

  return ann;
}
```

#### 修復 POST 路由
```javascript
router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { title, content, priority, createdBy, images } = req.body;
    const id = `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const created_by = createdBy || req.user?.id || 'system';
    const imagesJson = JSON.stringify(images || []);

    // ✅ 正確：包含 images 欄位
    dbCall(db, 'prepare', 'INSERT INTO announcements (id, title, content, priority, created_by, created_at, updated_at, read_by, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, title, content, priority || 'NORMAL', created_by, now, now, '[]', imagesJson
    );

    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    res.json(parseAnnouncementJson(announcement));
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});
```

### 3. 前端修改

#### CreateAnnouncementModal.tsx
添加圖片上傳功能：
- 支援多張圖片上傳（最多 5 張）
- 每張圖片限制 2MB
- 即時預覽功能
- 可刪除已選圖片

#### BulletinView.tsx
添加圖片顯示功能：
- 解析 JSON 字串或陣列格式的 images
- 響應式網格佈局（1-5 張圖片自適應）
- 點擊圖片可在新視窗放大查看
- Hover 效果提升用戶體驗

#### types.ts
```typescript
export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'IMPORTANT';
  createdAt: string;
  createdBy: string;
  readBy: string[];
  images?: string[]; // 添加 images 欄位
}
```

## 📝 部署步驟

### 1. 創建快照（修改前）
```bash
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.36-before-announcement-images"
```

### 2. 修改資料庫
```bash
Get-Content "add-announcements-images-column-ascii.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/add-images-column.js"
ssh root@165.227.147.40 "docker cp /tmp/add-images-column.js taskflow-pro:/app/add-images-column.js && docker exec -w /app taskflow-pro node add-images-column.js"
```

### 3. 修復後端路由
```bash
# 備份原文件
ssh root@165.227.147.40 "docker exec taskflow-pro cp /app/dist/routes/announcements.js /app/dist/routes/announcements.js.backup"

# 應用修復
Get-Content "fix-post-insert-simple.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/fix-insert.js"
ssh root@165.227.147.40 "docker cp /tmp/fix-insert.js taskflow-pro:/app/fix-insert.js && docker exec -w /app taskflow-pro node fix-insert.js"
```

### 4. 驗證修復
```bash
ssh root@165.227.147.40 "docker exec taskflow-pro cat /app/dist/routes/announcements.js | grep -A 3 'INSERT INTO announcements'"
```

### 5. 重啟容器並創建新映像
```bash
ssh root@165.227.147.40 "docker restart taskflow-pro"
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v8.9.40-announcement-images-working"
```

### 6. 部署前端
```powershell
Remove-Item -Recurse -Force dist
npm run build
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

### 7. 創建快照（修改後）
```bash
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.40-announcement-images-working"
```

## ⚠️ 重要事件

### 登入功能中斷
在 v8.9.39 版本時，完全重寫 POST 路由導致登入功能中斷。

**解決方案**：
```bash
# 立即回復到上一個穩定版本
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro"
ssh root@165.227.147.40 "docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 -e PORT=3000 -v /root/taskflow-data:/app/data taskflow-pro:v8.9.37-announcement-images-fixed"
```

**教訓**：
- 不要完全重寫路由，使用精確的修改
- 修改後立即測試登入功能
- 保持備份映像以便快速回復

## ✅ 最終版本

- **後端**: `taskflow-pro:v8.9.40-announcement-images-working`
- **前端**: Deploy ID `695ec24c1b63aa2b875db726`
- **快照**: 
  - 修改前: `taskflow-snapshot-v8.9.36-before-announcement-images-20260107_201357.tar.gz` (214MB)
  - 修改後: `taskflow-snapshot-v8.9.40-announcement-images-working-20260107_204507.tar.gz` (214MB)
- **狀態**: ✅ 已完成並測試通過

## 🎯 功能特點

### 圖片上傳
- 📷 最多 5 張圖片
- 📏 每張限制 2MB
- 👁️ 即時預覽
- 🗑️ 可刪除已選圖片

### 圖片顯示
- 📱 響應式佈局（手機/平板/桌面）
- 🔍 點擊放大查看
- ✨ Hover 動畫效果
- 🎨 美觀的網格排列

### 技術實現
- 使用 Base64 編碼（參考聊天系統成功經驗）
- 前端轉換，後端存儲
- 無需額外檔案伺服器
- JSON 格式存儲多張圖片

## 🧪 測試驗證

### 測試步驟
1. 登入 BOSS 帳號
2. 進入企業公告欄
3. 發布帶圖片的公告（2-3 張）
4. 登入一般員工帳號
5. 查看公告，確認圖片顯示

### 測試結果
- ✅ 圖片正確保存到資料庫
- ✅ 圖片正確顯示給所有用戶
- ✅ 點擊圖片可放大查看
- ✅ 響應式佈局正常
- ✅ 登入功能正常

## 📚 關鍵教訓

1. **使用容器內 Node.js 腳本診斷**
   - 避免 PowerShell 引號問題
   - 精確診斷問題根源

2. **前端 Console 調試**
   - 添加 `console.log` 追蹤數據流
   - 快速定位問題位置

3. **精確修改而非重寫**
   - 使用 `sed` 或小腳本精確替換
   - 避免破壞其他功能

4. **備份和快速回復**
   - 修改前創建快照
   - 保留上一個穩定映像
   - 問題發生時立即回復

5. **逐步驗證**
   - 修復一個功能
   - 測試一個功能
   - 確認沒問題再繼續

## 📊 數據結構

### 資料庫
```sql
CREATE TABLE announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'NORMAL',
  created_at DATETIME,
  created_by TEXT,
  updated_at DATETIME,
  read_by TEXT DEFAULT '[]',
  images TEXT DEFAULT '[]'  -- JSON 格式存儲 Base64 圖片陣列
);
```

### 前端類型
```typescript
interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'IMPORTANT';
  createdAt: string;
  createdBy: string;
  readBy: string[];
  images?: string[];  // Base64 encoded images
}
```

### API 請求格式
```json
{
  "title": "公告標題",
  "content": "公告內容",
  "priority": "NORMAL",
  "images": [
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
  ]
}
```

## 🔗 相關文件

- 前端組件: `components/CreateAnnouncementModal.tsx`
- 前端組件: `components/BulletinView.tsx`
- 前端類型: `types.ts`
- 前端 API: `services/api.ts`
- 後端路由: `/app/dist/routes/announcements.js`
- 資料庫腳本: `add-announcements-images-column-ascii.js`
- 修復腳本: `fix-post-insert-simple.js`

---

**創建日期**: 2026-01-08  
**最後更新**: 2026-01-08  
**作者**: AI Assistant  
**狀態**: ✅ 完成
