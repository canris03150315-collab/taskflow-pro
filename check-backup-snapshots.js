const fs = require('fs');
const path = require('path');

console.log('=== Check Available Backup Snapshots ===\n');

// Check for backup files in common locations
const backupLocations = [
  '/root/taskflow-snapshots',
  '/app/data/backups',
  '/app/backups',
  '/root/backups'
];

console.log('Test 1: Search for backup files');
backupLocations.forEach(location => {
  console.log(`\nChecking: ${location}`);
  if (fs.existsSync(location)) {
    console.log('  Directory exists!');
    const files = fs.readdirSync(location);
    
    // Filter for relevant dates (Jan 26-28)
    const relevantFiles = files.filter(f => 
      f.includes('2026-01-26') || 
      f.includes('2026-01-27') || 
      f.includes('2026-01-28') ||
      f.includes('20260126') ||
      f.includes('20260127') ||
      f.includes('20260128') ||
      f.includes('v8.9.18') // Recent versions
    );
    
    if (relevantFiles.length > 0) {
      console.log('  Relevant backup files:');
      relevantFiles.forEach(f => {
        const stat = fs.statSync(path.join(location, f));
        const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
        console.log(`    - ${f} (${sizeMB} MB, ${stat.mtime})`);
      });
    } else {
      console.log('  No relevant backup files found');
    }
    
    // Show all recent files
    const allFiles = files.filter(f => f.includes('.db') || f.includes('.tar.gz'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(location, a));
        const statB = fs.statSync(path.join(location, b));
        return statB.mtime - statA.mtime;
      })
      .slice(0, 10);
    
    if (allFiles.length > 0) {
      console.log('  Recent backup files (last 10):');
      allFiles.forEach(f => {
        const stat = fs.statSync(path.join(location, f));
        const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
        const date = stat.mtime.toISOString().split('T')[0];
        console.log(`    - ${f} (${sizeMB} MB, ${date})`);
      });
    }
  } else {
    console.log('  Directory does not exist');
  }
});

// Check for database backup files
console.log('\nTest 2: Check for .db backup files in /app/data');
const dataPath = '/app/data';
if (fs.existsSync(dataPath)) {
  const files = fs.readdirSync(dataPath);
  const dbBackups = files.filter(f => f.includes('backup') || f.includes('.db.'));
  
  if (dbBackups.length > 0) {
    console.log('Database backup files:');
    dbBackups.forEach(f => {
      const stat = fs.statSync(path.join(dataPath, f));
      const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
      console.log(`  - ${f} (${sizeMB} MB, ${stat.mtime})`);
    });
  } else {
    console.log('No database backup files found');
  }
}

console.log('\n=== Search Complete ===');
