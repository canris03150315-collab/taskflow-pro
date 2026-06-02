# 工作報表中心重做 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把現有的博弈業表單報表中心整個重做成「雲端硬碟風格的檔案管理系統」，含智慧版本管理、48 小時透明窗、軟刪除垃圾桶。

**Architecture:** 後端新增 3 張 DB 表 + 一組 `/api/files/*` 路由 + 檔案存硬碟（DB 只存 metadata）。前端重做 ReportView 為 4 個 tab：我的檔案、公司檔案、工作日誌（保留）、操作紀錄。SHA-256 hash 在 blob 層做去重不在邏輯層。

**Tech Stack:** Node.js + Express + better-sqlite3 + Knex migrations + React + TypeScript + Tailwind + SheetJS（xlsx）+ multer

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `backend/migrations/<timestamp>_create_files_tables.js` | Knex migration: files, file_versions, file_operations |
| Create | `backend/migrations/<timestamp>_backup_and_drop_old_reports.js` | 備份舊 reports 資料 + DROP 舊表 |
| Create | `backend/dist/services/fileStorage.js` | SHA-256 hash + blob 路徑 + 寫入硬碟 |
| Create | `backend/dist/services/filePermissions.js` | 集中權限判定 |
| Create | `backend/dist/services/fileService.js` | 檔案 CRUD 業務邏輯 |
| Create | `backend/dist/services/fileOperationsLog.js` | 記錄上傳/刪除/下載 |
| Create | `backend/dist/routes/files.js` | `/api/files/*` 路由群 |
| Create | `backend/dist/jobs/trashCleanup.js` | 48h 垃圾桶自動清理 cron |
| Modify | `backend/dist/server.js` | 註冊 files router + 啟動 cleanup cron |
| Create | `components/FileTypeIcon.tsx` | 檔案類型圖示組件 |
| Create | `components/files/UploadModal.tsx` | 智慧上傳對話框 |
| Create | `components/files/FileListItem.tsx` | 檔案列項目（含版本展開） |
| Create | `components/files/VersionList.tsx` | 版本歷史列表 |
| Create | `components/files/ExcelPreview.tsx` | Excel 預覽組件（SheetJS） |
| Create | `components/files/MyFilesTab.tsx` | 我的檔案 tab |
| Create | `components/files/CompanyFilesTab.tsx` | 公司檔案 tab |
| Create | `components/files/TrashView.tsx` | 垃圾桶 |
| Create | `components/files/OperationsLogTab.tsx` | 操作紀錄 tab（BOSS/MANAGER） |
| Modify | `components/ReportView.tsx` | 整個重寫，串接新 tab |
| Modify | `services/api.ts` | 新增 files API client |
| Modify | `types.ts` | 加入新型別、移除 ReportType/DailyReportContent 等 |
| Delete | `components/CreateReportView.tsx` | 舊報表表單，不再需要 |
| Delete | `components/ReportModal.tsx` | 舊報表 modal |
| Delete | `components/PlatformAccountsView.tsx` | 博弈業特定，已轉型 |
| Delete | `components/ApprovalModal.tsx` | 報表審批 modal，不再需要 |
| Delete | `components/AuthorizationStatus.tsx` | 報表雙重審核狀態，不再需要 |
| Modify | `App.tsx` | 移除上述被刪組件的 import + lazy load |

---

### Task 1: Knex Migration — Create files tables

**Files:**
- Create: `backend/migrations/20260429120000_create_files_tables.js`

- [ ] **Step 1: Create migration file**

```javascript
// backend/migrations/20260429120000_create_files_tables.js
exports.up = async function (knex) {
  await knex.schema.createTable('files', (t) => {
    t.text('id').primary();
    t.text('filename').notNullable();
    t.text('owner_id').notNullable();
    t.text('created_at').notNullable();
    t.text('latest_uploaded_at').notNullable();
    t.integer('is_deleted').defaultTo(0);
    t.foreign('owner_id').references('users.id');
  });
  await knex.schema.raw('CREATE INDEX idx_files_owner ON files(owner_id)');
  await knex.schema.raw('CREATE INDEX idx_files_filename_owner ON files(filename, owner_id)');
  await knex.schema.raw('CREATE INDEX idx_files_latest ON files(latest_uploaded_at)');

  await knex.schema.createTable('file_versions', (t) => {
    t.text('id').primary();
    t.text('file_id').notNullable();
    t.integer('version_no').notNullable();
    t.text('uploader_id').notNullable();
    t.text('uploaded_at').notNullable();
    t.text('content_hash').notNullable();
    t.text('blob_path').notNullable();
    t.integer('file_size').notNullable();
    t.text('mime_type').notNullable();
    t.text('note');
    t.integer('is_deleted').defaultTo(0);
    t.text('deleted_at');
    t.text('deleted_by');
    t.foreign('file_id').references('files.id');
    t.foreign('uploader_id').references('users.id');
    t.unique(['file_id', 'version_no']);
  });
  await knex.schema.raw('CREATE INDEX idx_versions_file ON file_versions(file_id)');
  await knex.schema.raw('CREATE INDEX idx_versions_uploader ON file_versions(uploader_id)');
  await knex.schema.raw('CREATE INDEX idx_versions_hash ON file_versions(content_hash)');
  await knex.schema.raw('CREATE INDEX idx_versions_deleted_at ON file_versions(deleted_at)');

  await knex.schema.createTable('file_operations', (t) => {
    t.text('id').primary();
    t.text('action').notNullable();
    t.text('actor_id').notNullable();
    t.text('file_id').notNullable();
    t.text('version_id');
    t.text('created_at').notNullable();
    t.text('ip_address');
    t.foreign('actor_id').references('users.id');
    t.foreign('file_id').references('files.id');
  });
  await knex.schema.raw('CREATE INDEX idx_ops_created ON file_operations(created_at)');
  await knex.schema.raw('CREATE INDEX idx_ops_actor ON file_operations(actor_id)');
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('file_operations');
  await knex.schema.dropTableIfExists('file_versions');
  await knex.schema.dropTableIfExists('files');
};
```

- [ ] **Step 2: Run migration locally**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend"
npx knex migrate:latest
```

Expected output: `Batch X run: 1 migrations`

- [ ] **Step 3: Verify tables exist**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend"
node -e "const db = require('better-sqlite3')('./data/taskflow.db'); console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('files','file_versions','file_operations')\").all());"
```

Expected: 3 rows

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/20260429120000_create_files_tables.js
git commit -m "feat(files): add knex migration for files/versions/operations tables"
```

---

### Task 2: Knex Migration — Backup and drop old reports tables

**Files:**
- Create: `backend/migrations/20260429120100_backup_and_drop_old_reports.js`

- [ ] **Step 1: Create backup-and-drop migration**

```javascript
// backend/migrations/20260429120100_backup_and_drop_old_reports.js
const fs = require('fs');
const path = require('path');

