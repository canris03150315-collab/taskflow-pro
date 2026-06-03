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
async function checkConflict(db, currentUser, filename, contentHash) {
  const sameUser = await db.get(
    `SELECT f.id AS file_id,
            (SELECT COUNT(*) FROM file_versions WHERE file_id = f.id AND is_deleted = 0) AS version_count,
            (SELECT MAX(version_no) FROM file_versions WHERE file_id = f.id AND is_deleted = 0) AS latest_version_no
       FROM files f
       WHERE f.owner_id = ? AND f.filename = ? AND f.is_deleted = 0
       LIMIT 1`,
    [currentUser.id, filename]
  );

  const crossUsers = await db.all(
    `SELECT f.id AS file_id, f.owner_id,
            u.name AS owner_name,
            (SELECT COUNT(*) FROM file_versions WHERE file_id = f.id AND is_deleted = 0) AS version_count,
            (SELECT content_hash FROM file_versions WHERE file_id = f.id AND is_deleted = 0
               ORDER BY version_no DESC LIMIT 1) AS latest_hash
       FROM files f
       JOIN users u ON u.id = f.owner_id
       WHERE f.owner_id != ? AND f.filename = ? AND f.is_deleted = 0`,
    [currentUser.id, filename]
  );

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
async function uploadFile(db, currentUser, { filename, buffer, mimeType, note, targetFileId }) {
  const contentHash = storage.computeHash(buffer);
  const ext = getExt(filename);
  const blobPath = storage.writeBlob(contentHash, ext, buffer);
  const now = new Date().toISOString();

  let fileId, versionNo;

  if (targetFileId) {
    // Add new version to existing file
    const file = await db.get('SELECT * FROM files WHERE id = ? AND is_deleted = 0', [targetFileId]);
    if (!file) throw new Error('Target file not found');
    fileId = targetFileId;

    const maxVer = await db.get(
      'SELECT MAX(version_no) AS max_no FROM file_versions WHERE file_id = ?',
      [targetFileId]
    );
    versionNo = (maxVer.max_no || 0) + 1;

    await db.run('UPDATE files SET latest_uploaded_at = ? WHERE id = ?', [now, fileId]);
  } else {
    // Try to create new file. If UNIQUE constraint fires (concurrent upload of same
    // filename), find the existing file and add as new version instead.
    fileId = genId('file');
    versionNo = 1;
    try {
      await db.run(
        `INSERT INTO files (id, filename, owner_id, created_at, latest_uploaded_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [fileId, filename, currentUser.id, now, now]
      );
    } catch (err) {
      const msg = (err && err.message) || '';
      if (msg.includes('UNIQUE') || msg.includes('idx_files_active_unique')) {
        // Concurrent upload won — find existing file and switch to add-version path
        const existing = await db.get(
          'SELECT id FROM files WHERE owner_id = ? AND filename = ? AND is_deleted = 0 LIMIT 1',
          [currentUser.id, filename]
        );
        if (!existing) throw err; // shouldn't happen
        fileId = existing.id;

        const maxVer = await db.get(
          'SELECT MAX(version_no) AS max_no FROM file_versions WHERE file_id = ?',
          [fileId]
        );
        versionNo = (maxVer.max_no || 0) + 1;
        await db.run('UPDATE files SET latest_uploaded_at = ? WHERE id = ?', [now, fileId]);
      } else {
        throw err;
      }
    }
  }

  const versionId = genId('ver');
  await db.run(
    `INSERT INTO file_versions
     (id, file_id, version_no, uploader_id, uploaded_at, content_hash, blob_path, file_size, mime_type, note, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [versionId, fileId, versionNo, currentUser.id, now, contentHash, blobPath, buffer.length, mimeType, note || null]
  );

  return { file_id: fileId, version_id: versionId, version_no: versionNo, uploaded_at: now };
}

/**
 * List files visible to user, filtered by scope.
 *
 * scope = 'mine'    → files where owner_id = currentUser.id
 * scope = 'company' → all files (BOSS/MANAGER) or 48h-window files (EMPLOYEE)
 */
async function listFiles(db, currentUser, { scope = 'mine', q, uploaderId, fromDate, toDate, fileType } = {}) {
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

  const rows = await db.all(sql, params);

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

async function getFileDetail(db, fileId) {
  const file = await db.get(
    'SELECT f.*, u.name AS owner_name FROM files f LEFT JOIN users u ON u.id = f.owner_id WHERE f.id = ?',
    [fileId]
  );
  if (!file) return null;
  const versions = await db.all(
    `SELECT v.*, u.name AS uploader_name
       FROM file_versions v
       LEFT JOIN users u ON u.id = v.uploader_id
       WHERE v.file_id = ? AND v.is_deleted = 0
       ORDER BY v.version_no DESC`,
    [fileId]
  );
  return { ...file, versions };
}

async function getVersion(db, fileId, versionNo) {
  return db.get(
    'SELECT * FROM file_versions WHERE file_id = ? AND version_no = ? AND is_deleted = 0',
    [fileId, versionNo]
  );
}

async function softDeleteVersion(db, currentUser, versionId) {
  const now = new Date().toISOString();
  await db.run(
    'UPDATE file_versions SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE id = ?',
    [now, currentUser.id, versionId]
  );

  // If all versions of this file are deleted, mark file as deleted too
  const v = await db.get('SELECT file_id FROM file_versions WHERE id = ?', [versionId]);
  if (v) {
    const remaining = await db.get(
      'SELECT COUNT(*) AS n FROM file_versions WHERE file_id = ? AND is_deleted = 0',
      [v.file_id]
    );
    if (remaining.n === 0) {
      await db.run('UPDATE files SET is_deleted = 1 WHERE id = ?', [v.file_id]);
    }
  }
}

async function restoreVersion(db, versionId) {
  const v = await db.get('SELECT file_id FROM file_versions WHERE id = ?', [versionId]);
  if (!v) return;
  await db.run(
    'UPDATE file_versions SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?',
    [versionId]
  );
  // Un-delete the parent file if it was marked deleted
  await db.run('UPDATE files SET is_deleted = 0 WHERE id = ?', [v.file_id]);
}

async function listTrash(db, currentUser) {
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
    ? db.all(sql, [fortyEightHoursAgo])
    : db.all(sql, [fortyEightHoursAgo, currentUser.id]);
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
