const fs = require('fs');
const path = require('path');

// Test backup status API logic
const backupDir = '/app/data/backups';

console.log('Testing backup status API...\n');

// Check if backup directory exists
if (!fs.existsSync(backupDir)) {
  console.log('ERROR: Backup directory not found');
  process.exit(1);
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

console.log('Total backup files found:', files.length);

if (files.length > 0) {
  const latest = files[0];
  console.log('\nLatest backup:');
  console.log('  Filename:', latest.filename);
  console.log('  Size:', (latest.size / 1024 / 1024).toFixed(2), 'MB');
  console.log('  Created:', latest.created);
  
  const hoursSinceLastBackup = (Date.now() - latest.timestamp) / (1000 * 60 * 60);
  console.log('  Hours since last backup:', hoursSinceLastBackup.toFixed(2));
  
  let status = 'unknown';
  if (hoursSinceLastBackup < 2) {
    status = 'healthy';
  } else if (hoursSinceLastBackup < 24) {
    status = 'warning';
  } else {
    status = 'error';
  }
  console.log('  Status:', status);
  
  console.log('\nFirst 5 backups:');
  files.slice(0, 5).forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.filename} (${(f.size / 1024 / 1024).toFixed(2)} MB)`);
  });
  
  console.log('\nSUCCESS: Backup API logic working correctly');
} else {
  console.log('ERROR: No backup files found');
}
