# 工作日誌重做 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重做工作日誌（WorkLogTab）：對齊新版工作報表中心的視覺、加入分段圖片附件、補齊主管總覽 / 複製昨日 / 日期 chips / 卡片摺疊四項功能。

**Architecture:** `work_logs` 表加 `images TEXT` JSON 欄位（包含 today/tomorrow/notes 三段陣列）。圖片實體用既有 `fileStorage` util 存硬碟（hash 共用 blob，與檔案管理同池）。前端拆出 `ImageUploader` + `ImageLightbox` 通用元件，WorkLogTab 改寫為模組化結構。

**Tech Stack:** Node.js + Express + better-sqlite3 + Knex migrations + multer + React + TypeScript + Tailwind + Heroicons (inline SVG)

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `backend/migrations/20260603140000_add_images_to_work_logs.js` | 加 `images TEXT` 欄位 |
| Modify | `backend/dist/routes/work-logs.js` | 三個新端點 (upload/get/delete image) + submission-stats |
| Modify | `backend/dist/jobs/trashCleanup.js` | Cron 清理 blob 時同時檢查 work_logs.images |
| Create | `components/files/ImageUploader.tsx` | 通用圖片上傳元件（縮圖網格 + 拖檔） |
| Create | `components/files/ImageLightbox.tsx` | 通用圖片放大瀏覽 modal |
| Modify | `services/api.ts` | 加 `api.workLogs.images` 與 `api.workLogs.getSubmissionStats` |
| Modify | `types.ts` | 加 `WorkLogImage` interface 與 WorkLog images 欄位 |
| Rewrite | `components/WorkLogTab.tsx` | 完全重寫：4 個新功能 + 視覺一致 + 圖片附件 |

---

### Task 1: DB Migration — Add `images` column to work_logs

**Files:**
- Create: `backend/migrations/20260603140000_add_images_to_work_logs.js`

- [ ] **Step 1: Create migration file**

```javascript
// backend/migrations/20260603140000_add_images_to_work_logs.js
// Adds images JSON column to work_logs. Idempotent so it can run on any DB state.

exports.up = async function (knex) {
  const cols = await knex.raw('PRAGMA table_info(work_logs)');
  const colNames = (Array.isArray(cols) ? cols : []).map((c) => c.name);

  if (!colNames.includes('images')) {
    await knex.schema.alterTable('work_logs', (t) => {
      t.text('images'); // JSON: { today: [], tomorrow: [], notes: [] }
    });
    console.log('[Migration] Added images column to work_logs');
  } else {
    console.log('[Migration] images column already exists, skipping');
  }
};

exports.down = async function () {
  throw new Error('Cannot auto-rollback ADD COLUMN on SQLite');
};
```

- [ ] **Step 2: Run migration**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend"
npx knex migrate:latest
```

Expected: `Batch X run: 1 migrations` and `Added images column to work_logs`.

- [ ] **Step 3: Verify**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend"
node -e "const db = require('better-sqlite3')('./data/taskflow.db'); console.log(db.prepare('PRAGMA table_info(work_logs)').all().map(c => c.name).includes('images'));"
```

Expected: `true`

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
git add backend/migrations/20260603140000_add_images_to_work_logs.js
git commit -m "feat(worklog): add images JSON column to work_logs"
```

---

### Task 2: Backend — image upload / get / delete endpoints

**Files:**
- Modify: `backend/dist/routes/work-logs.js`

- [ ] **Step 1: Add requires + constants near top of file**

After the existing `const { authenticateToken } = require('../middleware/auth');` line, add:

```javascript
const multer = require('multer');
const fileStorage = require('../services/fileStorage');
const path = require('path');

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES_PER_SECTION = 10;
const VALID_SECTIONS = new Set(['today', 'tomorrow', 'notes']);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
});

