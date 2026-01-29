const fs = require('fs');
const path = require('path');

console.log('=== Recent 10 Snapshots (Taiwan Time UTC+8) ===\n');

const snapshotDir = '/root/taskflow-snapshots';

// Get all .tar.gz files
const files = fs.readdirSync(snapshotDir)
  .filter(f => f.endsWith('.tar.gz'))
  .map(f => {
    const filePath = path.join(snapshotDir, f);
    const stat = fs.statSync(filePath);
    return {
      name: f,
      mtime: stat.mtime,
      size: stat.size
    };
  })
  .sort((a, b) => b.mtime - a.mtime)
  .slice(0, 10);

console.log('No.  Taiwan Time (UTC+8)        Size      Snapshot Name');
console.log('==================================================================');

files.forEach((file, i) => {
  // Convert to Taiwan time (UTC+8)
  const taiwanTime = new Date(file.mtime.getTime() + (8 * 60 * 60 * 1000));
  const dateStr = taiwanTime.toISOString().replace('T', ' ').substring(0, 19);
  const sizeMB = (file.size / 1024 / 1024).toFixed(0);
  
  console.log(`${String(i + 1).padStart(2)}   ${dateStr}  ${String(sizeMB).padStart(4)}MB   ${file.name}`);
});

console.log('\n=== List Complete ===');
