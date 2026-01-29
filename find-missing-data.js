const Database = require('better-sqlite3');

console.log('=== Find Missing Data ===\n');

const currentDb = new Database('/app/data/taskflow.db');
const backupDb = new Database('/app/data/backups/taskflow-backup-2026-01-26T09-35-56-943Z.db', { readonly: true });

// Test 1: Find the extra announcement
console.log('Test 1: Find announcements in current DB but not in backup\n');

const currentAnn = currentDb.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
const backupAnn = backupDb.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();

console.log('Current DB announcements:', currentAnn.length);
console.log('Backup DB announcements:', backupAnn.length);

const backupIds = new Set(backupAnn.map(a => a.id));
const newAnnouncements = currentAnn.filter(a => !backupIds.has(a.id));

if (newAnnouncements.length > 0) {
  console.log('\nNew announcements (not in backup):');
  newAnnouncements.forEach(ann => {
    const creator = currentDb.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
    console.log(`  - [${ann.priority}] ${ann.title}`);
    console.log(`    Created: ${ann.created_at} by ${creator?.name || ann.created_by}`);
    console.log(`    Content: ${ann.content.substring(0, 100)}...`);
  });
} else {
  console.log('\nNo new announcements found');
}

// Test 2: Find attendance records in current DB but not in backup
console.log('\n\nTest 2: Find attendance records in current DB but not in backup\n');

const currentAtt = currentDb.prepare('SELECT * FROM attendance_records ORDER BY created_at DESC LIMIT 20').all();
const backupAtt = backupDb.prepare('SELECT * FROM attendance_records ORDER BY created_at DESC LIMIT 20').all();

console.log('Current DB attendance (latest 20):', currentAtt.length);
console.log('Backup DB attendance (latest 20):', backupAtt.length);

const backupAttIds = new Set(backupAtt.map(a => a.id));
const newAttendance = currentAtt.filter(a => !backupAttIds.has(a.id));

if (newAttendance.length > 0) {
  console.log('\nNew attendance records (not in backup):');
  newAttendance.forEach(att => {
    const user = currentDb.prepare('SELECT name FROM users WHERE id = ?').get(att.user_id);
    console.log(`  - ${att.date}: ${user?.name || att.user_id}`);
    console.log(`    Clock in: ${att.clock_in}, Clock out: ${att.clock_out || 'NULL'}`);
    console.log(`    Status: ${att.status}, Created: ${att.created_at}`);
  });
} else {
  console.log('\nNo new attendance records found in latest 20');
}

// Test 3: Check all attendance records count
console.log('\n\nTest 3: Total attendance records comparison\n');
const totalCurrent = currentDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
const totalBackup = backupDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();

console.log('Current DB total:', totalCurrent.count);
console.log('Backup DB total:', totalBackup.count);
console.log('Difference:', totalCurrent.count - totalBackup.count);

// Test 4: Check if there are records created after backup time
console.log('\n\nTest 4: Records created after backup time (2026-01-26 09:35:56)\n');

const afterBackup = currentDb.prepare(`
  SELECT * FROM attendance_records 
  WHERE created_at > '2026-01-26 09:35:56'
  ORDER BY created_at
`).all();

console.log('Attendance records created after backup:', afterBackup.length);
if (afterBackup.length > 0) {
  console.log('\nDetails:');
  afterBackup.forEach(att => {
    const user = currentDb.prepare('SELECT name FROM users WHERE id = ?').get(att.user_id);
    console.log(`  - ${att.date}: ${user?.name || att.user_id}`);
    console.log(`    Clock in: ${att.clock_in}, Clock out: ${att.clock_out || 'NULL'}`);
    console.log(`    Created: ${att.created_at}`);
  });
}

currentDb.close();
backupDb.close();

console.log('\n=== Analysis Complete ===');