function parseImages(jsonStr) {
  if (!jsonStr) return { today: [], tomorrow: [], notes: [] };
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      today: Array.isArray(parsed.today) ? parsed.today : [],
      tomorrow: Array.isArray(parsed.tomorrow) ? parsed.tomorrow : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    return { today: [], tomorrow: [], notes: [] };
  }
}
```

- [ ] **Step 2: Add image upload endpoint**

Insert BEFORE `module.exports = router;` at end of file:

```javascript
// POST /api/work-logs/:id/images - Upload image to specific section
router.post('/:id/images', authenticateToken, imageUpload.single('file'), async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const section = req.body.section;

    if (!req.file) return res.status(400).json({ error: '請選擇圖片檔案' });
    if (!VALID_SECTIONS.has(section)) {
      return res.status(400).json({ error: 'section 必須是 today / tomorrow / notes' });
    }
    if (!ALLOWED_IMAGE_MIME.has(req.file.mimetype)) {
      return res.status(400).json({ error: '只接受 JPEG / PNG / WebP / GIF 圖片' });
    }

    const log = await dbCall(db, 'get', 'SELECT * FROM work_logs WHERE id = ?', [id]);
    if (!log) return res.status(404).json({ error: '日誌不存在' });

    // Only the log author can upload images
    if (log.user_id !== currentUser.id) {
      return res.status(403).json({ error: '只有日誌作者可上傳圖片' });
    }

    const images = parseImages(log.images);
    if (images[section].length >= MAX_IMAGES_PER_SECTION) {
      return res.status(400).json({ error: `每段最多 ${MAX_IMAGES_PER_SECTION} 張圖片` });
    }

    const hash = fileStorage.computeHash(req.file.buffer);
    const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
    const blobPath = fileStorage.writeBlob(hash, ext, req.file.buffer);

    const decodedFilename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const newImage = {
      hash,
      filename: decodedFilename,
      size: req.file.size,
      mime_type: req.file.mimetype,
      uploader_id: currentUser.id,
      uploaded_at: new Date().toISOString(),
      blob_path: blobPath,
    };
    images[section].push(newImage);

    await dbCall(db, 'run', 'UPDATE work_logs SET images = ?, updated_at = ? WHERE id = ?', [
      JSON.stringify(images),
      new Date().toISOString(),
      id,
    ]);

    res.json({ image: newImage, section });
  } catch (err) {
    console.error('[work-logs] image upload error:', err.message);
    res.status(500).json({ error: '上傳圖片失敗' });
  }
});
```

- [ ] **Step 3: Add image fetch endpoint**

Insert after the upload endpoint:

```javascript
// GET /api/work-logs/images/:hash/:filename - Serve image blob (auth required)
router.get('/images/:hash/:filename', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { hash } = req.params;

    // Find any work_log that references this hash
    const logs = await dbCall(db, 'all', 'SELECT * FROM work_logs WHERE images IS NOT NULL', []);
    let foundImage = null;
    let foundLog = null;
    for (const log of logs) {
      const imgs = parseImages(log.images);
      for (const section of ['today', 'tomorrow', 'notes']) {
        const match = imgs[section].find((i) => i.hash === hash);
        if (match) {
          foundImage = match;
          foundLog = log;
          break;
        }
      }
      if (foundImage) break;
    }
    if (!foundImage) return res.status(404).json({ error: '圖片不存在' });

    // Permission: author OR BOSS/MANAGER OR same-department
    const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
    const isAuthor = foundLog.user_id === currentUser.id;
    const isSameDept = foundLog.department_id === currentUser.department;
    if (!isAuthor && !isManager && !isSameDept) {
      return res.status(403).json({ error: '無權限查看此圖片' });
    }

    const buffer = fileStorage.readBlob(foundImage.blob_path);
    res.set('Content-Type', foundImage.mime_type);
    res.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(foundImage.filename)}`);
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  } catch (err) {
    console.error('[work-logs] image fetch error:', err.message);
    res.status(500).json({ error: '取得圖片失敗' });
  }
});
```

- [ ] **Step 4: Add image delete endpoint**

```javascript
// DELETE /api/work-logs/:id/images/:hash - Remove image from a section
router.delete('/:id/images/:hash', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id, hash } = req.params;
    const section = req.query.section;

    if (!VALID_SECTIONS.has(section)) {
      return res.status(400).json({ error: 'section 必須是 today / tomorrow / notes' });
    }

    const log = await dbCall(db, 'get', 'SELECT * FROM work_logs WHERE id = ?', [id]);
    if (!log) return res.status(404).json({ error: '日誌不存在' });

    // Permission: author OR BOSS/MANAGER
    const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
    const isAuthor = log.user_id === currentUser.id;
    if (!isAuthor && !isManager) {
      return res.status(403).json({ error: '無權限刪除此圖片' });
    }

    const images = parseImages(log.images);
    const before = images[section].length;
    images[section] = images[section].filter((i) => i.hash !== hash);
    if (images[section].length === before) {
      return res.status(404).json({ error: '該段落沒有此圖片' });
    }

    await dbCall(db, 'run', 'UPDATE work_logs SET images = ?, updated_at = ? WHERE id = ?', [
      JSON.stringify(images),
      new Date().toISOString(),
      id,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('[work-logs] image delete error:', err.message);
    res.status(500).json({ error: '刪除圖片失敗' });
  }
});
```

- [ ] **Step 5: Add submission-stats endpoint**

```javascript
// GET /api/work-logs/submission-stats?date=YYYY-MM-DD - Manager-only submission stats
router.get('/submission-stats', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      return res.status(403).json({ error: '無權限查看提交統計' });
    }

    // Eligible users: EMPLOYEE + SUPERVISOR (exclude BOSS/MANAGER)
    const eligibleUsers = await dbCall(
      db,
      'all',
      `SELECT u.id, u.name, u.department, d.name AS department_name
         FROM users u
         LEFT JOIN departments d ON d.id = u.department
         WHERE u.role IN ('EMPLOYEE', 'SUPERVISOR')`,
      []
    );

    const submitted = await dbCall(
      db,
      'all',
      'SELECT DISTINCT user_id FROM work_logs WHERE date = ?',
      [date]
    );
    const submittedSet = new Set(submitted.map((r) => r.user_id));

    const notSubmitted = eligibleUsers
      .filter((u) => !submittedSet.has(u.id))
      .map((u) => ({
        userId: u.id,
        name: u.name,
        department: u.department,
        departmentName: u.department_name,
      }));

    res.json({
      date,
      totalEligible: eligibleUsers.length,
      submittedCount: eligibleUsers.length - notSubmitted.length,
      notSubmitted,
    });
  } catch (err) {
    console.error('[work-logs] submission-stats error:', err.message);
    res.status(500).json({ error: '取得提交統計失敗' });
  }
});
```

