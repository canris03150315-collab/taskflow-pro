const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const tar = require('tar');
const { authenticateToken } = require('../middleware/auth');

const DATA_DIR = path.join(__dirname, '../../data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const RETENTION_DAYS = 7;
const BACKUP_PREFIX = 'taskflow-backup-';
const BACKUP_EXT = '.tar.gz';

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

async function createBackupArchive() {
  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${BACKUP_PREFIX}${timestamp}${BACKUP_EXT}`;
  const backupPath = path.join(BACKUP_DIR, filename);

  const entries = fs.readdirSync(DATA_DIR).filter(name => name !== 'backups');
  await tar.create(
    {
      gzip: true,
      file: backupPath,
      cwd: DATA_DIR,
      portable: true,
    },
    entries
  );

  return { backupPath, filename };
}

function pruneOldBackups() {
  ensureBackupDir();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const removed = [];
  for (const f of fs.readdirSync(BACKUP_DIR)) {
    if (!f.startsWith(BACKUP_PREFIX) || !f.endsWith(BACKUP_EXT)) continue;
    const full = path.join(BACKUP_DIR, f);
    try {
      const stats = fs.statSync(full);
      if (stats.mtime.getTime() < cutoff) {
        fs.unlinkSync(full);
        removed.push(f);
      }
    } catch (e) {
      console.error('[Backup] prune stat/unlink failed:', f, e.message);
    }
  }
  if (removed.length > 0) {
    console.log('[Backup] Pruned', removed.length, 'backup(s) older than', RETENTION_DAYS, 'days');
  }
  return removed;
}

function listBackups() {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith(BACKUP_PREFIX) && f.endsWith(BACKUP_EXT))
    .map(f => {
      const filePath = path.join(BACKUP_DIR, f);
      const stats = fs.statSync(filePath);
      return {
        filename: f,
        path: filePath,
        size: stats.size,
        created: stats.mtime.toISOString(),
        timestamp: stats.mtime.getTime(),
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

// GET /download - Create a fresh backup and download it
router.get('/download', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: '權限不足' });
    }

    const { backupPath, filename } = await createBackupArchive();
    pruneOldBackups();

    console.log('[Backup] Downloading (fresh):', filename, 'by:', currentUser.name);
    res.download(backupPath, filename, (err) => {
      if (err) {
        console.error('[Backup] Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '下載失敗' });
        }
      }
    });
  } catch (error) {
    console.error('[Backup] Download error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /download/latest - Download most recent existing backup (no creation)
router.get('/download/latest', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: '權限不足' });
    }
    const files = listBackups();
    if (files.length === 0) {
      return res.status(404).json({ error: '沒有備份檔案' });
    }
    const latest = files[0];
    res.download(latest.path, latest.filename);
  } catch (error) {
    console.error('[Backup] Download latest error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /create - Create new backup (tar.gz of data/ excluding data/backups/)
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: '權限不足' });
    }

    const { backupPath, filename } = await createBackupArchive();
    const stats = fs.statSync(backupPath);
    const pruned = pruneOldBackups();

    console.log('[Backup] Created:', filename, 'size:', stats.size, 'by:', currentUser.name);

    res.json({
      success: true,
      message: '備份已建立',
      backup: {
        name: filename,
        size: stats.size,
        created: stats.mtime,
      },
      pruned: pruned.length,
      retentionDays: RETENTION_DAYS,
    });
  } catch (error) {
    console.error('[Backup] Create error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});


// GET /status - Get backup status and list
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const files = listBackups();
    const latest = files.length > 0 ? files[0] : null;

    let hoursSinceLastBackup = null;
    if (latest) {
      hoursSinceLastBackup = (Date.now() - latest.timestamp) / (1000 * 60 * 60);
    }

    let status = 'unknown';
    if (!latest) {
      status = 'error';
    } else if (hoursSinceLastBackup < 2) {
      status = 'healthy';
    } else if (hoursSinceLastBackup < 24) {
      status = 'warning';
    } else {
      status = 'error';
    }

    console.log('[Backup Status] Total backups:', files.length, 'latest:', latest ? latest.filename : 'None');

    res.json({
      status,
      totalBackups: files.length,
      latestBackup: latest ? {
        filename: latest.filename,
        size: latest.size,
        created: latest.created,
        timestamp: latest.timestamp,
      } : null,
      hoursSinceLastBackup: hoursSinceLastBackup ? hoursSinceLastBackup.toFixed(2) : null,
      retentionDays: RETENTION_DAYS,
      backups: files.slice(0, 20).map(f => ({
        filename: f.filename,
        size: f.size,
        created: f.created,
        timestamp: f.timestamp,
      })),
    });
  } catch (error) {
    console.error('[Backup Status] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
module.exports.createBackupArchive = createBackupArchive;
module.exports.pruneOldBackups = pruneOldBackups;
