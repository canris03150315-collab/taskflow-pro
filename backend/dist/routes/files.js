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
