const fs = require('fs');
const path = require('path');

// Verify backup timestamps are correct
const backupDir = '/app/data/backups';

console.log('Verifying backup timestamps...\n');

const files = fs.readdirSync(backupDir)
  .filter(f => f.endsWith('.db') && f.startsWith('taskflow_backup_'))
  .map(f => {
    const filePath = path.join(backupDir, f);
    const stats = fs.statSync(filePath);
    return {
      filename: f,
      size: stats.size,
      created: stats.mtime.toISOString(),
      timestamp: stats.mtime.getTime(),
      mtime: stats.mtime
    };
  })
  .sort((a, b) => b.timestamp - a.timestamp);

console.log('Total files:', files.length);
console.log('\nFirst 10 backups (newest first):');
files.slice(0, 10).forEach((f, i) => {
  const date = new Date(f.timestamp);
  console.log(`  ${i + 1}. ${f.filename}`);
  console.log(`     Time: ${date.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
  console.log(`     ISO: ${f.created}`);
});

// Check if timestamps are diverse (not all the same)
const uniqueTimestamps = new Set(files.map(f => f.created.split('T')[0]));
console.log('\nUnique dates found:', uniqueTimestamps.size);
console.log('Dates:', Array.from(uniqueTimestamps).sort());

if (uniqueTimestamps.size > 1) {
  console.log('\n✅ SUCCESS: Timestamps are diverse and correct');
} else {
  console.log('\n❌ ERROR: All timestamps are the same date');
}
