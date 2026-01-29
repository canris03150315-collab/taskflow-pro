const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('=== Find All Database Files ===\n');

// Search for all .db files
function findDbFiles(dir, results = []) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.includes('node_modules')) {
          findDbFiles(filePath, results);
        } else if (file.endsWith('.db') || file.includes('taskflow') && file.includes('backup')) {
          results.push({
            path: filePath,
            size: stat.size,
            mtime: stat.mtime
          });
        }
      } catch (e) {
        // Skip files we can't access
      }
    }
  } catch (e) {
    // Skip directories we can't access
  }
  
  return results;
}

console.log('Test 1: Search for all .db files in /app and /root');
const dbFiles = [
  ...findDbFiles('/app/data'),
  ...findDbFiles('/root')
];

console.log('Found', dbFiles.length, 'database files:\n');
dbFiles.sort((a, b) => b.mtime - a.mtime);

dbFiles.forEach((file, i) => {
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);
  const date = file.mtime.toISOString();
  console.log(`${i + 1}. ${file.path}`);
  console.log(`   Size: ${sizeMB} MB, Modified: ${date}`);
});

// Check each database for attendance records on 26-28
console.log('\n=== Check Each Database for Jan 26-28 Records ===\n');

dbFiles.forEach((file, i) => {
  try {
    console.log(`\nChecking: ${file.path}`);
    const db = new Database(file.path, { readonly: true });
    
    // Check if attendance_records table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance_records'").all();
    
    if (tables.length === 0) {
      console.log('  No attendance_records table');
      db.close();
      return;
    }
    
    const dates = ['2026-01-26', '2026-01-27', '2026-01-28'];
    let hasRecords = false;
    
    dates.forEach(date => {
      const count = db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get(date);
      if (count.count > 0) {
        console.log(`  ${date}: ${count.count} records`);
        hasRecords = true;
        
        // Show details
        const records = db.prepare('SELECT * FROM attendance_records WHERE date = ? LIMIT 5').all(date);
        records.forEach(r => {
          const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
          console.log(`    - ${user?.name || r.user_id}: ${r.clock_in} to ${r.clock_out || 'NULL'}`);
        });
      }
    });
    
    if (!hasRecords) {
      console.log('  No records for Jan 26-28');
    }
    
    db.close();
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
});

console.log('\n=== Search Complete ===');
