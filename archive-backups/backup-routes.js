const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');

// GET /download - Download latest backup
router.get('/download', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    
    // Only BOSS can download backups
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: '\\u6b0a\\u9650\\u4e0d\\u8db3' });
    }
    
    const backupDir = path.join('/app/data', 'backups');
    
    // Check if backup directory exists
    if (!fs.existsSync(backupDir)) {
      return res.status(404).json({ error: '\\u5099\\u4efd\\u76ee\\u9304\\u4e0d\\u5b58\\u5728' });
    }
    
    // Get all backup files
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    if (files.length === 0) {
      return res.status(404).json({ error: '\\u6c92\\u6709\\u5099\\u4efd\\u6a94\\u6848' });
    }
    
    // Get the latest backup
    const latestBackup = files[0];
    
    console.log('[Backup] Downloading:', latestBackup.name, 'by:', currentUser.name);
    
    // Send file
    res.download(latestBackup.path, latestBackup.name, (err) => {
      if (err) {
        console.error('[Backup] Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '\\u4e0b\\u8f09\\u5931\\u6557' });
        }
      }
    });
    
  } catch (error) {
    console.error('[Backup] Download error:', error);
    res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
  }
});

// POST /create - Create new backup
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    
    // Only BOSS can create backups
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: '\\u6b0a\\u9650\\u4e0d\\u8db3' });
    }
    
    const dbPath = '/app/data/taskflow.db';
    const backupDir = path.join('/app/data', 'backups');
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `taskflow-backup-${timestamp}.db`);
    
    // Copy database file
    fs.copyFileSync(dbPath, backupPath);
    
    const stats = fs.statSync(backupPath);
    
    console.log('[Backup] Created:', backupPath, 'by:', currentUser.name);
    
    res.json({
      success: true,
      message: '\\u5099\\u4efd\\u5df2\\u5275\\u5efa',
      backup: {
        name: path.basename(backupPath),
        size: stats.size,
        created: stats.mtime
      }
    });
    
  } catch (error) {
    console.error('[Backup] Create error:', error);
    res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
  }
});

module.exports = router;