exports.up = async function (knex) {
  // Backup old reports data to JSON before dropping
  const backupDir = path.join(__dirname, '..', 'data', 'migrations');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const tablesToBackup = ['reports', 'report_authorizations'];
  const backup = {};
  for (const tableName of tablesToBackup) {
    const exists = await knex.schema.hasTable(tableName);
    if (exists) {
      backup[tableName] = await knex(tableName).select('*');
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `old-reports-backup-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`[Migration] Old reports backed up to ${backupPath}`);

  // Drop old tables
  await knex.schema.dropTableIfExists('report_authorizations');
  await knex.schema.dropTableIfExists('reports');
};

exports.down = async function () {
  // Restore is manual from JSON backup if needed
  throw new Error('Cannot auto-rollback; restore from JSON backup if needed');
};
```

- [ ] **Step 2: Run migration**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend"
npx knex migrate:latest
```

Expected: Backup JSON created in `backend/data/migrations/`, tables dropped.

- [ ] **Step 3: Verify backup exists and tables gone**

```bash
ls "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend/data/migrations/"
node -e "const db = require('better-sqlite3')('./data/taskflow.db'); console.log('reports exists:', !!db.prepare(\"SELECT name FROM sqlite_master WHERE name='reports'\").get());"
```

Expected: Backup JSON present; `reports exists: false`

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/20260429120100_backup_and_drop_old_reports.js
git commit -m "feat(files): backup and drop old reports tables before redesign"
```

---

### Task 3: Storage utilities

**Files:**
- Create: `backend/dist/services/fileStorage.js`

- [ ] **Step 1: Implement storage utilities**

```javascript
// backend/dist/services/fileStorage.js
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'data', 'uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

function computeHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function getBlobPath(hash, ext) {
  const prefix = hash.substring(0, 2);
  return path.join(UPLOAD_ROOT, prefix, `${hash}${ext}`);
}

function getRelativeBlobPath(hash, ext) {
  const prefix = hash.substring(0, 2);
  return `uploads/${prefix}/${hash}${ext}`;
}

function writeBlob(hash, ext, buffer) {
  ensureUploadDir();
  const fullPath = getBlobPath(hash, ext);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, buffer);
  }
  return getRelativeBlobPath(hash, ext);
}

function readBlob(relativePath) {
  const fullPath = path.join(__dirname, '..', '..', 'data', relativePath);
  return fs.readFileSync(fullPath);
}

function deleteBlob(relativePath) {
  const fullPath = path.join(__dirname, '..', '..', 'data', relativePath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

module.exports = {
  computeHash,
  getBlobPath,
  getRelativeBlobPath,
  writeBlob,
  readBlob,
  deleteBlob,
  ensureUploadDir,
};
```

- [ ] **Step 2: Smoke test in node REPL**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend"
node -e "
const s = require('./dist/services/fileStorage');
const buf = Buffer.from('hello world');
const hash = s.computeHash(buf);
console.log('Hash:', hash);
console.log('Path:', s.getRelativeBlobPath(hash, '.txt'));
"
```

Expected: 64-char hex hash + path like `uploads/b9/b94d...txt`

- [ ] **Step 3: Commit**

```bash
git add backend/dist/services/fileStorage.js
git commit -m "feat(files): add fileStorage utility for hash + blob IO"
```

---

### Task 4: Permission checker

**Files:**
- Create: `backend/dist/services/filePermissions.js`

- [ ] **Step 1: Implement permission rules**

```javascript
// backend/dist/services/filePermissions.js
'use strict';

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

function isManagerOrBoss(user) {
  return user.role === 'BOSS' || user.role === 'MANAGER';
}

function isWithin48h(uploadedAt) {
  const ts = new Date(uploadedAt).getTime();
  return Date.now() - ts < FORTY_EIGHT_HOURS_MS;
}

function canViewFile(user, file) {
  if (file.owner_id === user.id) return true;
  if (isManagerOrBoss(user)) return true;
  return isWithin48h(file.latest_uploaded_at);
}

function canDownloadVersion(user, file, version) {
  return canViewFile(user, file);
}

function canDeleteVersion(user, version) {
  return version.uploader_id === user.id || isManagerOrBoss(user);
}

function canViewOperationsLog(user) {
  return isManagerOrBoss(user);
}

function canViewTrash(user, deletedRecord) {
  if (isManagerOrBoss(user)) return true;
  return deletedRecord.deleted_by === user.id;
}

module.exports = {
  isManagerOrBoss,
  isWithin48h,
  canViewFile,
  canDownloadVersion,
  canDeleteVersion,
  canViewOperationsLog,
  canViewTrash,
};
```

- [ ] **Step 2: Smoke test**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend"
node -e "
const p = require('./dist/services/filePermissions');
const boss = { id: 'u1', role: 'BOSS' };
const emp = { id: 'u2', role: 'EMPLOYEE' };
const file = { owner_id: 'u3', latest_uploaded_at: new Date(Date.now() - 50*60*60*1000).toISOString() };
console.log('boss can view (>48h):', p.canViewFile(boss, file));   // true
console.log('emp can view (>48h):', p.canViewFile(emp, file));     // false
const recent = { owner_id: 'u3', latest_uploaded_at: new Date().toISOString() };
console.log('emp can view (<48h):', p.canViewFile(emp, recent));   // true
"
```

Expected: `true, false, true`

- [ ] **Step 3: Commit**

```bash
git add backend/dist/services/filePermissions.js
git commit -m "feat(files): add permission checker module"
```

---

### Task 5: File service — upload + version logic

**Files:**
- Create: `backend/dist/services/fileService.js`

- [ ] **Step 1: Implement core file service (upload + conflict check)**

```javascript
// backend/dist/services/fileService.js
'use strict';
const storage = require('./fileStorage');
const path = require('path');

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getExt(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * Check conflict before upload.
 * Returns: { same_user_match, cross_user_matches }
 */
function checkConflict(db, currentUser, filename, contentHash) {
  const sameUser = db
    .prepare(
      `SELECT f.id AS file_id,
              (SELECT COUNT(*) FROM file_versions WHERE file_id = f.id AND is_deleted = 0) AS version_count,
              (SELECT MAX(version_no) FROM file_versions WHERE file_id = f.id AND is_deleted = 0) AS latest_version_no
         FROM files f
         WHERE f.owner_id = ? AND f.filename = ? AND f.is_deleted = 0
         LIMIT 1`
    )
    .get(currentUser.id, filename);

  const crossUsers = db
    .prepare(
      `SELECT f.id AS file_id, f.owner_id,
              u.name AS owner_name,
              (SELECT COUNT(*) FROM file_versions WHERE file_id = f.id AND is_deleted = 0) AS version_count,
              (SELECT content_hash FROM file_versions WHERE file_id = f.id AND is_deleted = 0
                 ORDER BY version_no DESC LIMIT 1) AS latest_hash
         FROM files f
         JOIN users u ON u.id = f.owner_id
         WHERE f.owner_id != ? AND f.filename = ? AND f.is_deleted = 0`
    )
    .all(currentUser.id, filename);

  return {
    same_user_match: sameUser || null,
    cross_user_matches: crossUsers.map((c) => ({
      file_id: c.file_id,
      owner_id: c.owner_id,
      owner_name: c.owner_name,
      version_count: c.version_count,
      hash_matches_latest: c.latest_hash === contentHash,
    })),
  };
}

/**
 * Upload a file.
 *
 * targetFileId:
 *   - undefined → create new file record (uploader is owner)
 *   - given     → add as new version to existing file (caller must have permission)
 */
function uploadFile(db, currentUser, { filename, buffer, mimeType, note, targetFileId }) {
  const contentHash = storage.computeHash(buffer);
  const ext = getExt(filename);
  const blobPath = storage.writeBlob(contentHash, ext, buffer);
  const now = new Date().toISOString();

  let fileId, versionNo;

  if (targetFileId) {
    // Add new version to existing file
    const file = db.prepare('SELECT * FROM files WHERE id = ? AND is_deleted = 0').get(targetFileId);
    if (!file) throw new Error('Target file not found');
    fileId = targetFileId;

    const maxVer = db
      .prepare('SELECT MAX(version_no) AS max_no FROM file_versions WHERE file_id = ?')
      .get(targetFileId);
    versionNo = (maxVer.max_no || 0) + 1;

    db.prepare('UPDATE files SET latest_uploaded_at = ? WHERE id = ?').run(now, fileId);
  } else {
    // Create new file
    fileId = genId('file');
    versionNo = 1;
    db.prepare(
      `INSERT INTO files (id, filename, owner_id, created_at, latest_uploaded_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, 0)`
    ).run(fileId, filename, currentUser.id, now, now);
  }

  const versionId = genId('ver');
  db.prepare(
    `INSERT INTO file_versions
     (id, file_id, version_no, uploader_id, uploaded_at, content_hash, blob_path, file_size, mime_type, note, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    versionId, fileId, versionNo, currentUser.id, now,
    contentHash, blobPath, buffer.length, mimeType, note || null
  );

  return { file_id: fileId, version_id: versionId, version_no: versionNo, uploaded_at: now };
}

module.exports = { checkConflict, uploadFile, genId };
```

- [ ] **Step 2: Commit**

```bash
git add backend/dist/services/fileService.js
git commit -m "feat(files): add file service for upload + conflict check"
```

---

### Task 6: File service — read/list/delete operations

**Files:**
- Modify: `backend/dist/services/fileService.js`

- [ ] **Step 1: Append read/list/delete functions**

Append to the bottom of `backend/dist/services/fileService.js` (before `module.exports`):

```javascript
/**
 * List files visible to user, filtered by scope.
 *
 * scope = 'mine'    → files where owner_id = currentUser.id
 * scope = 'company' → all files (BOSS/MANAGER) or 48h-window files (EMPLOYEE)
 */
function listFiles(db, currentUser, { scope = 'mine', q, uploaderId, fromDate, toDate, fileType } = {}) {
  const params = [];
  const whereClauses = ['f.is_deleted = 0'];

  if (scope === 'mine') {
    whereClauses.push('f.owner_id = ?');
    params.push(currentUser.id);
  } else if (scope === 'company') {
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      whereClauses.push('f.latest_uploaded_at >= ?');
      params.push(fortyEightHoursAgo);
    }
  }

  if (q) {
    whereClauses.push('f.filename LIKE ?');
    params.push(`%${q}%`);
  }

  if (uploaderId) {
    whereClauses.push(
      `EXISTS (SELECT 1 FROM file_versions v WHERE v.file_id = f.id AND v.uploader_id = ? AND v.is_deleted = 0)`
    );
    params.push(uploaderId);
  }

  if (fromDate) {
    whereClauses.push('f.latest_uploaded_at >= ?');
    params.push(fromDate);
  }

  if (toDate) {
    whereClauses.push('f.latest_uploaded_at <= ?');
    params.push(toDate);
  }

  const sql = `
    SELECT f.*, u.name AS owner_name,
      (SELECT COUNT(*) FROM file_versions WHERE file_id = f.id AND is_deleted = 0) AS version_count,
      (SELECT MAX(version_no) FROM file_versions WHERE file_id = f.id AND is_deleted = 0) AS latest_version_no,
      (SELECT uploader_id FROM file_versions WHERE file_id = f.id AND is_deleted = 0 ORDER BY version_no DESC LIMIT 1) AS latest_uploader_id,
      (SELECT file_size FROM file_versions WHERE file_id = f.id AND is_deleted = 0 ORDER BY version_no DESC LIMIT 1) AS latest_file_size,
      (SELECT mime_type FROM file_versions WHERE file_id = f.id AND is_deleted = 0 ORDER BY version_no DESC LIMIT 1) AS latest_mime_type
    FROM files f
    LEFT JOIN users u ON u.id = f.owner_id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY f.latest_uploaded_at DESC
  `;

  const rows = db.prepare(sql).all(...params);

  if (fileType) {
    return rows.filter((r) => matchesFileType(r.latest_mime_type, fileType));
  }
  return rows;
}

function matchesFileType(mime, type) {
  const map = {
    excel: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
    word: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
    pdf: ['application/pdf'],
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    powerpoint: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ],
    csv: ['text/csv'],
    text: ['text/plain'],
  };
  return (map[type] || []).includes(mime);
}

