// System Debug Script - 系統診斷腳本
const db = require('better-sqlite3')('/app/data/taskflow.db');
const crypto = require('crypto');

console.log('\n========================================');
console.log('TaskFlow Pro System Diagnostic Report');
console.log('========================================\n');

// 1. 用戶系統檢查
console.log('1. USER SYSTEM CHECK');
console.log('-------------------');
const users = db.prepare('SELECT id, username, name, role, department FROM users').all();
console.log(`Total Users: ${users.length}`);
users.forEach(u => {
  console.log(`  - ${u.name} (@${u.username})`);
  console.log(`    ID: ${u.id}`);
  console.log(`    Role: ${u.role}`);
  console.log(`    Department: ${u.department || 'N/A'}`);
});

// 2. 任務系統檢查
console.log('\n2. TASK SYSTEM CHECK');
console.log('-------------------');
const tasks = db.prepare('SELECT COUNT(*) as total FROM tasks').get();
const activeTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status != ?').get('COMPLETED');
const completedTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = ?').get('COMPLETED');
console.log(`Total Tasks: ${tasks.total}`);
console.log(`Active Tasks: ${activeTasks.count}`);
console.log(`Completed Tasks: ${completedTasks.count}`);

// 3. 打卡系統檢查
console.log('\n3. ATTENDANCE SYSTEM CHECK');
console.log('-------------------------');
const totalAttendance = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
console.log(`Total Attendance Records: ${totalAttendance.count}`);

const today = new Date().toISOString().split('T')[0];
const todayRecords = db.prepare('SELECT user_id, clock_in_time, clock_out_time FROM attendance_records WHERE date = ?').all(today);
console.log(`Today's Date: ${today}`);
console.log(`Today's Records: ${todayRecords.length}`);
todayRecords.forEach(r => {
  const user = users.find(u => u.id === r.user_id);
  const status = r.clock_out_time ? 'CLOCKED_OUT' : 'CLOCKED_IN';
  console.log(`  - ${user ? user.name : r.user_id}: ${status}`);
  console.log(`    Clock In: ${r.clock_in_time || 'N/A'}`);
  console.log(`    Clock Out: ${r.clock_out_time || 'N/A'}`);
});

// 4. 聊天系統檢查
console.log('\n4. CHAT SYSTEM CHECK');
console.log('-------------------');
const channels = db.prepare('SELECT COUNT(*) as count FROM chat_channels').get();
const messages = db.prepare('SELECT COUNT(*) as count FROM chat_messages').get();
console.log(`Total Channels: ${channels.count}`);
console.log(`Total Messages: ${messages.count}`);

const recentMessages = db.prepare('SELECT channel_id, user_id, content, timestamp FROM chat_messages ORDER BY timestamp DESC LIMIT 5').all();
console.log('Recent Messages (Last 5):');
recentMessages.forEach(m => {
  const user = users.find(u => u.id === m.user_id);
  console.log(`  - ${user ? user.name : m.user_id}: ${m.content.substring(0, 30)}...`);
  console.log(`    Time: ${m.timestamp}`);
});

// 5. 財務系統檢查
console.log('\n5. FINANCE SYSTEM CHECK');
console.log('----------------------');
const finance = db.prepare('SELECT COUNT(*) as count FROM finance_records').get();
console.log(`Total Finance Records: ${finance.count}`);

// 6. 資料庫表結構檢查
console.log('\n6. DATABASE STRUCTURE CHECK');
console.log('--------------------------');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(`Total Tables: ${tables.length}`);
tables.forEach(t => console.log(`  - ${t.name}`));

// 7. 資料庫完整性檢查
console.log('\n7. DATABASE INTEGRITY CHECK');
console.log('--------------------------');
try {
  const integrity = db.pragma('integrity_check');
  console.log(`Integrity Check: ${integrity[0].integrity_check}`);
} catch (e) {
  console.log(`Integrity Check Failed: ${e.message}`);
}

// 8. 資料庫大小檢查
console.log('\n8. DATABASE SIZE CHECK');
console.log('---------------------');
const fs = require('fs');
const stats = fs.statSync('/app/data/taskflow.db');
console.log(`Database Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

console.log('\n========================================');
console.log('Diagnostic Complete');
console.log('========================================\n');