- [ ] **Step 6: Update mapping in GET / POST / PUT to include images**

Find every place in `work-logs.js` that maps a DB row to response (search for `mappedLog` and the GET list mapping). Add `images: parseImages(log.images)` to each mapped object.

For example in the POST `/` handler, change:
```javascript
const mappedLog = {
  id: log.id,
  ...
  updatedAt: log.updated_at
};
```
to:
```javascript
const mappedLog = {
  id: log.id,
  ...
  updatedAt: log.updated_at,
  images: parseImages(log.images),
};
```

Do the same in PUT `/:id` and the GET `/` list mapping.

- [ ] **Step 7: Smoke test**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend"
node -e "
const r = require('./dist/routes/work-logs');
const routes = r.stack.filter(l => l.route).map(l => l.route.path + ' [' + Object.keys(l.route.methods).join(',') + ']');
console.log(routes);
"
```

Expected to include `/:id/images [post]`, `/images/:hash/:filename [get]`, `/:id/images/:hash [delete]`, `/submission-stats [get]`.

- [ ] **Step 8: Commit**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
git add backend/dist/routes/work-logs.js
git commit -m "feat(worklog): add image upload/fetch/delete + submission stats endpoints"
```

---

### Task 3: Backend — trash cleanup checks work_logs.images

**Files:**
- Modify: `backend/dist/jobs/trashCleanup.js`

- [ ] **Step 1: Update runCleanup**

Open `backend/dist/jobs/trashCleanup.js` and find the section that decides whether to delete a blob. It currently checks `file_versions` references. Update to ALSO check `work_logs.images`:

Replace:
```javascript
const refs = db
  .prepare('SELECT COUNT(*) AS n FROM file_versions WHERE content_hash = ?')
  .get(v.content_hash);
if (refs.n === 0) {
```

With:
```javascript
const fileRefs = db
  .prepare('SELECT COUNT(*) AS n FROM file_versions WHERE content_hash = ?')
  .get(v.content_hash);

// Also check work_logs.images for hash references
const workLogRows = db.prepare("SELECT images FROM work_logs WHERE images IS NOT NULL AND images != ''").all();
let workLogRefs = 0;
for (const row of workLogRows) {
  try {
    const imgs = JSON.parse(row.images);
    for (const section of ['today', 'tomorrow', 'notes']) {
      if (Array.isArray(imgs[section])) {
        workLogRefs += imgs[section].filter((i) => i.hash === v.content_hash).length;
      }
    }
  } catch {
    /* skip malformed JSON */
  }
}

if (fileRefs.n === 0 && workLogRefs === 0) {
```

- [ ] **Step 2: Smoke test - module still loads**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend"
node -e "console.log(Object.keys(require('./dist/jobs/trashCleanup')));"
```

Expected: `[ 'runCleanup', 'startCleanupCron' ]`

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
git add backend/dist/jobs/trashCleanup.js
git commit -m "fix(worklog): trash cleanup also checks work_logs.images references"
```

---

### Task 4: Frontend types

**Files:**
- Modify: `types.ts`

- [ ] **Step 1: Add WorkLogImage interface + extend WorkLog**

Find `export interface WorkLog {` in `types.ts` (around line 509) and replace the whole block with:

```typescript
export interface WorkLogImage {
  hash: string;
  filename: string;
  size: number;
  mime_type: string;
  uploader_id: string;
  uploaded_at: string;
  blob_path?: string; // server-only, may not be sent to frontend
}

export interface WorkLogImages {
  today: WorkLogImage[];
  tomorrow: WorkLogImage[];
  notes: WorkLogImage[];
}

export interface WorkLog {
  id: string;
  userId: string;
  userName: string;
  departmentId: string;
  departmentName: string;
  date: string; // YYYY-MM-DD
  todayTasks: string; // 今日工作事項
  tomorrowTasks: string; // 明天工作事項
  notes: string; // 特別備註
  images?: WorkLogImages;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionStats {
  date: string;
  totalEligible: number;
  submittedCount: number;
  notSubmitted: Array<{
    userId: string;
    name: string;
    department: string;
    departmentName?: string;
  }>;
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
npx tsc --noEmit 2>&1 | grep "types.ts" | head -5
```

