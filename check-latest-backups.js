const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('=== Check Latest Backups ===\n');

const backupDir = '/app/data/backups';

// Get all backup files sorted by modification time
const files = fs.readdirSync(backupDir)
  .filter(f => f.endsWith('.db'))
  .map(f => {
    const filePath = path.join(backupDir, f);
    const stat = fs.statSync(filePath);
    return {
      name: f,
      path: filePath,
      size: stat.size,
      mtime: stat.mtime
    };
  })
  .sort((a, b) => b.mtime - a.mtime);

console.log('Latest backup files (sorted by modification time):\n');
files.slice(0, 10).forEach((file, i) => {
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);
  const date = file.mtime.toISOString();
  console.log(`${i + 1}. ${file.name}`);
  console.log(`   Modified: ${date} (${sizeMB} MB)`);
});

// Check the latest backup for announcements
if (files.length > 0) {
  const latestBackup = files[0];
  console.log('\n=== Check Latest Backup ===');
  console.log('File:', latestBackup.name);
  console.log('Modified:', latestBackup.mtime.toISOString());
  
  try {
    const db = new Database(latestBackup.path, { readonly: true });
    
    // Check announcements
    const totalAnn = db.prepare('SELECT COUNT(*) as count FROM announcements').get();
    console.log('\nAnnouncements:', totalAnn.count);
    
    const recentAnn = db.prepare(`
      SELECT id, title, priority, created_at, created_by
      FROM announcements
      ORDER BY created_at DESC
      LIMIT 10
    `).all();
    
    console.log('Recent announcements:');
    recentAnn.forEach((ann, i) => {
      const creator = db.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
      console.log(`  ${i + 1}. [${ann.priority}] ${ann.title}`);
      console.log(`     Created: ${ann.created_at} by ${creator?.name || ann.created_by}`);
    });
    
    // Check attendance records
    const totalAtt = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
    console.log('\nAttendance records:', totalAtt.count);
    
    const dates = ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29'];
    console.log('Attendance by date:');
    dates.forEach(date => {
      const count = db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get(date);
      console.log(`  ${date}: ${count.count} records`);
    });
    
    db.close();
  } catch (e) {
    console.log('Error reading backup:', e.message);
  }
}

// Compare with current database
console.log('\n=== Compare with Current Database ===\n');
const currentDb = new Database('/app/data/taskflow.db');

const currentAnn = currentDb.prepare('SELECT COUNT(*) as count FROM announcements').get();
const currentAtt = currentDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();

console.log('Current database:');
console.log('  Announcements:', currentAnn.count);
console.log('  Attendance records:', currentAtt.count);

const dates = ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29'];
console.log('  Attendance by date:');
dates.forEach(date => {
  const count = currentDb.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get(date);
  console.log(`    ${date}: ${count.count} records`);
});

currentDb.close();

console.log('\n=== Check Complete ===');
