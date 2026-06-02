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