Expected: No errors related to the new interfaces.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
git add types.ts
git commit -m "feat(worklog): add WorkLogImage/SubmissionStats types"
```

---

### Task 5: Frontend API client extensions

**Files:**
- Modify: `services/api.ts`

- [ ] **Step 1: Replace the existing workLogs section**

Find `workLogs: {` (around line 871) and replace the entire block with:

```typescript
workLogs: {
  getAll: async (params?: any): Promise<any> => {
    try {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      const response = await request<any>('GET', `/work-logs${query}`);
      return response;
    } catch (error) {
      console.error('Failed to get work logs', error);
      return [];
    }
  },
  create: async (data: {
    date: string;
    todayTasks: string;
    tomorrowTasks: string;
    notes?: string;
    specialNotes?: string;
  }) => {
    return request<any>('POST', '/work-logs', {
      date: data.date,
      todayTasks: data.todayTasks,
      tomorrowTasks: data.tomorrowTasks,
      notes: data.notes || data.specialNotes || '',
    });
  },
  update: async (
    id: string,
    data: { todayTasks: string; tomorrowTasks: string; notes?: string; specialNotes?: string }
  ) => {
    return request<any>('PUT', `/work-logs/${id}`, {
      todayTasks: data.todayTasks,
      tomorrowTasks: data.tomorrowTasks,
      notes: data.notes || data.specialNotes || '',
    });
  },
  delete: async (id: string) => request<void>('DELETE', `/work-logs/${id}`),

  getSubmissionStats: async (date?: string): Promise<any> => {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return request<any>('GET', `/work-logs/submission-stats${query}`);
  },

  images: {
    async upload(workLogId: string, section: 'today' | 'tomorrow' | 'notes', file: File): Promise<any> {
      const form = new FormData();
      form.append('file', file);
      form.append('section', section);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/work-logs/${workLogId}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `上傳失敗 (${res.status})`);
      }
      return res.json();
    },

    getUrl(hash: string, filename: string): string {
      return `/api/work-logs/images/${hash}/${encodeURIComponent(filename)}`;
    },

    async fetchBlobUrl(hash: string, filename: string): Promise<string> {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/work-logs/images/${hash}/${encodeURIComponent(filename)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`載入圖片失敗 (${res.status})`);
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },

    async delete(workLogId: string, hash: string, section: 'today' | 'tomorrow' | 'notes'): Promise<void> {
      await request<void>('DELETE', `/work-logs/${workLogId}/images/${hash}?section=${section}`);
    },
  },
},
```

- [ ] **Step 2: TypeScript check**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
npx tsc --noEmit 2>&1 | grep "api.ts" | head -5
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
git add services/api.ts
git commit -m "feat(worklog): extend api client with image upload/fetch/delete + stats"
```

---

### Task 6: ImageUploader component

**Files:**
- Create: `components/files/ImageUploader.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/files/ImageUploader.tsx
import React, { useRef, useState } from 'react';
import { WorkLogImage } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';

interface ImageUploaderProps {
  images: WorkLogImage[];
  maxCount: number;
  onAdd: (file: File) => Promise<void>;
  onRemove: (hash: string) => Promise<void>;
  onPreview: (image: WorkLogImage, idx: number) => void;
  canRemove: (image: WorkLogImage) => boolean;
  disabled?: boolean;
  label?: string;
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE = 10 * 1024 * 1024;

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images, maxCount, onAdd, onRemove, onPreview, canRemove, disabled, label,
}) => {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const remaining = maxCount - images.length;
  const canAddMore = remaining > 0 && !disabled && !uploading;

  const handleFile = async (file: File) => {
    if (!ALLOWED_MIME.has(file.type)) {
      toast.error('只接受 JPEG / PNG / WebP / GIF 圖片');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error(`圖片超過 10 MB（你的：${formatSize(file.size)}）`);
      return;
    }
    setUploading(true);
    try {
      await onAdd(file);
    } catch (e: any) {
      toast.error(e.message || '上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (inputRef.current) inputRef.current.value = '';
    await handleFile(f);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (!canAddMore) return;
    const f = e.dataTransfer.files?.[0];
    if (f) await handleFile(f);
  };

  const handleRemove = async (img: WorkLogImage) => {
    try {
      await onRemove(img.hash);
    } catch (e: any) {
      toast.error(e.message || '刪除失敗');
    }
  };

  return (
    <div>
      {label !== undefined && (
        <div
          className="text-xs font-bold text-slate-600 mb-2"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {label}（{images.length}/{maxCount}）
        </div>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {images.map((img, idx) => (
          <div
            key={img.hash + idx}
            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group bg-slate-50"
          >
            <button
              type="button"
              onClick={() => onPreview(img, idx)}
              className="w-full h-full hover:opacity-90 transition"
              aria-label={`預覽 ${img.filename}`}
            >
              <img
                src={api.workLogs.images.getUrl(img.hash, img.filename)}
                alt={img.filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
            {canRemove(img) && (
              <button
                type="button"
                onClick={() => handleRemove(img)}
                className="absolute top-1 right-1 w-7 h-7 bg-white/95 hover:bg-red-50 border border-slate-200 hover:border-red-300 rounded-full text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition shadow-sm"
                aria-label={`移除 ${img.filename}`}
                title="移除"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.28 3.22a.75.75 0 00-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 101.06 1.06L10 11.06l5.72 5.72a.75.75 0 101.06-1.06L11.06 10l5.72-5.72a.75.75 0 00-1.06-1.06L10 8.94 4.28 3.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition ${
              dragActive ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-slate-300 bg-stone-50'
            }`}
          >
            {uploading ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <>
                <svg className="w-5 h-5 mb-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                <span className="text-xs font-bold">新增圖片</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
};
```

- [ ] **Step 2: TypeScript check**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
npx tsc --noEmit 2>&1 | grep "ImageUploader" | head -5
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
git add components/files/ImageUploader.tsx
git commit -m "feat(worklog): add ImageUploader component"
```

---

### Task 7: ImageLightbox component

