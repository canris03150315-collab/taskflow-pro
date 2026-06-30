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
  if (!relativePath || typeof relativePath !== 'string') {
    const err = new Error('blob_path missing');
    err.code = 'BLOB_PATH_MISSING';
    throw err;
  }
  const fullPath = path.join(__dirname, '..', '..', 'data', relativePath);
  // Prevent path traversal — final path must be within UPLOAD_ROOT
  const resolved = path.resolve(fullPath);
  const root = path.resolve(UPLOAD_ROOT);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    const err = new Error('blob_path outside upload root');
    err.code = 'BLOB_PATH_INVALID';
    throw err;
  }
  if (!fs.existsSync(fullPath)) {
    const err = new Error(`Blob not found on disk: ${relativePath}`);
    err.code = 'BLOB_NOT_FOUND';
    throw err;
  }
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