function getFileDetail(db, fileId) {
  const file = db
    .prepare('SELECT f.*, u.name AS owner_name FROM files f LEFT JOIN users u ON u.id = f.owner_id WHERE f.id = ?')
    .get(fileId);
  if (!file) return null;
  const versions = db
    .prepare(
      `SELECT v.*, u.name AS uploader_name
         FROM file_versions v
         LEFT JOIN users u ON u.id = v.uploader_id
         WHERE v.file_id = ? AND v.is_deleted = 0
         ORDER BY v.version_no DESC`
    )
    .all(fileId);
  return { ...file, versions };
}

function getVersion(db, fileId, versionNo) {
  return db
    .prepare('SELECT * FROM file_versions WHERE file_id = ? AND version_no = ? AND is_deleted = 0')
    .get(fileId, versionNo);
}

function softDeleteVersion(db, currentUser, versionId) {
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE file_versions SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE id = ?'
  ).run(now, currentUser.id, versionId);

  // If all versions of this file are deleted, mark file as deleted too
  const v = db.prepare('SELECT file_id FROM file_versions WHERE id = ?').get(versionId);
  if (v) {
    const remaining = db
      .prepare('SELECT COUNT(*) AS n FROM file_versions WHERE file_id = ? AND is_deleted = 0')
      .get(v.file_id);
    if (remaining.n === 0) {
      db.prepare('UPDATE files SET is_deleted = 1 WHERE id = ?').run(v.file_id);
    }
  }
}

function restoreVersion(db, versionId) {
  const v = db.prepare('SELECT file_id FROM file_versions WHERE id = ?').get(versionId);
  if (!v) return;
  db.prepare(
    'UPDATE file_versions SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?'
  ).run(versionId);
  // Un-delete the parent file if it was marked deleted
  db.prepare('UPDATE files SET is_deleted = 0 WHERE id = ?').run(v.file_id);
}

function listTrash(db, currentUser) {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';

  const sql = isManager
    ? `SELECT v.*, f.filename, u.name AS deleter_name
         FROM file_versions v
         JOIN files f ON f.id = v.file_id
         LEFT JOIN users u ON u.id = v.deleted_by
         WHERE v.is_deleted = 1 AND v.deleted_at >= ?
         ORDER BY v.deleted_at DESC`
    : `SELECT v.*, f.filename, u.name AS deleter_name
         FROM file_versions v
         JOIN files f ON f.id = v.file_id
         LEFT JOIN users u ON u.id = v.deleted_by
         WHERE v.is_deleted = 1 AND v.deleted_at >= ? AND v.deleted_by = ?
         ORDER BY v.deleted_at DESC`;

  return isManager
    ? db.prepare(sql).all(fortyEightHoursAgo)
    : db.prepare(sql).all(fortyEightHoursAgo, currentUser.id);
}

module.exports = {
  checkConflict,
  uploadFile,
  listFiles,
  getFileDetail,
  getVersion,
  softDeleteVersion,
  restoreVersion,
  listTrash,
  genId,
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/dist/services/fileService.js
git commit -m "feat(files): add list/detail/delete/restore/trash operations"
```

---

### Task 7: Operations log service

**Files:**
- Create: `backend/dist/services/fileOperationsLog.js`

- [ ] **Step 1: Implement log service**

```javascript
// backend/dist/services/fileOperationsLog.js
'use strict';
const { genId } = require('./fileService');

function logOperation(db, { action, actorId, fileId, versionId, ipAddress }) {
  const id = genId('op');
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO file_operations (id, action, actor_id, file_id, version_id, created_at, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, action, actorId, fileId, versionId || null, createdAt, ipAddress || null);
}

function listOperations(db, { action, actorId, fromDate, toDate, limit = 200 } = {}) {
  const where = [];
  const params = [];
  if (action) { where.push('o.action = ?'); params.push(action); }
  if (actorId) { where.push('o.actor_id = ?'); params.push(actorId); }
  if (fromDate) { where.push('o.created_at >= ?'); params.push(fromDate); }
  if (toDate) { where.push('o.created_at <= ?'); params.push(toDate); }

  const sql = `
    SELECT o.*, u.name AS actor_name, f.filename, v.version_no
      FROM file_operations o
      LEFT JOIN users u ON u.id = o.actor_id
      LEFT JOIN files f ON f.id = o.file_id
      LEFT JOIN file_versions v ON v.id = o.version_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY o.created_at DESC
      LIMIT ?
  `;
  return db.prepare(sql).all(...params, limit);
}

module.exports = { logOperation, listOperations };
```

- [ ] **Step 2: Commit**

```bash
git add backend/dist/services/fileOperationsLog.js
git commit -m "feat(files): add operations log service"
```

---

### Task 8: API routes — skeleton + check-conflict + upload

**Files:**
- Create: `backend/dist/routes/files.js`
- Modify: `backend/dist/server.js`

- [ ] **Step 1: Install multer**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend"
npm install multer
```

- [ ] **Step 2: Create files router**

```javascript
// backend/dist/routes/files.js
'use strict';
const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const fileService = require('../services/fileService');
const storage = require('../services/fileStorage');
const perms = require('../services/filePermissions');
const opsLog = require('../services/fileOperationsLog');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/pdf',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

// POST /check-conflict
router.post('/check-conflict', authenticateToken, (req, res) => {
  try {
    const { filename, content_hash } = req.body;
    if (!filename || !content_hash) {
      return res.status(400).json({ error: '缺少 filename 或 content_hash' });
    }
    const result = fileService.checkConflict(req.db, req.user, filename, content_hash);
    res.json(result);
  } catch (err) {
    console.error('[files] check-conflict error:', err.message);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// POST /upload
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '請選擇檔案' });
    if (!ALLOWED_MIME.has(req.file.mimetype)) {
      return res.status(400).json({ error: '不支援的檔案類型' });
    }

    const { target_file_id, note } = req.body;

    // Permission: if target_file_id given, ensure user can add version to that file
    if (target_file_id) {
      const file = req.db.prepare('SELECT * FROM files WHERE id = ? AND is_deleted = 0').get(target_file_id);
      if (!file) return res.status(404).json({ error: '目標檔案不存在' });
      if (!perms.canViewFile(req.user, file)) {
        return res.status(403).json({ error: '無權限新增版本到此檔案' });
      }
    }

    const result = fileService.uploadFile(req.db, req.user, {
      filename: req.file.originalname,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      note,
      targetFileId: target_file_id,
    });

    opsLog.logOperation(req.db, {
      action: 'upload',
      actorId: req.user.id,
      fileId: result.file_id,
      versionId: result.version_id,
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (err) {
    console.error('[files] upload error:', err.message);
    res.status(500).json({ error: '上傳失敗' });
  }
});

exports.filesRoutes = router;
```

- [ ] **Step 3: Register router in server.js**

In `backend/dist/server.js`, locate the route registration block (e.g. near `this.app.use('/api/reports', ...)`). Add this line and also add the require at the top:

```javascript
// Top of file, with other route requires:
const filesRoutesModule = require('./routes/files');

// In setupRoutes() method, with other this.app.use(...) calls:
this.app.use('/api/files', filesRoutesModule.filesRoutes);
```

Also REMOVE the old reports route registration (since we dropped that table):

```javascript
// DELETE these lines:
// const reports_1 = require("./routes/reports");
// this.app.use('/api/reports', reports_1.reportRoutes);
```

- [ ] **Step 4: Smoke test (start server, curl)**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend"
node dist/index.js start
```

In another terminal, test (need real auth token from login):
```bash
curl -X POST http://localhost:3001/api/files/check-conflict \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.xlsx","content_hash":"abc123"}'
```

Expected: `{"same_user_match":null,"cross_user_matches":[]}`

- [ ] **Step 5: Commit**

```bash
git add backend/dist/routes/files.js backend/dist/server.js backend/package.json backend/package-lock.json
git commit -m "feat(files): add /api/files routes + multer for upload"
```

---

### Task 9: API routes — list / detail / download

**Files:**
- Modify: `backend/dist/routes/files.js`

- [ ] **Step 1: Append list/detail/download endpoints**

Add these routes BEFORE `exports.filesRoutes = router;`:

```javascript
// GET /
router.get('/', authenticateToken, (req, res) => {
  try {
    const { scope, q, uploader_id, from_date, to_date, file_type } = req.query;
    const rows = fileService.listFiles(req.db, req.user, {
      scope: scope || 'mine',
      q,
      uploaderId: uploader_id,
      fromDate: from_date,
      toDate: to_date,
      fileType: file_type,
    });
    res.json({ files: rows });
  } catch (err) {
    console.error('[files] list error:', err.message);
    res.status(500).json({ error: '取得檔案列表失敗' });
  }
});

// GET /:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const detail = fileService.getFileDetail(req.db, req.params.id);
    if (!detail || detail.is_deleted) return res.status(404).json({ error: '檔案不存在' });
    if (!perms.canViewFile(req.user, detail)) return res.status(403).json({ error: '無權限查看此檔案' });
    res.json(detail);
  } catch (err) {
    console.error('[files] detail error:', err.message);
    res.status(500).json({ error: '取得檔案詳情失敗' });
  }
});

