const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('=== Check Latest 4 Backups from /root/taskflow-backups/ ===\n');

const backupDir = '/root/taskflow-backups';

// Get all .db files (excluding WAL and SHM)
const files = fs.readdirSync(backupDir)
  .filter(f => f.endsWith('.db') && !f.includes('-shm') && !f.includes('-wal') && f !== 'latest.db')
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

console.log('Latest 4 backup files:\n');

files.forEach((file, i) => {
  const taiwanTime = new Date(file.mtime.getTime() + (8 * 60 * 60 * 1000));
  const dateStr = taiwanTime.toISOString().replace('T', ' ').substring(0, 19);
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);
  
  console.log(`${i + 1}. ${file.name}`);
  console.log(`   Time: ${dateStr} (Taiwan Time)`);
  console.log(`   Size: ${sizeMB} MB\n`);
});

// Check each backup in detail
console.log('\n' + '='.repeat(80));
console.log('DETAILED CONTENT CHECK');
console.log('='.repeat(80) + '\n');

files.forEach((file, i) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`BACKUP ${i + 1}: ${file.name}`);
  const taiwanTime = new Date(file.mtime.getTime() + (8 * 60 * 60 * 1000));
  console.log(`Created: ${taiwanTime.toISOString().replace('T', ' ').substring(0, 19)} (Taiwan Time)`);
  console.log('='.repeat(80));
  
  try {
    const db = new Database(file.path, { readonly: true });
    
    // Summary counts
    const announcements = db.prepare('SELECT COUNT(*) as count FROM announcements').get();
    const tasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
    const workLogs = db.prepare('SELECT COUNT(*) as count FROM work_logs').get();
    const attendance = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
    const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const schedules = db.prepare('SELECT COUNT(*) as count FROM schedules').get();
    const reports = db.prepare('SELECT COUNT(*) as count FROM reports').get();
    const memos = db.prepare('SELECT COUNT(*) as count FROM memos').get();
    
    console.log('\n📊 Data Summary:');
    console.log(`  Announcements: ${announcements.count}`);
    console.log(`  Tasks: ${tasks.count}`);
    console.log(`  Work Logs: ${workLogs.count}`);
    console.log(`  Attendance Records: ${attendance.count}`);
    console.log(`  Users: ${users.count}`);
    console.log(`  Schedules: ${schedules.count}`);
    console.log(`  Reports: ${reports.count}`);
    console.log(`  Memos: ${memos.count}`);
    
    // All announcements
    const allAnn = db.prepare('SELECT id, title, created_at, priority FROM announcements ORDER BY created_at DESC').all();
    console.log(`\n📢 All Announcements (${allAnn.length}):`);
    allAnn.forEach((a, idx) => {
      console.log(`  ${idx + 1}. [${a.priority}] ${a.title}`);
      console.log(`     Created: ${a.created_at}, ID: ${a.id}`);
    });
    
    // All tasks
    const allTasks = db.prepare('SELECT id, title, status, created_at FROM tasks ORDER BY created_at DESC').all();
    console.log(`\n📋 All Tasks (${allTasks.length}):`);
    allTasks.forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.title} (${t.status})`);
      console.log(`     Created: ${t.created_at}, ID: ${t.id}`);
    });
    
    // Work logs by date
    const workLogsByDate = db.prepare(`
      SELECT date, COUNT(*) as count 
      FROM work_logs 
      GROUP BY date 
      ORDER BY date DESC 
      LIMIT 10
    `).all();
    console.log(`\n📝 Recent Work Logs by Date:`);
    workLogsByDate.forEach(w => {
      const logs = db.prepare('SELECT user_id FROM work_logs WHERE date = ?').all(w.date);
      const users = logs.map(l => {
        const user = db.prepare('SELECT name FROM users WHERE id = ?').get(l.user_id);
        return user?.name || l.user_id;
      });
      console.log(`  ${w.date}: ${w.count} logs (${users.join(', ')})`);
    });
    
    // Attendance by date
    const attByDate = db.prepare(`
      SELECT date, COUNT(*) as count 
      FROM attendance_records 
      WHERE date >= '2026-01-26'
      GROUP BY date 
      ORDER BY date DESC
    `).all();
    console.log(`\n⏰ Attendance Records (from 2026-01-26):`);
    if (attByDate.length > 0) {
      attByDate.forEach(a => {
        const records = db.prepare('SELECT user_id, clock_in, clock_out FROM attendance_records WHERE date = ?').all(a.date);
        console.log(`  ${a.date}: ${a.count} records`);
        records.forEach(r => {
          const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
          console.log(`    - ${user?.name || r.user_id}: ${r.clock_in} to ${r.clock_out || 'NULL'}`);
        });
      });
    } else {
      console.log('  (No records from 2026-01-26 onwards)');
    }
    
    db.close();
    
  } catch (error) {
    console.log(`\n  ❌ ERROR: Cannot read backup - ${error.message}`);
  }
});

// Compare with current database
console.log('\n\n' + '='.repeat(80));
console.log('CURRENT DATABASE');
console.log('='.repeat(80));

const currentDb = new Database('/app/data/taskflow.db');

const currentAnn = currentDb.prepare('SELECT COUNT(*) as count FROM announcements').get();
const currentTasks = currentDb.prepare('SELECT COUNT(*) as count FROM tasks').get();
const currentLogs = currentDb.prepare('SELECT COUNT(*) as count FROM work_logs').get();
const currentAtt = currentDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
const currentSchedules = currentDb.prepare('SELECT COUNT(*) as count FROM schedules').get();
const currentReports = currentDb.prepare('SELECT COUNT(*) as count FROM reports').get();
const currentMemos = currentDb.prepare('SELECT COUNT(*) as count FROM memos').get();

console.log('\n📊 Current Database Summary:');
console.log(`  Announcements: ${currentAnn.count}`);
console.log(`  Tasks: ${currentTasks.count}`);
console.log(`  Work Logs: ${currentLogs.count}`);
console.log(`  Attendance Records: ${currentAtt.count}`);
console.log(`  Schedules: ${currentSchedules.count}`);
console.log(`  Reports: ${currentReports.count}`);
console.log(`  Memos: ${currentMemos.count}`);

const currentAllAnn = currentDb.prepare('SELECT id, title, created_at FROM announcements ORDER BY created_at DESC').all();
console.log(`\n📢 Current Announcements (${currentAllAnn.length}):`);
currentAllAnn.forEach((a, idx) => {
  console.log(`  ${idx + 1}. ${a.title} (${a.created_at})`);
});

const currentAllTasks = currentDb.prepare('SELECT id, title, status, created_at FROM tasks ORDER BY created_at DESC').all();
console.log(`\n📋 Current Tasks (${currentAllTasks.length}):`);
currentAllTasks.forEach((t, idx) => {
  console.log(`  ${idx + 1}. ${t.title} (${t.status}) - ${t.created_at}`);
});

currentDb.close();

console.log('\n' + '='.repeat(80));
console.log('=== Check Complete ===');
