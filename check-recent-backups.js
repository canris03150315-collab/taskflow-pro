const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('=== Check Recent 4 Database Backups ===\n');

const backupDir = '/app/data/backups';

// Get all .db files
const files = fs.readdirSync(backupDir)
  .filter(f => f.endsWith('.db') && !f.includes('-shm') && !f.includes('-wal'))
  .map(f => {
    const filePath = path.join(backupDir, f);
    const stat = fs.statSync(filePath);
    return {
      name: f,
      path: filePath,
      mtime: stat.mtime,
      size: stat.size
    };
  })
  .sort((a, b) => b.mtime - a.mtime)
  .slice(0, 4);

console.log('Found', files.length, 'recent backup files:\n');

files.forEach((file, i) => {
  const taiwanTime = new Date(file.mtime.getTime() + (8 * 60 * 60 * 1000));
  const dateStr = taiwanTime.toISOString().replace('T', ' ').substring(0, 19);
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);
  
  console.log(`${i + 1}. ${file.name}`);
  console.log(`   Time: ${dateStr} (Taiwan Time)`);
  console.log(`   Size: ${sizeMB} MB\n`);
});

// Check each backup
console.log('\n=== Detailed Content Check ===\n');

files.forEach((file, i) => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`BACKUP ${i + 1}: ${file.name}`);
  const taiwanTime = new Date(file.mtime.getTime() + (8 * 60 * 60 * 1000));
  console.log(`Created: ${taiwanTime.toISOString().replace('T', ' ').substring(0, 19)} (Taiwan Time)`);
  console.log('='.repeat(70));
  
  try {
    const db = new Database(file.path, { readonly: true });
    
    // Check key tables
    const announcements = db.prepare('SELECT COUNT(*) as count FROM announcements').get();
    const tasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
    const workLogs = db.prepare('SELECT COUNT(*) as count FROM work_logs').get();
    const attendance = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
    const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const schedules = db.prepare('SELECT COUNT(*) as count FROM schedules').get();
    const reports = db.prepare('SELECT COUNT(*) as count FROM reports').get();
    const memos = db.prepare('SELECT COUNT(*) as count FROM memos').get();
    
    console.log('\nData Summary:');
    console.log(`  Announcements: ${announcements.count}`);
    console.log(`  Tasks: ${tasks.count}`);
    console.log(`  Work Logs: ${workLogs.count}`);
    console.log(`  Attendance Records: ${attendance.count}`);
    console.log(`  Users: ${users.count}`);
    console.log(`  Schedules: ${schedules.count}`);
    console.log(`  Reports: ${reports.count}`);
    console.log(`  Memos: ${memos.count}`);
    
    // Check recent announcements
    const recentAnn = db.prepare('SELECT title, created_at FROM announcements ORDER BY created_at DESC LIMIT 3').all();
    console.log('\n  Recent Announcements:');
    if (recentAnn.length > 0) {
      recentAnn.forEach(a => console.log(`    - ${a.title} (${a.created_at})`));
    } else {
      console.log('    (none)');
    }
    
    // Check recent tasks
    const recentTasks = db.prepare('SELECT title, status, created_at FROM tasks ORDER BY created_at DESC LIMIT 3').all();
    console.log('\n  Recent Tasks:');
    if (recentTasks.length > 0) {
      recentTasks.forEach(t => console.log(`    - ${t.title} (${t.status}) - ${t.created_at}`));
    } else {
      console.log('    (none)');
    }
    
    // Check recent work logs
    const recentLogs = db.prepare('SELECT date, user_id FROM work_logs ORDER BY date DESC, created_at DESC LIMIT 3').all();
    console.log('\n  Recent Work Logs:');
    if (recentLogs.length > 0) {
      recentLogs.forEach(log => {
        const user = db.prepare('SELECT name FROM users WHERE id = ?').get(log.user_id);
        console.log(`    - ${log.date}: ${user?.name || log.user_id}`);
      });
    } else {
      console.log('    (none)');
    }
    
    db.close();
    
  } catch (error) {
    console.log(`\n  ERROR: Cannot read backup - ${error.message}`);
  }
});

console.log('\n\n' + '='.repeat(70));
console.log('COMPARISON WITH CURRENT DATABASE');
console.log('='.repeat(70));

const currentDb = new Database('/app/data/taskflow.db');

const currentAnn = currentDb.prepare('SELECT COUNT(*) as count FROM announcements').get();
const currentTasks = currentDb.prepare('SELECT COUNT(*) as count FROM tasks').get();
const currentLogs = currentDb.prepare('SELECT COUNT(*) as count FROM work_logs').get();
const currentAtt = currentDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
const currentUsers = currentDb.prepare('SELECT COUNT(*) as count FROM users').get();
const currentSchedules = currentDb.prepare('SELECT COUNT(*) as count FROM schedules').get();
const currentReports = currentDb.prepare('SELECT COUNT(*) as count FROM reports').get();
const currentMemos = currentDb.prepare('SELECT COUNT(*) as count FROM memos').get();

console.log('\nCurrent Database:');
console.log(`  Announcements: ${currentAnn.count}`);
console.log(`  Tasks: ${currentTasks.count}`);
console.log(`  Work Logs: ${currentLogs.count}`);
console.log(`  Attendance Records: ${currentAtt.count}`);
console.log(`  Users: ${currentUsers.count}`);
console.log(`  Schedules: ${currentSchedules.count}`);
console.log(`  Reports: ${currentReports.count}`);
console.log(`  Memos: ${currentMemos.count}`);

currentDb.close();

console.log('\n=== Check Complete ===');