// GET /:id/v/:n — download
router.get('/:id/v/:n', authenticateToken, (req, res) => {
  try {
    const file = req.db.prepare('SELECT * FROM files WHERE id = ? AND is_deleted = 0').get(req.params.id);
    if (!file) return res.status(404).json({ error: '檔案不存在' });
    if (!perms.canViewFile(req.user, file)) return res.status(403).json({ error: '無權限下載' });

    const version = fileService.getVersion(req.db, req.params.id, parseInt(req.params.n, 10));
    if (!version) return res.status(404).json({ error: '版本不存在' });

    const buffer = storage.readBlob(version.blob_path);

    opsLog.logOperation(req.db, {
      action: 'download',
      actorId: req.user.id,
      fileId: file.id,
      versionId: version.id,
      ipAddress: req.ip,
    });

    res.set('Content-Type', version.mime_type);
    res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
    res.send(buffer);
  } catch (err) {
    console.error('[files] download error:', err.message);
    res.status(500).json({ error: '下載失敗' });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/dist/routes/files.js
git commit -m "feat(files): add list / detail / download endpoints"
```

---

### Task 10: API route — preview (Excel + PDF)

**Files:**
- Modify: `backend/dist/routes/files.js`

- [ ] **Step 1: Install xlsx in backend**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部/backend"
npm install xlsx
```

- [ ] **Step 2: Add preview endpoint**

Add to `backend/dist/routes/files.js` BEFORE `exports.filesRoutes = router;`:

```javascript
const xlsx = require('xlsx');

// GET /:id/v/:n/preview
router.get('/:id/v/:n/preview', authenticateToken, (req, res) => {
  try {
    const file = req.db.prepare('SELECT * FROM files WHERE id = ? AND is_deleted = 0').get(req.params.id);
    if (!file) return res.status(404).json({ error: '檔案不存在' });
    if (!perms.canViewFile(req.user, file)) return res.status(403).json({ error: '無權限預覽' });

    const version = fileService.getVersion(req.db, req.params.id, parseInt(req.params.n, 10));
    if (!version) return res.status(404).json({ error: '版本不存在' });

    const isExcel =
      version.mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      version.mime_type === 'application/vnd.ms-excel';

    if (isExcel) {
      if (version.file_size > 5 * 1024 * 1024) {
        return res.json({ type: 'oversized', message: '檔案過大，請下載查看' });
      }
      const buffer = storage.readBlob(version.blob_path);
      const wb = xlsx.read(buffer, { type: 'buffer' });
      const sheets = wb.SheetNames.map((name) => ({
        name,
        data: xlsx.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' }),
      }));
      return res.json({ type: 'excel', sheets });
    }

    if (version.mime_type === 'application/pdf') {
      const buffer = storage.readBlob(version.blob_path);
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
      return res.send(buffer);
    }

    res.json({ type: 'unsupported', message: '此檔案類型不支援預覽，請下載查看' });
  } catch (err) {
    console.error('[files] preview error:', err.message);
    res.status(500).json({ error: '預覽失敗' });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add backend/dist/routes/files.js backend/package.json backend/package-lock.json
git commit -m "feat(files): add preview endpoint (Excel JSON + PDF passthrough)"
```

---

### Task 11: API routes — delete / restore / trash / operations

**Files:**
- Modify: `backend/dist/routes/files.js`

- [ ] **Step 1: Append remaining endpoints**

Add BEFORE `exports.filesRoutes = router;`:

```javascript
// DELETE /:id/v/:n — soft delete version
router.delete('/:id/v/:n', authenticateToken, (req, res) => {
  try {
    const version = fileService.getVersion(req.db, req.params.id, parseInt(req.params.n, 10));
    if (!version) return res.status(404).json({ error: '版本不存在' });
    if (!perms.canDeleteVersion(req.user, version)) {
      return res.status(403).json({ error: '無權限刪除此版本' });
    }
    fileService.softDeleteVersion(req.db, req.user, version.id);
    opsLog.logOperation(req.db, {
      action: 'delete',
      actorId: req.user.id,
      fileId: req.params.id,
      versionId: version.id,
      ipAddress: req.ip,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[files] delete error:', err.message);
    res.status(500).json({ error: '刪除失敗' });
  }
});

// POST /:id/v/:n/restore
router.post('/:id/v/:n/restore', authenticateToken, (req, res) => {
  try {
    const version = req.db
      .prepare('SELECT * FROM file_versions WHERE file_id = ? AND version_no = ?')
      .get(req.params.id, parseInt(req.params.n, 10));
    if (!version) return res.status(404).json({ error: '版本不存在' });
    if (!perms.canDeleteVersion(req.user, version)) {
      return res.status(403).json({ error: '無權限救回此版本' });
    }
    fileService.restoreVersion(req.db, version.id);
    opsLog.logOperation(req.db, {
      action: 'restore',
      actorId: req.user.id,
      fileId: req.params.id,
      versionId: version.id,
      ipAddress: req.ip,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[files] restore error:', err.message);
    res.status(500).json({ error: '救回失敗' });
  }
});

// GET /trash
router.get('/trash/list', authenticateToken, (req, res) => {
  try {
    const items = fileService.listTrash(req.db, req.user);
    res.json({ items });
  } catch (err) {
    console.error('[files] trash error:', err.message);
    res.status(500).json({ error: '取得垃圾桶失敗' });
  }
});

// GET /operations
router.get('/operations/list', authenticateToken, (req, res) => {
  try {
    if (!perms.canViewOperationsLog(req.user)) {
      return res.status(403).json({ error: '無權限查看操作紀錄' });
    }
    const { action, actor_id, from_date, to_date } = req.query;
    const items = opsLog.listOperations(req.db, {
      action,
      actorId: actor_id,
      fromDate: from_date,
      toDate: to_date,
    });
    res.json({ items });
  } catch (err) {
    console.error('[files] operations error:', err.message);
    res.status(500).json({ error: '取得操作紀錄失敗' });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/dist/routes/files.js
git commit -m "feat(files): add delete / restore / trash / operations endpoints"
```

---

### Task 12: Trash cleanup cron job

**Files:**
- Create: `backend/dist/jobs/trashCleanup.js`
- Modify: `backend/dist/server.js`

- [ ] **Step 1: Implement cleanup job**

```javascript
// backend/dist/jobs/trashCleanup.js
'use strict';
const storage = require('../services/fileStorage');

/**
 * Clean up versions soft-deleted more than 48 hours ago.
 * - Permanently delete version rows
 * - If a hash has no remaining references, delete the blob file
 */
function runCleanup(db) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const expiredVersions = db
    .prepare('SELECT id, content_hash, blob_path FROM file_versions WHERE is_deleted = 1 AND deleted_at < ?')
    .all(cutoff);

  if (expiredVersions.length === 0) return { deleted: 0, blobsRemoved: 0 };

  let blobsRemoved = 0;
  for (const v of expiredVersions) {
    db.prepare('DELETE FROM file_versions WHERE id = ?').run(v.id);

    // If no remaining refs to this hash, remove blob
    const refs = db
      .prepare('SELECT COUNT(*) AS n FROM file_versions WHERE content_hash = ?')
      .get(v.content_hash);
    if (refs.n === 0) {
      try {
        storage.deleteBlob(v.blob_path);
        blobsRemoved++;
      } catch (e) {
        console.warn(`[trashCleanup] Failed to delete blob ${v.blob_path}:`, e.message);
      }
    }
  }

  // Also clean up files records that have NO versions at all
  db.prepare(
    `DELETE FROM files WHERE id IN (
       SELECT f.id FROM files f
       LEFT JOIN file_versions v ON v.file_id = f.id
       WHERE v.id IS NULL
     )`
  ).run();

  return { deleted: expiredVersions.length, blobsRemoved };
}

function startCleanupCron(db, intervalMs = 60 * 60 * 1000) {
  // Run every hour
  setInterval(() => {
    try {
      const result = runCleanup(db);
      if (result.deleted > 0) {
        console.log(
          `[trashCleanup] Removed ${result.deleted} expired versions, ${result.blobsRemoved} blobs`
        );
      }
    } catch (err) {
      console.error('[trashCleanup] Error:', err.message);
    }
  }, intervalMs);
}

module.exports = { runCleanup, startCleanupCron };
```

- [ ] **Step 2: Wire up cron in server.js**

In `backend/dist/server.js`, find where the server starts (e.g. after `db.initialize()`). Add:

```javascript
// At top of file:
const trashCleanup = require('./jobs/trashCleanup');

// After db is initialized (look for db.initialize() or similar):
trashCleanup.startCleanupCron(this.db);
console.log('[Server] Trash cleanup cron started (runs every hour)');
```

- [ ] **Step 3: Commit**

```bash
git add backend/dist/jobs/trashCleanup.js backend/dist/server.js
git commit -m "feat(files): add 48h trash cleanup cron job"
```

---

### Task 13: Frontend — api.ts client

**Files:**
- Modify: `services/api.ts`

- [ ] **Step 1: Append files API client**

Find the `api = {` object in `services/api.ts` and add a `files` section. Look for similar sections like `attendance:` for the pattern.

```typescript
files: {
  async computeHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  },

  async checkConflict(filename: string, contentHash: string): Promise<any> {
    return request('POST', '/files/check-conflict', { filename, content_hash: contentHash });
  },

  async upload(file: File, targetFileId?: string, note?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (targetFileId) formData.append('target_file_id', targetFileId);
    if (note) formData.append('note', note);

    const token = localStorage.getItem('token');
    const res = await fetch('/api/files/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Upload failed: ${res.status}`);
    }
    return res.json();
  },

  async list(scope: 'mine' | 'company', filters: any = {}): Promise<any[]> {
    const params = new URLSearchParams({ scope, ...filters });
    const res = await request<{ files: any[] }>('GET', `/files?${params.toString()}`);
    return res.files || [];
  },

  async getDetail(fileId: string): Promise<any> {
    return request('GET', `/files/${fileId}`);
  },

  async getPreview(fileId: string, versionNo: number): Promise<any> {
    return request('GET', `/files/${fileId}/v/${versionNo}/preview`);
  },

  getDownloadUrl(fileId: string, versionNo: number): string {
    return `/api/files/${fileId}/v/${versionNo}`;
  },

  async deleteVersion(fileId: string, versionNo: number): Promise<void> {
    await request('DELETE', `/files/${fileId}/v/${versionNo}`);
  },

  async restoreVersion(fileId: string, versionNo: number): Promise<void> {
    await request('POST', `/files/${fileId}/v/${versionNo}/restore`, {});
  },

  async listTrash(): Promise<any[]> {
    const res = await request<{ items: any[] }>('GET', '/files/trash/list');
    return res.items || [];
  },

  async listOperations(filters: any = {}): Promise<any[]> {
    const params = new URLSearchParams(filters);
    const res = await request<{ items: any[] }>('GET', `/files/operations/list?${params.toString()}`);
    return res.items || [];
  },
},
```

- [ ] **Step 2: Commit**

```bash
git add services/api.ts
git commit -m "feat(files): add files API client"
```

---

### Task 14: Frontend — types and shared components

**Files:**
- Modify: `types.ts`
- Create: `components/FileTypeIcon.tsx`

- [ ] **Step 1: Add file types and remove obsolete ones**

In `types.ts`:
- Delete: `ReportType` enum, `DailyReportContent` interface, `Report` interface, `ReportAuthorization` interface (and any references)
- Add:

```typescript
// --- File Management Types ---
export interface FileRecord {
  id: string;
  filename: string;
  owner_id: string;
  owner_name?: string;
  created_at: string;
  latest_uploaded_at: string;
  is_deleted: number;
  version_count?: number;
  latest_version_no?: number;
  latest_uploader_id?: string;
  latest_file_size?: number;
  latest_mime_type?: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_no: number;
  uploader_id: string;
  uploader_name?: string;
  uploaded_at: string;
  content_hash: string;
  blob_path: string;
  file_size: number;
  mime_type: string;
  note?: string;
  is_deleted: number;
  deleted_at?: string;
  deleted_by?: string;
}

