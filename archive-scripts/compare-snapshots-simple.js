const Database = require('better-sqlite3');

console.log('=== Compare Three Snapshots for Missing Data ===\n');

const snapshots = [
  { name: 'Snapshot 1: v8.9.180-before-schedule-month-selector (14:37)', path: '/app/snapshot1.db' },
  { name: 'Snapshot 2: v8.9.180-before-schedule-delete (14:49)', path: '/app/snapshot2.db' },
  { name: 'Snapshot 3: v8.9.181-before-remove-employee-delete (15:17)', path: '/app/snapshot3.db' }
];

snapshots.forEach(snapshot => {
  console.log(`\n=== ${snapshot.name} ===`);
  
  const db = new Database(snapshot.path, { readonly: true });
  
  // Check announcements
  const announcements = db.prepare('SELECT id, title, created_at FROM announcements ORDER BY created_at DESC').all();
  console.log(`\nAnnouncements: ${announcements.length} total`);
  announcements.forEach((a, idx) => {
    console.log(`  ${idx + 1}. ${a.title} (${a.created_at})`);
  });
  
  // Check tasks
  const tasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
  console.log(`\nTasks: ${tasks.count} total`);
  
  const recentTasks = db.prepare('SELECT id, title, status, created_at FROM tasks ORDER BY created_at DESC LIMIT 15').all();
  console.log('Recent tasks:');
  recentTasks.forEach((t, idx) => {
    console.log(`  ${idx + 1}. ${t.title} (${t.status}) - ${t.created_at}`);
  });
  
  db.close();
});

// Compare current database
console.log('\n\n=== Current Database ===');
const currentDb = new Database('/app/data/taskflow.db');

const currentAnn = currentDb.prepare('SELECT id, title, created_at FROM announcements ORDER BY created_at DESC').all();
console.log(`\nAnnouncements: ${currentAnn.length} total`);
currentAnn.forEach((a, idx) => {
  console.log(`  ${idx + 1}. ${a.title} (${a.created_at})`);
});

const currentTasks = currentDb.prepare('SELECT COUNT(*) as count FROM tasks').get();
console.log(`\nTasks: ${currentTasks.count} total`);

const currentRecentTasks = currentDb.prepare('SELECT id, title, status, created_at FROM tasks ORDER BY created_at DESC LIMIT 15').all();
console.log('Recent tasks:');
currentRecentTasks.forEach((t, idx) => {
  console.log(`  ${idx + 1}. ${t.title} (${t.status}) - ${t.created_at}`);
});

currentDb.close();

console.log('\n=== Analysis ===');
console.log('Check if any snapshot has MORE announcements or tasks than current database.');
console.log('If yes, those are the missing data that need to be restored.');

console.log('\n=== Comparison Complete ===');
