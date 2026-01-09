const fs = require('fs');

const filePath = '/app/dist/routes/backup.js';

// 檢查文件是否存在
if (!fs.existsSync(filePath)) {
  console.log('Creating new backup.js file...');
  
  const backupRouteContent = `const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// Download database backup - BOSS only
router.get('/download', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    
    // Only BOSS can download backups
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: 'Only BOSS can download backups' });
    }
    
    const dbPath = '/app/data/taskflow.db';
    
    // Check if database exists
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }
    
    // Get file stats
    const stats = fs.statSync(dbPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = \`taskflow-backup-\${timestamp}.db\`;
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', \`attachment; filename="\${filename}"\`);
    res.setHeader('Content-Length', stats.size);
    
    // Stream the file
    const fileStream = fs.createReadStream(dbPath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download backup' });
      }
    });
    
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({ error: 'Server internal error' });
  }
});

module.exports = router;
`;
  
  fs.writeFileSync(filePath, backupRouteContent, 'utf8');
  console.log('SUCCESS: Created backup.js with download route');
} else {
  console.log('backup.js already exists, skipping creation');
}

// Now add the route to server.js
const serverPath = '/app/dist/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Check if backup route is already registered
if (serverContent.includes("app.use('/api/backup'")) {
  console.log('Backup route already registered in server.js');
} else {
  // Find where to insert the route (after other routes)
  const routePattern = /app\.use\('\/api\/\w+',\s*require\('\.\/routes\/\w+'\)\);/g;
  const matches = serverContent.match(routePattern);
  
  if (matches && matches.length > 0) {
    const lastRoute = matches[matches.length - 1];
    const insertPosition = serverContent.indexOf(lastRoute) + lastRoute.length;
    
    const newRoute = "\napp.use('/api/backup', require('./routes/backup'));";
    serverContent = serverContent.slice(0, insertPosition) + newRoute + serverContent.slice(insertPosition);
    
    fs.writeFileSync(serverPath, serverContent, 'utf8');
    console.log('SUCCESS: Added backup route to server.js');
  } else {
    console.log('WARNING: Could not find route pattern in server.js');
  }
}