export interface FileOperation {
  id: string;
  action: 'upload' | 'delete' | 'download' | 'restore';
  actor_id: string;
  actor_name?: string;
  file_id: string;
  filename?: string;
  version_id?: string;
  version_no?: number;
  created_at: string;
  ip_address?: string;
}

export interface ConflictCheckResult {
  same_user_match: { file_id: string; version_count: number; latest_version_no: number } | null;
  cross_user_matches: Array<{
    file_id: string;
    owner_id: string;
    owner_name: string;
    version_count: number;
    hash_matches_latest: boolean;
  }>;
}
```

- [ ] **Step 2: Create FileTypeIcon component**

```tsx
// components/FileTypeIcon.tsx
import React from 'react';

interface FileTypeIconProps {
  mimeType?: string;
  className?: string;
}

const getTypeInfo = (mime?: string) => {
  if (!mime) return { color: 'slate', label: '檔案' };
  if (mime.includes('spreadsheet') || mime.includes('excel')) return { color: 'emerald', label: 'Excel' };
  if (mime.includes('word')) return { color: 'blue', label: 'Word' };
  if (mime.includes('presentation') || mime.includes('powerpoint'))
    return { color: 'orange', label: 'PowerPoint' };
  if (mime.includes('pdf')) return { color: 'red', label: 'PDF' };
  if (mime.startsWith('image/')) return { color: 'purple', label: 'Image' };
  if (mime.includes('csv') || mime === 'text/plain') return { color: 'slate', label: 'Text' };
  return { color: 'slate', label: '檔案' };
};

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string }> = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600' },
};

