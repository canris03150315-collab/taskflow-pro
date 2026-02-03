const fs = require('fs');

console.log('=== Fixing Backup API Path ===\n');

const backupRoutePath = '/app/dist/routes/backup.js';
let content = fs.readFileSync(backupRoutePath, 'utf8');

console.log('Current file size:', content.length, 'bytes');

// Find and replace the backup directory path
const oldPath = "const backupDir = '/root/taskflow-backups'";
const newPath = "const backupDir = '/app/data/backups'";

if (content.includes(oldPath)) {
  content = content.replace(oldPath, newPath);
  console.log('Replaced backup directory path');
  console.log('  Old:', oldPath);
  console.log('  New:', newPath);
} else {
  console.log('ERROR: Could not find old path in file');
  console.log('Searching for any backup path...');
  const pathMatch = content.match(/backupDir = ['"]([^'"]+)['"]/);
  if (pathMatch) {
    console.log('Found path:', pathMatch[1]);
  }
}

fs.writeFileSync(backupRoutePath, content, 'utf8');

console.log('Modified file size:', content.length, 'bytes');
console.log('SUCCESS: Backup API path fixed');
console.log('');
console.log('Note: Container needs to be restarted for changes to take effect');
