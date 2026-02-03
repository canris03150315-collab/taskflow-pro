const Database = require('better-sqlite3');

console.log('=== Check Work Logs for Missing Data ===\n');

const snapshotDb = new Database('/app/snapshot1.db', { readonly: true });
const currentDb = new Database('/app/data/taskflow.db');

// Get all work logs from snapshot
const snapshotLogs = snapshotDb.prepare('SELECT * FROM work_logs ORDER BY date DESC, created_at DESC').all();
console.log('Snapshot work logs:', snapshotLogs.length);
console.log('\nSnapshot work logs by date:');
const snapshotByDate = {};
snapshotLogs.forEach(log => {
  if (!snapshotByDate[log.date]) snapshotByDate[log.date] = [];
  snapshotByDate[log.date].push(log);
});
Object.keys(snapshotByDate).sort().reverse().forEach(date => {
  console.log(`  ${date}: ${snapshotByDate[date].length} logs`);
  snapshotByDate[date].forEach(log => {
    const user = snapshotDb.prepare('SELECT name FROM users WHERE id = ?').get(log.user_id);
    console.log(`    - ${user?.name || log.user_id} (${log.created_at})`);
  });
});

// Get all work logs from current database
const currentLogs = currentDb.prepare('SELECT * FROM work_logs ORDER BY date DESC, created_at DESC').all();
console.log('\n\nCurrent database work logs:', currentLogs.length);
console.log('\nCurrent work logs by date:');
const currentByDate = {};
currentLogs.forEach(log => {
  if (!currentByDate[log.date]) currentByDate[log.date] = [];
  currentByDate[log.date].push(log);
});
Object.keys(currentByDate).sort().reverse().forEach(date => {
  console.log(`  ${date}: ${currentByDate[date].length} logs`);
  currentByDate[date].forEach(log => {
    const user = currentDb.prepare('SELECT name FROM users WHERE id = ?').get(log.user_id);
    console.log(`    - ${user?.name || log.user_id} (${log.created_at})`);
  });
});

// Find missing work logs
const currentLogIds = new Set(currentLogs.map(l => l.id));
const missingLogs = snapshotLogs.filter(l => !currentLogIds.has(l.id));

console.log('\n\n=== Missing Work Logs (in snapshot but not in current) ===');
if (missingLogs.length > 0) {
  console.log(`Found ${missingLogs.length} missing work logs:\n`);
  missingLogs.forEach((log, i) => {
    const user = snapshotDb.prepare('SELECT name FROM users WHERE id = ?').get(log.user_id);
    console.log(`${i + 1}. ${log.date} - ${user?.name || log.user_id}`);
    console.log(`   ID: ${log.id}`);
    console.log(`   Created: ${log.created_at}`);
    console.log('');
  });
  
  console.log('⚠️ These work logs need to be restored!');
} else {
  console.log('✅ No missing work logs. All snapshot work logs exist in current database.');
}

// Find new work logs
const snapshotLogIds = new Set(snapshotLogs.map(l => l.id));
const newLogs = currentLogs.filter(l => !snapshotLogIds.has(l.id));

console.log('\n=== New Work Logs (in current but not in snapshot) ===');
if (newLogs.length > 0) {
  console.log(`Found ${newLogs.length} new work logs:\n`);
  newLogs.forEach((log, i) => {
    const user = currentDb.prepare('SELECT name FROM users WHERE id = ?').get(log.user_id);
    console.log(`${i + 1}. ${log.date} - ${user?.name || log.user_id}`);
    console.log(`   Created: ${log.created_at}`);
  });
}

snapshotDb.close();
currentDb.close();

console.log('\n=== Analysis Complete ===');