export const FileTypeIcon: React.FC<FileTypeIconProps> = ({ mimeType, className = '' }) => {
  const info = getTypeInfo(mimeType);
  const cls = COLOR_CLASSES[info.color];
  return (
    <div
      className={`w-11 h-11 rounded-xl ${cls.bg} border ${cls.border} flex items-center justify-center ${className}`}
      aria-label={info.label}
    >
      <svg className={`w-6 h-6 ${cls.text}`} viewBox="0 0 20 20" fill="currentColor">
        <path d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0117 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13z" />
      </svg>
    </div>
  );
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
```

- [ ] **Step 3: Commit**

```bash
git add types.ts components/FileTypeIcon.tsx
git commit -m "feat(files): add types and FileTypeIcon component"
```

---

### Task 15: Frontend — UploadModal

**Files:**
- Create: `components/files/UploadModal.tsx`

- [ ] **Step 1: Create UploadModal**

```tsx
// components/files/UploadModal.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { ConflictCheckResult } from '../../types';
import { FileTypeIcon, formatFileSize } from '../FileTypeIcon';

interface UploadModalProps {
  file: File;
  onClose: () => void;
  onUploaded: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ file, onClose, onUploaded }) => {
  const toast = useToast();
  const [conflict, setConflict] = useState<ConflictCheckResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [targetFileId, setTargetFileId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const hash = await api.files.computeHash(file);
        const result = await api.files.checkConflict(file.name, hash);

        // Silent path: same uploader has this file → auto-upload as new version
        if (result.same_user_match) {
          setUploading(true);
          const r = await api.files.upload(file, result.same_user_match.file_id);
          toast.success(`已加為 v${r.version_no}：${file.name}`);
          onUploaded();
          onClose();
          return;
        }

        // No matches → silent upload as new file
        if (!result.cross_user_matches.length) {
          setUploading(true);
          await api.files.upload(file);
          toast.success(`已上傳：${file.name}`);
          onUploaded();
          onClose();
          return;
        }

        // Cross-user matches → show modal
        setConflict(result);
        setChecking(false);
      } catch (err: any) {
        toast.error(err.message || '檢查衝突失敗');
        onClose();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    setUploading(true);
    try {
      const r = await api.files.upload(file, targetFileId, note || undefined);
      toast.success(targetFileId ? `已加為對方的 v${r.version_no}` : `已建立新檔：${file.name}`);
      onUploaded();
      onClose();
    } catch (err: any) {
      toast.error(err.message || '上傳失敗');
      setUploading(false);
    }
  };

  if (checking) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 text-slate-600">分析檔案中...</div>
      </div>
    );
  }

  if (!conflict) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <FileTypeIcon mimeType={file.type} className="!w-9 !h-9" />
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-sm">即將上傳：{file.name}</h3>
            <p className="text-xs text-slate-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
            系統發現有 {conflict.cross_user_matches.length} 位同事也有「{file.name}」。要加為對方的新版本嗎？
          </div>

          {conflict.cross_user_matches.map((m) => (
            <label
              key={m.file_id}
              className={`block border-2 rounded-xl p-3 cursor-pointer transition ${
                targetFileId === m.file_id
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="target"
                  className="accent-blue-600"
                  checked={targetFileId === m.file_id}
                  onChange={() => setTargetFileId(m.file_id)}
                />
                <div className="flex-1">
                  <div className="font-bold text-slate-900 text-sm">
                    加為 {m.owner_name} 的新版本（v{m.version_count + 1}）
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    會顯示在 {m.owner_name} 的「我的檔案」
                    {m.hash_matches_latest && (
                      <span className="ml-2 text-emerald-600">✓ 內容與最新版相同</span>
                    )}
                  </div>
                </div>
              </div>
            </label>
          ))}

          <label
            className={`block border-2 rounded-xl p-3 cursor-pointer transition ${
              targetFileId === undefined && conflict.cross_user_matches.length > 0
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="target"
                className="accent-blue-600"
                checked={targetFileId === undefined}
                onChange={() => setTargetFileId(undefined)}
              />
              <div className="flex-1">
                <div className="font-bold text-slate-900 text-sm">
                  建立我自己的「{file.name}」（v1）
                </div>
                <div className="text-xs text-slate-500 mt-0.5">會在我的「我的檔案」獨立成新檔</div>
              </div>
            </div>
          </label>

          <textarea
            className="w-full px-3 py-2 bg-stone-50 border border-slate-200 rounded-lg text-sm"
            rows={2}
            placeholder="版本備註（選填）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="px-5 py-3 bg-stone-50 border-t border-slate-100 flex justify-end gap-2">
          <button
            className="px-3 py-1.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded"
            onClick={onClose}
            disabled={uploading}
          >
            取消
          </button>
          <button
            className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
            onClick={handleConfirm}
            disabled={uploading}
          >
            {uploading ? '上傳中...' : '確認上傳'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add components/files/UploadModal.tsx
git commit -m "feat(files): add UploadModal with conflict detection"
```

---

### Task 16: Frontend — FileListItem + VersionList

**Files:**
- Create: `components/files/FileListItem.tsx`
- Create: `components/files/VersionList.tsx`

- [ ] **Step 1: Create VersionList**

```tsx
// components/files/VersionList.tsx
import React, { useState } from 'react';
import { FileVersion, User } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { formatFileSize } from '../FileTypeIcon';
import { showConfirm } from '../../utils/dialogService';

interface VersionListProps {
  fileId: string;
  versions: FileVersion[];
  currentUser: User;
  onPreview: (versionNo: number) => void;
  onChanged: () => void;
}

export const VersionList: React.FC<VersionListProps> = ({
  fileId, versions, currentUser, onPreview, onChanged,
}) => {
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? versions : versions.slice(0, 5);
  const hidden = versions.length - visible.length;
  const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';

  const handleDelete = async (versionNo: number) => {
    if (!(await showConfirm('確定刪除這個版本？將進入垃圾桶 48 小時'))) return;
    try {
      await api.files.deleteVersion(fileId, versionNo);
      toast.success('已刪除');
      onChanged();
    } catch (e: any) {
      toast.error(e.message || '刪除失敗');
    }
  };

  return (
    <div className="bg-stone-50/60 border-t border-slate-100">
      <ul className="divide-y divide-slate-100">
        {visible.map((v) => {
          const isLatest = v.version_no === versions[0].version_no;
          const canDelete = v.uploader_id === currentUser.id || isManager;
          return (
            <li key={v.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white">
              <span
                className={`text-xs font-mono font-bold px-2 py-1 rounded ${
                  isLatest ? 'text-white bg-emerald-600' : 'text-slate-700 bg-slate-200'
                }`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                v{v.version_no}
              </span>
              {isLatest && <span className="text-xs font-bold text-emerald-600">最新</span>}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {v.uploader_name || '?'} · {new Date(v.uploaded_at).toLocaleString('zh-TW')} · {formatFileSize(v.file_size)}
                </div>
                {v.note && (
                  <div className="text-xs text-slate-500 truncate italic mt-0.5">💬 {v.note}</div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-blue-50"
                  onClick={() => onPreview(v.version_no)}
                >
                  預覽
                </button>
                <a
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-blue-50"
                  href={api.files.getDownloadUrl(fileId, v.version_no)}
                  download
                >
                  下載
                </a>
                {canDelete && (
                  <button
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(v.version_no)}
                  >
                    刪除
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {hidden > 0 && (
          <li className="px-4 py-3 bg-stone-100 border-t-2 border-dashed border-slate-300">
            <button
              className="w-full text-center text-sm font-bold text-slate-600 hover:text-blue-600"
              onClick={() => setShowAll(true)}
            >
              展開更早的 {hidden} 個版本
            </button>
          </li>
        )}
      </ul>
    </div>
  );
};
```

- [ ] **Step 2: Create FileListItem**

```tsx
// components/files/FileListItem.tsx
import React, { useState } from 'react';
import { FileRecord, User } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { FileTypeIcon } from '../FileTypeIcon';
import { VersionList } from './VersionList';

interface FileListItemProps {
  file: FileRecord;
  currentUser: User;
  onPreview: (fileId: string, versionNo: number) => void;
  onChanged: () => void;
}

export const FileListItem: React.FC<FileListItemProps> = ({
  file, currentUser, onPreview, onChanged,
}) => {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const toggle = async () => {
    if (!expanded && !detail) {
      try {
        const d = await api.files.getDetail(file.id);
        setDetail(d);
      } catch (e: any) {
        toast.error(e.message || '載入失敗');
        return;
      }
    }
    setExpanded(!expanded);
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white hover:border-slate-300 transition">
      <button
        className="w-full p-4 flex items-center gap-4 hover:bg-stone-50/60 text-left"
        onClick={toggle}
      >
        <FileTypeIcon mimeType={file.latest_mime_type} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900 truncate">{file.filename}</div>
          <div
            className="text-xs text-slate-500 mt-0.5"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            最新版 v{file.latest_version_no} · {new Date(file.latest_uploaded_at).toLocaleString('zh-TW')} · by{' '}
            {file.owner_name}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-bold"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {file.version_count} 個版本
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>
      {expanded && detail && (
        <VersionList
          fileId={file.id}
          versions={detail.versions || []}
          currentUser={currentUser}
          onPreview={(n) => onPreview(file.id, n)}
          onChanged={() => {
            api.files.getDetail(file.id).then(setDetail).catch(() => {});
            onChanged();
          }}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add components/files/FileListItem.tsx components/files/VersionList.tsx
git commit -m "feat(files): add FileListItem and VersionList components"
```

---

### Task 17: Frontend — ExcelPreview component

**Files:**
- Create: `components/files/ExcelPreview.tsx`

- [ ] **Step 1: Install xlsx in frontend**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
npm install xlsx
```

- [ ] **Step 2: Create ExcelPreview**

```tsx
// components/files/ExcelPreview.tsx
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface ExcelPreviewProps {
  fileId: string;
  versionNo: number;
  filename: string;
  onClose: () => void;
}

export const ExcelPreview: React.FC<ExcelPreviewProps> = ({ fileId, versionNo, filename, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await api.files.getPreview(fileId, versionNo);
        if (result.type === 'oversized' || result.type === 'unsupported') {
          setError(result.message);
        } else if (result.type === 'excel') {
          setData(result);
        } else {
          setError('預覽失敗');
        }
      } catch (e: any) {
        setError(e.message || '載入預覽失敗');
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId, versionNo]);

  return (
    <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{filename} · v{versionNo}</h3>
          <button onClick={onClose} className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading && <p className="text-slate-500 text-center py-10">載入中...</p>}
          {error && <p className="text-red-600 text-center py-10">{error}</p>}
          {data && (
            <>
              {data.sheets.length > 1 && (
                <div className="flex gap-1 mb-3 border-b border-slate-200">
                  {data.sheets.map((s: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveSheet(i)}
                      className={`px-3 py-1.5 text-sm font-bold ${
                        activeSheet === i
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              <table className="text-xs border-collapse">
                <tbody>
                  {(data.sheets[activeSheet]?.data || []).map((row: any[], i: number) => (
                    <tr key={i}>
                      {row.map((cell: any, j: number) => (
                        <td
                          key={j}
                          className={`border border-slate-200 px-2 py-1 ${
                            i === 0 ? 'bg-slate-100 font-bold' : ''
                          }`}
                          style={{ minWidth: '80px', maxWidth: '250px' }}
                        >
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add components/files/ExcelPreview.tsx package.json package-lock.json
git commit -m "feat(files): add ExcelPreview component with SheetJS"
```

---

### Task 18: Frontend — MyFilesTab

**Files:**
- Create: `components/files/MyFilesTab.tsx`

- [ ] **Step 1: Create MyFilesTab**

```tsx
// components/files/MyFilesTab.tsx
import React, { useState, useEffect, useRef } from 'react';
import { User, FileRecord } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { FileListItem } from './FileListItem';
import { UploadModal } from './UploadModal';
import { ExcelPreview } from './ExcelPreview';
import { EmptyState } from '../EmptyState';

interface MyFilesTabProps {
  currentUser: User;
}

export const MyFilesTab: React.FC<MyFilesTabProps> = ({ currentUser }) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ fileId: string; versionNo: number; filename: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.files.list('mine', {
        ...(search && { q: search }),
        ...(typeFilter && { file_type: typeFilter }),
      });
      setFiles(result);
    } catch (e: any) {
      toast.error(e.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) {
      toast.error('檔案超過 25 MB 限制');
      return;
    }
    setPendingUpload(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div className="flex gap-2 flex-1 min-w-[280px]">
          <input
            className="flex-1 px-4 py-2 bg-stone-50 border border-slate-200 rounded-xl text-sm"
            placeholder="🔍 搜尋檔名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="px-3 py-2 bg-stone-50 border border-slate-200 rounded-xl text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">所有類型</option>
            <option value="excel">Excel</option>
            <option value="word">Word</option>
            <option value="powerpoint">PowerPoint</option>
            <option value="pdf">PDF</option>
            <option value="image">圖片</option>
          </select>
        </div>
        <button
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700"
          onClick={() => fileInputRef.current?.click()}
        >
          📤 上傳檔案
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">載入中...</div>
      ) : files.length === 0 ? (
        <EmptyState
          icon="📁"
          title="還沒有任何檔案"
          description="上傳第一份檔案開始管理你的工作報表"
          actionLabel="上傳檔案"
          onAction={() => fileInputRef.current?.click()}
        />
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <FileListItem
              key={f.id}
              file={f}
              currentUser={currentUser}
              onPreview={(fileId, versionNo) => setPreview({ fileId, versionNo, filename: f.filename })}
              onChanged={load}
            />
          ))}
        </div>
      )}

      {pendingUpload && (
        <UploadModal
          file={pendingUpload}
          onClose={() => setPendingUpload(null)}
          onUploaded={() => {
            setPendingUpload(null);
            load();
          }}
        />
      )}

      {preview && (
        <ExcelPreview
          fileId={preview.fileId}
          versionNo={preview.versionNo}
          filename={preview.filename}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add components/files/MyFilesTab.tsx
git commit -m "feat(files): add MyFilesTab"
```

---

### Task 19: Frontend — CompanyFilesTab

**Files:**
- Create: `components/files/CompanyFilesTab.tsx`

- [ ] **Step 1: Create CompanyFilesTab**

```tsx
// components/files/CompanyFilesTab.tsx
import React, { useState, useEffect } from 'react';
import { User, FileRecord } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { FileListItem } from './FileListItem';
import { ExcelPreview } from './ExcelPreview';
import { EmptyState } from '../EmptyState';

interface CompanyFilesTabProps {
  currentUser: User;
}

export const CompanyFilesTab: React.FC<CompanyFilesTabProps> = ({ currentUser }) => {
  const toast = useToast();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ fileId: string; versionNo: number; filename: string } | null>(null);

  const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.files.list('company', { ...(search && { q: search }) });
      setFiles(result);
    } catch (e: any) {
      toast.error(e.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-800">
        {isManager
          ? '🔓 你看到的是全公司所有檔案（不受 48 小時限制）'
          : '⏰ 48 小時透明窗：只顯示過去 48 小時內全公司有新版本的檔案'}
      </div>

      <div className="mb-4">
        <input
          className="w-full px-4 py-2 bg-stone-50 border border-slate-200 rounded-xl text-sm"
          placeholder="🔍 搜尋檔名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">載入中...</div>
      ) : files.length === 0 ? (
        <EmptyState icon="🌐" title="過去 48 小時內沒有檔案更新" />
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <FileListItem
              key={f.id}
              file={f}
              currentUser={currentUser}
              onPreview={(fileId, versionNo) => setPreview({ fileId, versionNo, filename: f.filename })}
              onChanged={load}
            />
          ))}
        </div>
      )}

      {preview && (
        <ExcelPreview
          fileId={preview.fileId}
          versionNo={preview.versionNo}
          filename={preview.filename}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add components/files/CompanyFilesTab.tsx
git commit -m "feat(files): add CompanyFilesTab with 48h transparency window"
```

---

### Task 20: Frontend — TrashView

**Files:**
- Create: `components/files/TrashView.tsx`

- [ ] **Step 1: Create TrashView**

```tsx
// components/files/TrashView.tsx
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { EmptyState } from '../EmptyState';

interface TrashViewProps {
  currentUser: User;
  onClose: () => void;
}

export const TrashView: React.FC<TrashViewProps> = ({ currentUser, onClose }) => {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.files.listTrash();
      setItems(result);
    } catch (e: any) {
      toast.error(e.message || '載入垃圾桶失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const restore = async (fileId: string, versionNo: number) => {
    try {
      await api.files.restoreVersion(fileId, versionNo);
      toast.success('已救回');
      load();
    } catch (e: any) {
      toast.error(e.message || '救回失敗');
    }
  };

  const remainingHours = (deletedAt: string) => {
    const elapsed = (Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60);
    return Math.max(0, Math.round(48 - elapsed));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">🗑 垃圾桶</h3>
          <button onClick={onClose} className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded">✕</button>
        </div>
        <div className="bg-red-50 border-y border-red-200 px-5 py-3 text-sm text-red-700">
          已刪除的版本保留 48 小時，過期自動清除。
        </div>
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="text-center py-10 text-slate-400">載入中...</div>
          ) : items.length === 0 ? (
            <EmptyState icon="🗑" title="垃圾桶是空的" />
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-700 truncate">
                      {item.filename} · v{item.version_no}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      刪除時間：{new Date(item.deleted_at).toLocaleString('zh-TW')} · by {item.deleter_name}
                    </div>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">
                    剩 {remainingHours(item.deleted_at)} 小時
                  </span>
                  <button
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600"
                    onClick={() => restore(item.file_id, item.version_no)}
                  >
                    救回
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add components/files/TrashView.tsx
git commit -m "feat(files): add TrashView with restore"
```

---

### Task 21: Frontend — OperationsLogTab

**Files:**
- Create: `components/files/OperationsLogTab.tsx`

- [ ] **Step 1: Create OperationsLogTab**

```tsx
// components/files/OperationsLogTab.tsx
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../Toast';
import { EmptyState } from '../EmptyState';

interface OperationsLogTabProps {
  currentUser: User;
}

const ACTION_LABEL: Record<string, { label: string; class: string }> = {
  upload: { label: '📤 上傳', class: 'bg-emerald-100 text-emerald-700' },
  download: { label: '⬇️ 下載', class: 'bg-blue-100 text-blue-700' },
  delete: { label: '🗑 刪除', class: 'bg-red-100 text-red-700' },
  restore: { label: '↩ 救回', class: 'bg-purple-100 text-purple-700' },
};

export const OperationsLogTab: React.FC<OperationsLogTabProps> = ({ currentUser }) => {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';

  const load = async () => {
    if (!isManager) return;
    setLoading(true);
    try {
      const result = await api.files.listOperations({ ...(actionFilter && { action: actionFilter }) });
      setItems(result);
    } catch (e: any) {
      toast.error(e.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter]);

  if (!isManager) {
    return <EmptyState icon="🔒" title="只有 BOSS/MANAGER 能查看操作紀錄" />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-700">📋 全公司檔案操作紀錄</h3>
        <select
          className="px-3 py-1.5 bg-stone-50 border border-slate-200 rounded-lg text-sm"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">全部動作</option>
          <option value="upload">上傳</option>
          <option value="download">下載</option>
          <option value="delete">刪除</option>
          <option value="restore">救回</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">載入中...</div>
      ) : items.length === 0 ? (
        <EmptyState icon="📋" title="目前沒有操作紀錄" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-slate-600">
                <th className="p-3 font-bold">時間</th>
                <th className="p-3 font-bold">操作者</th>
                <th className="p-3 font-bold">動作</th>
                <th className="p-3 font-bold">檔案</th>
                <th className="p-3 font-bold">版本</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((op) => {
                const meta = ACTION_LABEL[op.action] || { label: op.action, class: 'bg-slate-100 text-slate-700' };
                return (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs text-slate-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(op.created_at).toLocaleString('zh-TW')}
                    </td>
                    <td className="p-3">{op.actor_name || '?'}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded font-bold ${meta.class}`}>{meta.label}</span>
                    </td>
                    <td className="p-3 font-mono text-xs">{op.filename || '?'}</td>
                    <td className="p-3 text-xs text-slate-500">{op.version_no ? `v${op.version_no}` : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add components/files/OperationsLogTab.tsx
git commit -m "feat(files): add OperationsLogTab for BOSS/MANAGER"
```

---

### Task 22: Refactor ReportView and delete obsolete components

**Files:**
- Modify: `components/ReportView.tsx`
- Delete: `components/CreateReportView.tsx`, `components/ReportModal.tsx`, `components/PlatformAccountsView.tsx`, `components/ApprovalModal.tsx`, `components/AuthorizationStatus.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Rewrite ReportView**

Replace the entire content of `components/ReportView.tsx`:

```tsx
// components/ReportView.tsx
import React, { useState } from 'react';
import { User, DepartmentDef } from '../types';
import WorkLogTab from './WorkLogTab';
import { MyFilesTab } from './files/MyFilesTab';
import { CompanyFilesTab } from './files/CompanyFilesTab';
import { OperationsLogTab } from './files/OperationsLogTab';
import { TrashView } from './files/TrashView';

interface ReportViewProps {
  currentUser: User;
  users: User[];
  departments: DepartmentDef[];
}

type Tab = 'my-files' | 'company-files' | 'work-logs' | 'operations';

export const ReportView: React.FC<ReportViewProps> = ({ currentUser, users, departments }) => {
  const [activeTab, setActiveTab] = useState<Tab>('my-files');
  const [trashOpen, setTrashOpen] = useState(false);

  const isManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'my-files', label: '我的檔案', icon: '📁' },
    { id: 'company-files', label: '公司檔案', icon: '🌐' },
    { id: 'work-logs', label: '工作日誌', icon: '📝' },
    ...(isManager ? [{ id: 'operations' as Tab, label: '操作紀錄', icon: '🔍' }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">工作報表中心</h2>
          <p className="text-sm text-slate-500 mt-0.5">管理工作檔案 · 雲端版本管理</p>
        </div>
        <button
          className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200"
          onClick={() => setTrashOpen(true)}
        >
          🗑 垃圾桶
        </button>
      </div>

      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`px-4 py-3 text-sm font-bold flex items-center gap-2 ${
                activeTab === t.id
                  ? 'text-slate-900 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setActiveTab(t.id)}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'my-files' && <MyFilesTab currentUser={currentUser} />}
      {activeTab === 'company-files' && <CompanyFilesTab currentUser={currentUser} />}
      {activeTab === 'work-logs' && (
        <WorkLogTab currentUser={currentUser} users={users} departments={departments} />
      )}
      {activeTab === 'operations' && <OperationsLogTab currentUser={currentUser} />}

      {trashOpen && <TrashView currentUser={currentUser} onClose={() => setTrashOpen(false)} />}
    </div>
  );
};
```

- [ ] **Step 2: Delete obsolete components**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
rm components/CreateReportView.tsx
rm components/ReportModal.tsx
rm components/PlatformAccountsView.tsx
rm components/ApprovalModal.tsx
rm components/AuthorizationStatus.tsx
rm components/ReportView.tsx.bak
rm components/ReportView.tsx.bak50f6ed52-ade2-40ae-a111-c863b7919a25
```

- [ ] **Step 3: Update App.tsx**

In `App.tsx`:
- Remove all `lazy()` imports of: `CreateReportView`, `ReportModal`, `PlatformAccountsView`
- Find the ReportView usage area. Change its props to match the new interface:

OLD:
```tsx
{currentPage === 'reports' && (
  isCreatingReport ? (
    <CreateReportView ... />
  ) : (
    <ReportView currentUser={currentUser} users={users} reports={reports} departments={departments} onCreateClick={...} onOpenReportModal={...} />
  )
)}
```

NEW:
```tsx
{currentPage === 'reports' && (
  <ReportView currentUser={currentUser} users={users} departments={departments} />
)}
```

- Also remove the `isCreatingReport`, `isReportProcessing`, and `handleCreateReport` state/handlers since the new flow has no "create report" step.
- Remove `reports` state and `setReports` (no longer used).
- Remove the `reports: getAll` call from the Promise.allSettled block.

- [ ] **Step 4: Smoke test build**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
npm run build
```

Expected: Build succeeds. If TypeScript errors, fix the obvious missing references.

- [ ] **Step 5: Commit**

```bash
git add components/ReportView.tsx App.tsx
git add -u components/   # capture deletions
git commit -m "refactor(reports): replace ReportView with new file management system"
```

---

### Task 23: Build, deploy to alpha, verify

**Files:** N/A

- [ ] **Step 1: Run lint and build**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
npm run lint
npm run build
```

Expected: No lint errors (warnings OK). Build succeeds.

- [ ] **Step 2: Deploy to alpha first**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
bash deploy/deploy.sh -y alpha
```

Expected: Alpha deploys successfully, HTTP 200, migration runs on container startup.

- [ ] **Step 3: Manual smoke test on alpha**

Open https://alpha.wuk-on.com and verify:

| Test | Expected |
|------|---------|
| 登入 BOSS 帳號 | 進入系統 |
| 點「工作報表中心」 | 看到新 4 個 tab |
| 我的檔案 tab 為空 | 顯示 EmptyState |
| 上傳一份 Excel | 看到 toast「已上傳」+ 列表顯示 |
| 點檔案展開 | 顯示 v1 |
| 點預覽 | 開啟 Excel 預覽 modal |
| 點下載 | 下載原檔 |
| 重新上傳同檔名（內容稍微改） | toast「已加為 v2」（無 modal）|
| 點刪除 v2 | 提示確認後刪除 |
| 點垃圾桶 | 看到 v2，剩 48 小時 |
| 點救回 | v2 回到列表 |
| 切換到「公司檔案」tab | BOSS 看得到所有 |
| 切換到「工作日誌」tab | 原有功能正常 |
| 切換到「操作紀錄」tab | 看到所有上傳/下載/刪除紀錄 |

- [ ] **Step 4: Deploy to remaining servers**

```bash
cd "C:/Users/canri/Projects/Migrated_From_USB/公司內部"
bash deploy/deploy.sh -y bravo charlie central
```

Expected: 3 servers deploy + health check pass.

- [ ] **Step 5: Push to GitHub**

```bash
git push origin master
```

---

## Self-Review Notes

**Spec coverage verification:**

| Spec section | Implementing task |
|--------------|-------------------|
| §1.1 Tab 範圍處理 | Task 22 |
| §1.2 4-tab 結構 | Task 22 |
| §2.1 上傳邏輯（同人 silent / 跨人 modal）| Task 5, 8, 15 |
| §2.2 權限矩陣 | Task 4, 8-11 |
| §2.3 48h 透明窗 | Task 4 (perm), Task 6 (list filter), Task 19 (UI) |
| §2.4 刪除規則 | Task 6 (soft delete), Task 11 (route), Task 12 (cleanup), Task 16 (UI), Task 20 (trash) |
| §2.5 檔案類型/大小 | Task 8 (multer + ALLOWED_MIME) |
| §2.6 搜尋/篩選 | Task 6 (backend), Task 18 (UI) |
| §2.7 通知（靜默）| Task 15 (UploadModal toast) |
| §2.8 操作紀錄 | Task 7, 11, 21 |
| §3.2 資料模型 | Task 1 |
| §3.3 檔案儲存策略 | Task 3 |
| §3.4 API 端點 | Task 8-11 |
| §5 既有資料處理 | Task 2 |

All spec items covered.

**Type consistency check:**
- `FileRecord` / `FileVersion` / `FileOperation` / `ConflictCheckResult` types match between Task 14 (types.ts), Task 13 (api client), and backend services
- `file_id` / `version_no` parameter names consistent across routes (Task 8-11) and frontend (Task 13, 15-21)
- `actor_id` used in backend (Task 7), `actor_name` joined in responses (Task 7, 21)

No type drift identified.
