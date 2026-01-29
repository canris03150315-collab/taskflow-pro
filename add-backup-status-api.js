const fs = require('fs');
const path = require('path');

console.log('=== Adding Backup Status API ===\n');

const backupRoutePath = '/app/dist/routes/backup.js';
let content = fs.readFileSync(backupRoutePath, 'utf8');

console.log('Current file size:', content.length, 'bytes');

// Find the position before exports
const exportsPos = content.lastIndexOf('module.exports');

if (exportsPos === -1) {
  console.log('ERROR: Could not find module.exports');
  process.exit(1);
}

// New route to add
const newRoute = `
// GET /status - Get backup status and list
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;

    // Only BOSS can view backup status
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const backupDir = '/root/taskflow-backups';

    // Check if backup directory exists
    if (!fs.existsSync(backupDir)) {
      return res.status(404).json({ error: 'Backup directory not found' });
    }

    // Get all backup files
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db') && f.startsWith('taskflow_backup_'))
      .map(f => {
        const filePath = path.join(backupDir, f);
        const stats = fs.statSync(filePath);
        return {
          filename: f,
          size: stats.size,
          created: stats.mtime.toISOString(),
          timestamp: stats.mtime.getTime()
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    // Get latest backup info
    const latest = files.length > 0 ? files[0] : null;
    
    // Calculate time since last backup
    let hoursSinceLastBackup = null;
    if (latest) {
      hoursSinceLastBackup = (Date.now() - latest.timestamp) / (1000 * 60 * 60);
    }

    // Determine backup status
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

    console.log('[Backup Status] Requested by:', currentUser.name);
    console.log('[Backup Status] Total backups:', files.length);
    console.log('[Backup Status] Latest:', latest ? latest.filename : 'None');

    res.json({
      status,
      totalBackups: files.length,
      latestBackup: latest,
      hoursSinceLastBackup: hoursSinceLastBackup ? hoursSinceLastBackup.toFixed(2) : null,
      backups: files.slice(0, 20) // Return latest 20 backups
    });

  } catch (error) {
    console.error('[Backup Status] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

`;

// Insert new route before module.exports
content = content.slice(0, exportsPos) + newRoute + content.slice(exportsPos);

fs.writeFileSync(backupRoutePath, content, 'utf8');

console.log('Modified file size:', content.length, 'bytes');
console.log('+ Added GET /status route');
console.log('SUCCESS: Backup status API added');
