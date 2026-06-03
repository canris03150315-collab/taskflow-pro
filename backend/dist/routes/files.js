// backend/dist/routes/files.js
'use strict';
const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const fileService = require('../services/fileService');
const storage = require('../services/fileStorage');
const perms = require('../services/filePermissions');
const opsLog = require('../services/fileOperationsLog');
const xlsx = require('xlsx');

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
router.post('/check-conflict', authenticateToken, async (req, res) => {
  try {
    const { filename, content_hash } = req.body;
    if (!filename || !content_hash) {
      return res.status(400).json({ error: '缺少 filename 或 content_hash' });
    }
    const result = await fileService.checkConflict(req.db, req.user, filename, content_hash);
    res.json(result);
  } catch (err) {
    console.error('[files] check-conflict error:', err.message);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// POST /upload
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '請選擇檔案' });
    if (!ALLOWED_MIME.has(req.file.mimetype)) {
      return res.status(400).json({ error: '不支援的檔案類型' });
    }

    const { target_file_id, note } = req.body;

    // Permission: if target_file_id given, ensure user can add version to that file
    if (target_file_id) {
      const file = await req.db.get('SELECT * FROM files WHERE id = ? AND is_deleted = 0', [target_file_id]);
      if (!file) return res.status(404).json({ error: '目標檔案不存在' });
      if (!perms.canViewFile(req.user, file)) {
        return res.status(403).json({ error: '無權限新增版本到此檔案' });
      }
    }

    const result = await fileService.uploadFile(req.db, req.user, {
      filename: req.file.originalname,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      note,
      targetFileId: target_file_id,
    });

    await opsLog.logOperation(req.db, {
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

// GET /
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { scope, q, uploader_id, from_date, to_date, file_type } = req.query;
    const rows = await fileService.listFiles(req.db, req.user, {
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
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const detail = await fileService.getFileDetail(req.db, req.params.id);
    if (!detail || detail.is_deleted) return res.status(404).json({ error: '檔案不存在' });
    if (!perms.canViewFile(req.user, detail)) return res.status(403).json({ error: '無權限查看此檔案' });
    res.json(detail);
  } catch (err) {
    console.error('[files] detail error:', err.message);
    res.status(500).json({ error: '取得檔案詳情失敗' });
  }
});

// GET /:id/v/:n — download
router.get('/:id/v/:n', authenticateToken, async (req, res) => {
  try {
    const file = await req.db.get('SELECT * FROM files WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!file) return res.status(404).json({ error: '檔案不存在' });
    if (!perms.canViewFile(req.user, file)) return res.status(403).json({ error: '無權限下載' });

    const version = await fileService.getVersion(req.db, req.params.id, parseInt(req.params.n, 10));
    if (!version) return res.status(404).json({ error: '版本不存在' });

    const buffer = storage.readBlob(version.blob_path);

    await opsLog.logOperation(req.db, {
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

// GET /:id/v/:n/preview
router.get('/:id/v/:n/preview', authenticateToken, async (req, res) => {
  try {
    const file = await req.db.get('SELECT * FROM files WHERE id = ? AND is_deleted = 0', [req.params.id]);
    if (!file) return res.status(404).json({ error: '檔案不存在' });
    if (!perms.canViewFile(req.user, file)) return res.status(403).json({ error: '無權限預覽' });

    const version = await fileService.getVersion(req.db, req.params.id, parseInt(req.params.n, 10));
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

// DELETE /:id/v/:n — soft delete version
router.delete('/:id/v/:n', authenticateToken, async (req, res) => {
  try {
    const version = await fileService.getVersion(req.db, req.params.id, parseInt(req.params.n, 10));
    if (!version) return res.status(404).json({ error: '版本不存在' });
    if (!perms.canDeleteVersion(req.user, version)) {
      return res.status(403).json({ error: '無權限刪除此版本' });
    }
    await fileService.softDeleteVersion(req.db, req.user, version.id);
    await opsLog.logOperation(req.db, {
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
router.post('/:id/v/:n/restore', authenticateToken, async (req, res) => {
  try {
    const version = await req.db.get(
      'SELECT * FROM file_versions WHERE file_id = ? AND version_no = ?',
      [req.params.id, parseInt(req.params.n, 10)]
    );
    if (!version) return res.status(404).json({ error: '版本不存在' });
    if (!perms.canDeleteVersion(req.user, version)) {
      return res.status(403).json({ error: '無權限救回此版本' });
    }
    await fileService.restoreVersion(req.db, version.id);
    await opsLog.logOperation(req.db, {
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
router.get('/trash/list', authenticateToken, async (req, res) => {
  try {
    const items = await fileService.listTrash(req.db, req.user);
    res.json({ items });
  } catch (err) {
    console.error('[files] trash error:', err.message);
    res.status(500).json({ error: '取得垃圾桶失敗' });
  }
});

// GET /operations
router.get('/operations/list', authenticateToken, async (req, res) => {
  try {
    if (!perms.canViewOperationsLog(req.user)) {
      return res.status(403).json({ error: '無權限查看操作紀錄' });
    }
    const { action, actor_id, from_date, to_date } = req.query;
    const items = await opsLog.listOperations(req.db, {
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

exports.filesRoutes = router;
