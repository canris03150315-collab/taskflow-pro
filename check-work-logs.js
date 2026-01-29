const Database = require('better-sqlite3');

console.log('=== Check Work Logs Data ===\n');

const db = new Database('/app/data/taskflow.db');

// Test 1: Check total work logs
console.log('Test 1: Total work logs in current database');
const total = db.prepare('SELECT COUNT(*) as count FROM work_logs').get();
console.log('Total work logs:', total.count);

// Test 2: Check recent work logs
console.log('\nTest 2: Recent work logs (last 30)');
const recent = db.prepare(`
  SELECT id, user_id, date, content, created_at
  FROM work_logs
  ORDER BY date DESC, created_at DESC
  LIMIT 30
`).all();

console.log('Recent work logs:');
recent.forEach((log, i) => {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(log.user_id);
  console.log(`${i + 1}. ${log.date} - ${user?.name || log.user_id}`);
  console.log(`   Content: ${log.content.substring(0, 50)}...`);
  console.log(`   Created: ${log.created_at}`);
});

// Test 3: Check work logs by date
console.log('\nTest 3: Work logs by date (last 10 days)');
const byDate = db.prepare(`
  SELECT date, COUNT(*) as count
  FROM work_logs
  WHERE date >= date('now', '-10 days')
  GROUP BY date
  ORDER BY date DESC
`).all();

console.log('Work logs by date:');
byDate.forEach(d => {
  console.log(`  ${d.date}: ${d.count} logs`);
});

// Test 4: Check specific dates (26-29)
console.log('\nTest 4: Work logs for Jan 26-29');
const dates = ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29'];
dates.forEach(date => {
  const count = db.prepare('SELECT COUNT(*) as count FROM work_logs WHERE date = ?').get(date);
  console.log(`  ${date}: ${count.count} logs`);
  
  if (count.count > 0) {
    const logs = db.prepare('SELECT * FROM work_logs WHERE date = ? LIMIT 5').all(date);
    logs.forEach(log => {
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(log.user_id);
      console.log(`    - ${user?.name || log.user_id}: ${log.content.substring(0, 30)}...`);
    });
  }
});

db.close();

// Now check backup
console.log('\n=== Check Backup ===\n');

const backupPath = '/app/data/backups/taskflow-backup-2026-01-26T09-35-56-943Z.db';
console.log('Checking backup:', backupPath);

const backupDb = new Database(backupPath, { readonly: true });

const totalBackup = backupDb.prepare('SELECT COUNT(*) as count FROM work_logs').get();
console.log('Total work logs in backup:', totalBackup.count);

const recentBackup = backupDb.prepare(`
  SELECT id, user_id, date, content, created_at
  FROM work_logs
  ORDER BY date DESC, created_at DESC
  LIMIT 30
`).all();

console.log('\nRecent work logs in backup:');
recentBackup.forEach((log, i) => {
  const user = backupDb.prepare('SELECT name FROM users WHERE id = ?').get(log.user_id);
  console.log(`${i + 1}. ${log.date} - ${user?.name || log.user_id}`);
  console.log(`   Content: ${log.content.substring(0, 50)}...`);
});

// Check specific dates in backup
console.log('\nWork logs for Jan 26-29 in backup:');
dates.forEach(date => {
  const count = backupDb.prepare('SELECT COUNT(*) as count FROM work_logs WHERE date = ?').get(date);
  console.log(`  ${date}: ${count.count} logs`);
});

backupDb.close();

// Compare
console.log('\n=== Comparison ===');
console.log('Current DB:', total.count, 'work logs');
console.log('Backup DB:', totalBackup.count, 'work logs');
console.log('Difference:', total.count - totalBackup.count);

if (total.count < totalBackup.count) {
  console.log('\n⚠️ WARNING: Current database has FEWER work logs than backup!');
  console.log('This suggests data loss occurred.');
} else if (total.count > totalBackup.count) {
  console.log('\n✅ Current database has MORE work logs (normal growth)');
} else {
  console.log('\n✅ Same number of work logs');
}

console.log('\n=== Check Complete ===');
