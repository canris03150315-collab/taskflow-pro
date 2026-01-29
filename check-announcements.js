const Database = require('better-sqlite3');

console.log('=== Check Announcements ===\n');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

// Test 1: Check total announcements
console.log('Test 1: Total announcements in current database');
const total = db.prepare('SELECT COUNT(*) as count FROM announcements').get();
console.log('Total announcements:', total.count);

// Test 2: Check recent announcements
console.log('\nTest 2: Recent announcements (last 30)');
const recent = db.prepare(`
  SELECT id, title, priority, created_at, created_by
  FROM announcements
  ORDER BY created_at DESC
  LIMIT 30
`).all();

console.log('Recent announcements:');
recent.forEach((ann, i) => {
  const creator = db.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
  console.log(`${i + 1}. [${ann.priority}] ${ann.title}`);
  console.log(`   Created: ${ann.created_at} by ${creator?.name || ann.created_by}`);
});

// Test 3: Check announcements by date
console.log('\nTest 3: Announcements by date (last 10 days)');
const byDate = db.prepare(`
  SELECT DATE(created_at) as date, COUNT(*) as count
  FROM announcements
  WHERE created_at >= datetime('now', '-10 days')
  GROUP BY DATE(created_at)
  ORDER BY date DESC
`).all();

console.log('Announcements by date:');
byDate.forEach(d => {
  console.log(`  ${d.date}: ${d.count} announcements`);
});

db.close();

// Now check backup
console.log('\n=== Check Backup ===\n');

const backupPath = '/app/data/backups/taskflow-backup-2026-01-26T09-35-56-943Z.db';
console.log('Checking backup:', backupPath);

const backupDb = new Database(backupPath, { readonly: true });

const totalBackup = backupDb.prepare('SELECT COUNT(*) as count FROM announcements').get();
console.log('Total announcements in backup:', totalBackup.count);

const recentBackup = backupDb.prepare(`
  SELECT id, title, priority, created_at, created_by
  FROM announcements
  ORDER BY created_at DESC
  LIMIT 30
`).all();

console.log('\nRecent announcements in backup:');
recentBackup.forEach((ann, i) => {
  const creator = backupDb.prepare('SELECT name FROM users WHERE id = ?').get(ann.created_by);
  console.log(`${i + 1}. [${ann.priority}] ${ann.title}`);
  console.log(`   Created: ${ann.created_at} by ${creator?.name || ann.created_by}`);
});

backupDb.close();

// Compare
console.log('\n=== Comparison ===');
console.log('Current DB:', total.count, 'announcements');
console.log('Backup DB:', totalBackup.count, 'announcements');
console.log('Difference:', total.count - totalBackup.count);

if (total.count < totalBackup.count) {
  console.log('\n⚠️ WARNING: Current database has FEWER announcements than backup!');
  console.log('This suggests data loss occurred.');
} else if (total.count > totalBackup.count) {
  console.log('\n✅ Current database has MORE announcements (normal growth)');
} else {
  console.log('\n✅ Same number of announcements');
}

console.log('\n=== Check Complete ===');
