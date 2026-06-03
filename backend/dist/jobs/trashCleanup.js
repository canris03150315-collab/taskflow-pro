// backend/dist/jobs/trashCleanup.js
'use strict';
const storage = require('../services/fileStorage');

/**
 * Clean up versions soft-deleted more than 48 hours ago.
 * - Permanently delete version rows
 * - If a hash has no remaining references, delete the blob file
 */
async function runCleanup(db) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const expiredVersions = await db.all(
    'SELECT id, content_hash, blob_path FROM file_versions WHERE is_deleted = 1 AND deleted_at < ?',
    [cutoff]
  );

  if (expiredVersions.length === 0) return { deleted: 0, blobsRemoved: 0 };

  let blobsRemoved = 0;
  for (const v of expiredVersions) {
    await db.run('DELETE FROM file_versions WHERE id = ?', [v.id]);

    // If no remaining refs to this hash, remove blob
    const refs = await db.get(
      'SELECT COUNT(*) AS n FROM file_versions WHERE content_hash = ?',
      [v.content_hash]
    );
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
  await db.run(
    `DELETE FROM files WHERE id IN (
       SELECT f.id FROM files f
       LEFT JOIN file_versions v ON v.file_id = f.id
       WHERE v.id IS NULL
     )`,
    []
  );

  return { deleted: expiredVersions.length, blobsRemoved };
}

function startCleanupCron(db, intervalMs = 60 * 60 * 1000) {
  // Run every hour
  setInterval(async () => {
    try {
      const result = await runCleanup(db);
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
