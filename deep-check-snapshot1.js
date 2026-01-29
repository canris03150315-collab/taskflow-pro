const Database = require('better-sqlite3');

console.log('=== Deep Check: v8.9.180-before-schedule-month-selector ===\n');
console.log('Snapshot file: taskflow-snapshot-v8.9.180-before-schedule-month-selector-20260129_063641.tar.gz');
console.log('Created: 2026-01-29 14:37 (Taiwan Time)\n');

const db = new Database('/app/snapshot1.db', { readonly: true });

// Get all tables
console.log('=== All Tables in Snapshot ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Total tables:', tables.length);
tables.forEach(t => console.log(`  - ${t.name}`));

// Check each important table
console.log('\n=== Detailed Data Check ===\n');

// 1. Announcements
console.log('1. ANNOUNCEMENTS');
const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
console.log(`   Total: ${announcements.length}`);
announcements.forEach((a, i) => {
  console.log(`   ${i + 1}. ${a.title}`);
  console.log(`      ID: ${a.id}`);
  console.log(`      Created: ${a.created_at}`);
  console.log(`      Priority: ${a.priority}`);
});

// 2. Tasks
console.log('\n2. TASKS');
const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
console.log(`   Total: ${tasks.length}`);
tasks.forEach((t, i) => {
  console.log(`   ${i + 1}. ${t.title}`);
  console.log(`      ID: ${t.id}`);
  console.log(`      Status: ${t.status}`);
  console.log(`      Created: ${t.created_at}`);
  console.log(`      Assigned to: ${t.assigned_to_user_id || 'None'}`);
});

// 3. Users
console.log('\n3. USERS');
const users = db.prepare('SELECT id, name, role FROM users ORDER BY name').all();
console.log(`   Total: ${users.length}`);
users.forEach((u, i) => {
  console.log(`   ${i + 1}. ${u.name} (${u.role})`);
});

// 4. Departments
console.log('\n4. DEPARTMENTS');
const departments = db.prepare('SELECT id, name FROM departments ORDER BY name').all();
console.log(`   Total: ${departments.length}`);
departments.forEach((d, i) => {
  console.log(`   ${i + 1}. ${d.name} (ID: ${d.id})`);
});

// 5. Schedules
console.log('\n5. SCHEDULES');
const schedules = db.prepare('SELECT COUNT(*) as count FROM schedules').get();
console.log(`   Total: ${schedules.count}`);
const schedulesByMonth = db.prepare('SELECT year, month, COUNT(*) as count FROM schedules GROUP BY year, month ORDER BY year DESC, month DESC').all();
schedulesByMonth.forEach(s => {
  console.log(`   ${s.year}-${s.month}: ${s.count} schedules`);
});

// 6. Reports
console.log('\n6. REPORTS');
const reports = db.prepare('SELECT COUNT(*) as count FROM reports').get();
console.log(`   Total: ${reports.count}`);
const recentReports = db.prepare('SELECT type, created_at FROM reports ORDER BY created_at DESC LIMIT 5').all();
if (recentReports.length > 0) {
  console.log('   Recent reports:');
  recentReports.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.type} (${r.created_at})`);
  });
}

// 7. Memos
console.log('\n7. MEMOS');
const memos = db.prepare('SELECT COUNT(*) as count FROM memos').get();
console.log(`   Total: ${memos.count}`);

// 8. Finance
console.log('\n8. FINANCE');
const finance = db.prepare('SELECT COUNT(*) as count FROM finance').get();
console.log(`   Total: ${finance.count}`);

// 9. Suggestions (Forum)
console.log('\n9. SUGGESTIONS (Forum)');
const suggestions = db.prepare('SELECT COUNT(*) as count FROM suggestions').get();
console.log(`   Total: ${suggestions.count}`);

// 10. Leave Requests
console.log('\n10. LEAVE REQUESTS');
const leaveRequests = db.prepare('SELECT COUNT(*) as count FROM leave_requests').get();
console.log(`   Total: ${leaveRequests.count}`);

db.close();

console.log('\n=== Now Compare with Current Database ===\n');

const currentDb = new Database('/app/data/taskflow.db');

console.log('CURRENT DATABASE:');
console.log('1. Announcements:', currentDb.prepare('SELECT COUNT(*) as count FROM announcements').get().count);
console.log('2. Tasks:', currentDb.prepare('SELECT COUNT(*) as count FROM tasks').get().count);
console.log('3. Users:', currentDb.prepare('SELECT COUNT(*) as count FROM users').get().count);
console.log('4. Departments:', currentDb.prepare('SELECT COUNT(*) as count FROM departments').get().count);
console.log('5. Schedules:', currentDb.prepare('SELECT COUNT(*) as count FROM schedules').get().count);
console.log('6. Reports:', currentDb.prepare('SELECT COUNT(*) as count FROM reports').get().count);
console.log('7. Memos:', currentDb.prepare('SELECT COUNT(*) as count FROM memos').get().count);
console.log('8. Finance:', currentDb.prepare('SELECT COUNT(*) as count FROM finance').get().count);
console.log('9. Suggestions:', currentDb.prepare('SELECT COUNT(*) as count FROM suggestions').get().count);
console.log('10. Leave Requests:', currentDb.prepare('SELECT COUNT(*) as count FROM leave_requests').get().count);

currentDb.close();

console.log('\n=== Deep Check Complete ===');
