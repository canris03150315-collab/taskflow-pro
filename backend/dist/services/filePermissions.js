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
