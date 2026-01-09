const fs = require('fs');

const backupPath = '/app/dist/routes/backup.js';
let content = fs.readFileSync(backupPath, 'utf8');

// Check if upload route already exists
if (content.includes("router.post('/upload'")) {
  console.log('Upload route already exists');
  process.exit(0);
}

// Add multer requirement at the top
const multerRequire = "const multer = require('multer');\nconst upload = multer({ dest: '/tmp/' });\n";

// Insert multer after other requires
if (!content.includes("const multer = require('multer')")) {
  content = content.replace(
    "const fs = require('fs');",
    "const fs = require('fs');\n" + multerRequire
  );
}

// Add upload route before module.exports
const uploadRoute = `
// Upload database backup - BOSS only
router.post('/upload', authenticateToken, upload.single('backup'), async (req, res) => {
  try {
    const currentUser = req.user;
    
    // Only BOSS can upload backups
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: 'Only BOSS can upload backups' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const uploadedFile = req.file.path;
    const dbPath = '/app/data/taskflow.db';
    const backupPath = dbPath + '.backup-' + Date.now();
    
    // Backup current database
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log('Current database backed up to:', backupPath);
    }
    
    // Replace with uploaded file
    fs.copyFileSync(uploadedFile, dbPath);
    
    // Clean up temp file
    fs.unlinkSync(uploadedFile);
    
    console.log('Database restored from uploaded backup');
    
    res.json({ 
      success: true, 
      message: 'Backup uploaded and restored successfully',
      backupPath: backupPath
    });
    
  } catch (error) {
    console.error('Upload backup error:', error);
    res.status(500).json({ error: 'Server internal error' });
  }
});

`;

// Insert before module.exports
content = content.replace('module.exports = router;', uploadRoute + '\nmodule.exports = router;');

fs.writeFileSync(backupPath, content, 'utf8');
console.log('SUCCESS: Added upload route to backup.js');