**Files:**
- Create: `components/files/ImageLightbox.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/files/ImageLightbox.tsx
import React, { useEffect, useRef, useState } from 'react';
import { WorkLogImage } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';

interface ImageLightboxProps {
  images: WorkLogImage[];
  initialIndex: number;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, initialIndex, onClose }) => {
  const toast = useToast();
  const [idx, setIdx] = useState(initialIndex);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const current = images[idx];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(images.length - 1, i + 1));
    };
    document.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  const handleDownload = async () => {
    if (!current) return;
    try {
      const blobUrl = await api.workLogs.images.fetchBlobUrl(current.hash, current.filename);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = current.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      toast.error(e.message || '下載失敗');
    }
  };

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`圖片預覽：${current.filename}`}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-[95vw] max-h-[95vh] flex flex-col overflow-hidden"
        style={{ animation: 'modalEnter 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate">{current.filename}</p>
            <p className="text-xs text-slate-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {idx + 1} / {images.length}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 h-10 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            aria-label="下載圖片"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 3a.75.75 0 01.75.75v8.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 011.06-1.06l3.22 3.22V3.75A.75.75 0 0110 3z"
                clipRule="evenodd"
              />
              <path d="M3.5 13.75a.75.75 0 00-1.5 0v2.5A2.25 2.25 0 004.25 18.5h11.5A2.25 2.25 0 0018 16.25v-2.5a.75.75 0 00-1.5 0v2.5a.75.75 0 01-.75.75H4.25a.75.75 0 01-.75-.75v-2.5z" />
            </svg>
            <span>下載</span>
          </button>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="inline-flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-label="關閉"
            title="關閉 (Esc)"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.28 3.22a.75.75 0 00-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 101.06 1.06L10 11.06l5.72 5.72a.75.75 0 101.06-1.06L11.06 10l5.72-5.72a.75.75 0 00-1.06-1.06L10 8.94 4.28 3.22z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center bg-slate-900 relative">
          <img
            src={api.workLogs.images.getUrl(current.hash, current.filename)}
            alt={current.filename}
            className="max-w-full max-h-[80vh] object-contain"
          />
          {idx > 0 && (
            <button
              onClick={() => setIdx(idx - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg"
              aria-label="上一張"
            >
              <svg className="w-5 h-5 text-slate-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {idx < images.length - 1 && (
            <button
              onClick={() => setIdx(idx + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg"
              aria-label="下一張"
            >
              <svg className="w-5 h-5 text-slate-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        <div className="px-5 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex items-center justify-between">
          <span>← → 切換 · Esc 關閉</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            上傳者 · {new Date(current.uploaded_at).toLocaleString('zh-TW')}
          </span>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: TypeScript check**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
npx tsc --noEmit 2>&1 | grep "ImageLightbox" | head -5
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
git add components/files/ImageLightbox.tsx
git commit -m "feat(worklog): add ImageLightbox component"
```

---

### Task 8: Rewrite WorkLogTab

**Files:**
- Modify: `components/WorkLogTab.tsx`

- [ ] **Step 1: Replace the entire file**

Replace the contents of `components/WorkLogTab.tsx` with:

```tsx
// components/WorkLogTab.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { WorkLog, WorkLogImage, WorkLogImages, User, DepartmentDef, Role, SubmissionStats } from '../types';
import { api } from '../services/api';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/dialogService';
import { EmptyState } from './EmptyState';
import { ImageUploader } from './files/ImageUploader';
import { ImageLightbox } from './files/ImageLightbox';

interface WorkLogTabProps {
  currentUser: User;
  departments: DepartmentDef[];
  users: User[];
}

type Section = 'today' | 'tomorrow' | 'notes';
type DateMode = 'day' | 'week';

const emptyImages = (): WorkLogImages => ({ today: [], tomorrow: [], notes: [] });

const formatDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const todayStr = () => formatDate(new Date());
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDate(d);
};
const weekStartStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return formatDate(d);
};

const WorkLogTab: React.FC<WorkLogTabProps> = ({ currentUser, departments, users }) => {
  const isManager = currentUser.role === Role.BOSS || currentUser.role === Role.MANAGER;

  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [dateMode, setDateMode] = useState<DateMode>('day');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [formData, setFormData] = useState({
    date: todayStr(),
    todayTasks: '',
    tomorrowTasks: '',
    notes: '',
  });
  const [yesterdayLog, setYesterdayLog] = useState<WorkLog | null>(null);

  const [lightbox, setLightbox] = useState<{ images: WorkLogImage[]; idx: number } | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const [stats, setStats] = useState<SubmissionStats | null>(null);

  const availableDepts = useMemo(() =>
    isManager ? departments : departments.filter((d) => d.id === currentUser.department),
    [departments, isManager, currentUser.department]
  );

  const filteredUsers = useMemo(() =>
    selectedDept === 'ALL' ? users : users.filter((u) => u.department === selectedDept),
    [users, selectedDept]
  );

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateMode === 'day') {
        params.date = selectedDate;
      } else {
        params.startDate = weekStartStr();
        params.endDate = todayStr();
        // For employees: limit to themselves
        if (!isManager) params.userId = currentUser.id;
      }
      if (selectedDept !== 'ALL') params.departmentId = selectedDept;
      if (selectedUser !== 'ALL') params.userId = selectedUser;

      const response = await api.workLogs.getAll(params);
      const list = Array.isArray(response) ? response : response.logs || [];
      setLogs(list);
    } catch (error) {
      console.error('Failed to load work logs:', error);
      showError('載入工作日誌失敗');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!isManager) return;
    try {
      const s = await api.workLogs.getSubmissionStats(todayStr());
      setStats(s);
    } catch {
      // Silent — stats are optional
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDept, selectedUser, selectedDate, dateMode]);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => { loadLogs(); loadStats(); };
    window.addEventListener('worklog-updated', handler);
    return () => window.removeEventListener('worklog-updated', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDept, selectedUser, selectedDate, dateMode]);

  const fetchYesterdayLog = async () => {
    try {
      const response = await api.workLogs.getAll({ date: yesterdayStr(), userId: currentUser.id });
      const list = Array.isArray(response) ? response : response.logs || [];
      setYesterdayLog(list.find((l: WorkLog) => l.userId === currentUser.id) || null);
    } catch {
      setYesterdayLog(null);
    }
  };

  const handleCreate = () => {
    setEditingLog(null);
    setFormData({ date: selectedDate, todayTasks: '', tomorrowTasks: '', notes: '' });
    setFormError('');
    fetchYesterdayLog();
    setIsModalOpen(true);
  };

  const handleEdit = (log: WorkLog) => {
    setEditingLog(log);
    setFormData({
      date: log.date,
      todayTasks: log.todayTasks,
      tomorrowTasks: log.tomorrowTasks,
      notes: log.notes,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCopyFromYesterday = async () => {
    if (!yesterdayLog) return;
    if (formData.todayTasks.trim() && !(await showConfirm('目前內容會被取代，確定嗎？'))) return;
    setFormData((d) => ({ ...d, todayTasks: yesterdayLog.tomorrowTasks }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.todayTasks.trim() || !formData.tomorrowTasks.trim()) {
      showWarning('請填寫今日工作事項和明天工作事項');
      return;
    }
    try {
      if (editingLog) {
        await api.workLogs.update(editingLog.id, formData);
      } else {
        await api.workLogs.create(formData);
      }
      setIsModalOpen(false);
      showSuccess(editingLog ? '工作日誌已更新' : '工作日誌已建立');
      await loadLogs();
      await loadStats();
    } catch (error: any) {
      const msg = error.message || '保存失敗';
      const displayMsg = msg.includes('already exists') || msg.includes('已有')
        ? '今天的工作日誌已存在，無法重複建立'
        : msg;
      setFormError(displayMsg);
      showError(displayMsg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await showConfirm('確定要刪除這條工作日誌嗎？'))) return;
    try {
      await api.workLogs.delete(id);
      await loadLogs();
      await loadStats();
    } catch {
      showError('刪除失敗');
    }
  };

  const refreshOneLog = async () => {
    await loadLogs();
  };

  const handleImageUpload = async (logId: string, section: Section, file: File) => {
    await api.workLogs.images.upload(logId, section, file);
    await refreshOneLog();
  };

  const handleImageRemove = async (logId: string, section: Section, hash: string) => {
    if (!(await showConfirm('確定要刪除這張圖片？'))) return;
    await api.workLogs.images.delete(logId, hash, section);
    await refreshOneLog();
  };

  const canRemoveImage = (img: WorkLogImage, log: WorkLog): boolean =>
    img.uploader_id === currentUser.id || log.userId === currentUser.id || isManager;

  const toggleCard = (id: string) =>
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const charCountClass = (n: number) =>
    n > 500 ? 'text-red-600' : n > 300 ? 'text-amber-600' : 'text-slate-400';

  return (
    <div>
      {/* Manager submission stats */}
      {isManager && stats && stats.totalEligible > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-slate-900 text-sm">📊 今日提交率</h3>
            <span
              className="font-mono font-bold text-emerald-700"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {stats.submittedCount} / {stats.totalEligible}（
              {Math.round((stats.submittedCount / stats.totalEligible) * 100)}%）
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(stats.submittedCount / stats.totalEligible) * 100}%` }}
            />
          </div>
          {stats.notSubmitted.length > 0 && (
            <div className="text-xs text-slate-600">
              <span className="font-bold mr-2">未交：</span>
              {stats.notSubmitted.map((u) => (
                <button
                  key={u.userId}
                  onClick={() => {
                    setSelectedDept(u.department);
                    setSelectedUser(u.userId);
                  }}
                  className="inline-block mr-2 mb-1 px-2 py-0.5 bg-slate-100 hover:bg-amber-100 rounded text-slate-700 hover:text-amber-800"
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Date chips + filters + create button */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="flex gap-1">
          {[
            { label: '昨天', date: yesterdayStr(), mode: 'day' as DateMode },
            { label: '今天', date: todayStr(), mode: 'day' as DateMode },
            { label: '本週', date: '', mode: 'week' as DateMode },
          ].map((chip) => {
            const active = dateMode === chip.mode && (chip.mode === 'week' || selectedDate === chip.date);
            return (
              <button
                key={chip.label}
                onClick={() => {
                  setDateMode(chip.mode);
                  if (chip.mode === 'day') setSelectedDate(chip.date);
                }}
                className={`px-3 h-9 text-sm font-bold rounded-lg transition ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-stone-50 text-slate-600 hover:bg-stone-100 border border-slate-200'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        {dateMode === 'day' && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 h-9 bg-stone-50 border border-slate-200 rounded-lg text-sm"
          />
        )}

        {isManager && (
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setSelectedUser('ALL');
            }}
            className="px-3 h-9 bg-stone-50 border border-slate-200 rounded-lg text-sm"
            aria-label="部門"
          >
            <option value="ALL">全部部門</option>
            {availableDepts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="px-3 h-9 bg-stone-50 border border-slate-200 rounded-lg text-sm"
          aria-label="員工"
        >
          <option value="ALL">全部員工</option>
          {filteredUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <div className="ml-auto">
          <button
            onClick={handleCreate}
            className="px-4 h-10 bg-blue-600 text-white rounded-xl font-bold shadow-sm hover:bg-blue-700"
          >
            + 新增日誌
          </button>
        </div>
      </div>

      {/* Logs list */}
      {loading ? (
        <div className="text-center py-10 text-slate-400">載入中...</div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon="📓"
          title={
            dateMode === 'week'
              ? '本週還沒有工作日誌'
              : selectedDate === todayStr()
                ? '今天還沒有工作日誌'
                : '這天沒有工作日誌'
          }
          description={dateMode === 'day' && selectedDate === todayStr() ? '寫一篇記錄今日進度吧' : undefined}
          actionLabel={dateMode === 'day' && selectedDate === todayStr() ? '立刻寫今日日誌' : undefined}
          onAction={dateMode === 'day' && selectedDate === todayStr() ? handleCreate : undefined}
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const images = log.images || emptyImages();
            const isOwner = log.userId === currentUser.id;
            const isExpanded = expandedCards.has(log.id);
            const longest = Math.max(
              log.todayTasks.length, log.tomorrowTasks.length, log.notes.length
            );
            const needsCollapse = longest > 200;

            const renderSection = (label: string, text: string, imgs: WorkLogImage[], section: Section) => (
              <div className="mb-3">
                <div className="font-bold text-slate-700 text-sm mb-1">{label}</div>
                <div
                  className={`text-sm text-slate-700 whitespace-pre-wrap ${
                    needsCollapse && !isExpanded ? 'line-clamp-3' : ''
                  }`}
                >
                  {text || <span className="text-slate-400 italic">（無）</span>}
                </div>
                {imgs.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                    {imgs.map((img, idx) => (
                      <button
                        key={img.hash + idx}
                        onClick={() => setLightbox({ images: imgs, idx })}
                        className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 bg-slate-50"
                        aria-label={`預覽 ${img.filename}`}
                      >
                        <img
                          src={api.workLogs.images.getUrl(img.hash, img.filename)}
                          alt={img.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );

            return (
              <div key={log.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 transition">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <span className="font-bold text-slate-900">{log.userName}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-slate-600">{log.departmentName}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-slate-600">{log.date}</span>
                  </div>
                  {(isOwner || isManager) && (
                    <div className="flex gap-1">
                      {isOwner && (
                        <button
                          onClick={() => handleEdit(log)}
                          className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                        >
                          編輯
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                      >
                        刪除
                      </button>
                    </div>
                  )}
                </div>

                {renderSection('今日工作事項', log.todayTasks, images.today, 'today')}
                {renderSection('明天工作事項', log.tomorrowTasks, images.tomorrow, 'tomorrow')}
                {log.notes && renderSection('特別備註', log.notes, images.notes, 'notes')}

                {needsCollapse && (
                  <button
                    onClick={() => toggleCard(log.id)}
                    className="text-xs font-bold text-blue-600 hover:underline mt-1"
                  >
                    {isExpanded ? '收合' : '展開全文'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Image lightbox */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          initialIndex={lightbox.idx}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            style={{ animation: 'modalEnter 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-black text-slate-900 text-lg">
                {editingLog ? '編輯工作日誌' : '新增工作日誌'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="inline-flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                aria-label="關閉"
                title="關閉 (Esc)"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.28 3.22a.75.75 0 00-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 101.06 1.06L10 11.06l5.72 5.72a.75.75 0 101.06-1.06L11.06 10l5.72-5.72a.75.75 0 00-1.06-1.06L10 8.94 4.28 3.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-bold">
                  {formError}
                </div>
              )}

              {!editingLog && yesterdayLog && (
                <button
                  type="button"
                  onClick={handleCopyFromYesterday}
                  className="w-full px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-sm font-bold text-amber-800 flex items-center justify-center gap-2"
                >
                  📋 從昨日「明天工作事項」複製到今日
                </button>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">日期</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={!!editingLog}
                  className="w-full px-3 h-10 bg-stone-50 border border-slate-200 rounded-lg text-sm disabled:bg-slate-100 disabled:text-slate-500"
                  required
                />
              </div>

              {[
                { key: 'todayTasks', label: '今日工作事項', section: 'today' as Section, required: true },
                { key: 'tomorrowTasks', label: '明天工作事項', section: 'tomorrow' as Section, required: true },
                { key: 'notes', label: '特別備註', section: 'notes' as Section, required: false },
              ].map(({ key, label, section, required }) => {
                const value = (formData as any)[key] as string;
                const imgs = editingLog?.images?.[section] || [];
                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between mb-1">
                      <label className="block text-sm font-bold text-slate-700">
                        {label} {required && <span className="text-red-500">*</span>}
                      </label>
                      <span
                        className={`text-xs font-mono ${charCountClass(value.length)}`}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {value.length} / 500
                      </span>
                    </div>
                    <textarea
                      value={value}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                      rows={4}
                      placeholder={required ? `請輸入${label}...` : '其他需要注意的事項...'}
                      required={required}
                    />
                    {editingLog && (
                      <div className="mt-2">
                        <ImageUploader
                          images={imgs}
                          maxCount={10}
                          onAdd={(file) => handleImageUpload(editingLog.id, section, file)}
                          onRemove={(hash) => handleImageRemove(editingLog.id, section, hash)}
                          onPreview={(_, idx) => setLightbox({ images: imgs, idx })}
                          canRemove={(img) => canRemoveImage(img, editingLog)}
                          label="附件圖片"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {!editingLog && (
                <p className="text-xs text-slate-500 italic">
                  💡 提示：建立日誌後即可加入圖片附件
                </p>
              )}
            </form>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 h-10 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e as any)}
                className="px-5 h-10 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
              >
                {editingLog ? '更新' : '建立'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkLogTab;
```

- [ ] **Step 2: Add ESC key handler for the modal**

The modal uses `onClick={() => setIsModalOpen(false)}` for backdrop. To add ESC key support, add this `useEffect` near the other effects (after the WebSocket listener effect):

```tsx
useEffect(() => {
  if (!isModalOpen) return;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsModalOpen(false);
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [isModalOpen]);
```

- [ ] **Step 3: TypeScript check**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
npx tsc --noEmit 2>&1 | grep "WorkLogTab" | head -10
```

Expected: No errors.

- [ ] **Step 4: Build check**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
npm run build 2>&1 | tail -10
```

Expected: `✓ built in X.XXs`

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
git add components/WorkLogTab.tsx
git commit -m "feat(worklog): rewrite WorkLogTab with images, copy-yesterday, stats, date chips"
```

---

### Task 9: Local smoke test

**Files:** N/A

- [ ] **Step 1: Restart backend to pick up route changes**

```bash
netstat -ano | grep :3001 | grep LISTEN
```

Note the PID, then in PowerShell:
```powershell
Stop-Process -Id <PID> -Force
```

Then restart:
```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend"
node dist/index.js start
```
(run in background)

- [ ] **Step 2: Verify endpoints registered**

```bash
sleep 6
curl -s http://localhost:3001/api/health
```

Expected: `{"status":"ok",...}`

- [ ] **Step 3: Manual smoke test in browser**

Open http://localhost:3000 → login → 工作報表中心 → 工作日誌 tab.

Verify:
- [ ] Date chips (昨天/今天/本週) render and switch correctly
- [ ] As BOSS: 提交率面板顯示
- [ ] 新增日誌 → modal opens
- [ ] 寫今日 + 明天 → 建立
- [ ] 點編輯 → modal 再開 → 上傳圖片到「今日」段
- [ ] 卡片顯示圖片縮圖
- [ ] 點圖片 → lightbox 全螢幕
- [ ] ESC / 點背景 → lightbox 關閉
- [ ] ← → 鍵切換圖片
- [ ] 移除圖片 → 縮圖消失
- [ ] 刪除日誌 → 整篇消失
- [ ] 重新建立日誌時若昨日有 → 顯示「複製昨日明天規劃」按鈕
- [ ] 字數計超過 300 → 變橘色

- [ ] **Step 4 (optional): Push to GitHub (do not deploy)**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
git push origin master
```

**Do NOT run `bash deploy/deploy.sh`** — user said don't deploy.

---

## Self-Review Notes

**Spec coverage:**
| Spec section | Implementing task |
|--------------|-------------------|
| §2 視覺重做 | Task 8（重寫 WorkLogTab） |
| §3.1 複製昨日 | Task 8（fetchYesterdayLog + handleCopyFromYesterday）|
| §3.2 主管總覽 | Task 2 step 5（API）+ Task 8（render） |
| §3.3 日期 chips | Task 8（DateMode + chip buttons） |
| §3.4 卡片摺疊 + 字數計 | Task 8（expandedCards + charCountClass） |
| §4.1 DB schema | Task 1 |
| §4.2 限制 10MB/10/30 | Task 2 step 2（backend）+ Task 6（frontend） |
| §4.3 共用 blob | Task 2 step 2（reuse fileStorage）|
| §4.4 三個 API 端點 | Task 2 steps 2-4 |
| §4.5 cron 清理 | Task 3 |
| §5.1 ImageUploader | Task 6 |
| §5.1 ImageLightbox | Task 7 |
| §5.2 WorkLogTab 結構 | Task 8 |
| §5.3 API client | Task 5 |
| §6 權限矩陣 | Task 2 steps 2-4（後端 enforcement）+ Task 8（canRemoveImage） |

All spec items covered.

**Type consistency:**
- `WorkLogImage` / `WorkLogImages` / `SubmissionStats` defined in Task 4 → used consistently in Tasks 5, 6, 7, 8
- Section type `'today' | 'tomorrow' | 'notes'` consistent across Tasks 2, 5, 6, 8
- `images?: WorkLogImages` optional on WorkLog handles legacy records

**Placeholder scan:**
- No TBD/TODO/"implement later" in plan
- All steps have concrete code
- All commands have expected output

No issues found.
