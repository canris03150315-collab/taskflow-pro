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
