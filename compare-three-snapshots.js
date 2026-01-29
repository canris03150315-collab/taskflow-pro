const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Compare Three Snapshots for Missing Data ===\n');

// Prepare snapshot databases
const snapshots = [
  {
    name: 'v8.9.180-before-schedule-month-selector (14:37)',
    path: '/root/taskflow-snapshots/taskflow-snapshot-v8.9.180-before-schedule-month-selector-20260129_063641/taskflow.db'
  },
  {
    name: 'v8.9.180-before-schedule-delete (14:49)',
    path: '/root/taskflow-snapshots/taskflow-snapshot-v8.9.180-before-schedule-delete-20260129_064814/taskflow.db'
  },
  {
    name: 'v8.9.181-before-remove-employee-delete (15:17)',
    path: '/root/taskflow-snapshots/taskflow-snapshot-v8.9.181-before-remove-employee-delete-20260129_071643/taskflow.db'
  }
];

// Extract snapshots first
console.log('Extracting snapshots...\n');
const { execSync } = require('child_process');

try {
  execSync('cd /root/taskflow-snapshots && tar -xzf taskflow-snapshot-v8.9.180-before-schedule-delete-20260129_064814.tar.gz', { stdio: 'ignore' });
  execSync('cd /root/taskflow-snapshots && tar -xzf taskflow-snapshot-v8.9.181-before-remove-employee-delete-20260129_071643.tar.gz', { stdio: 'ignore' });
  console.log('Snapshots extracted\n');
} catch (e) {
  console.log('Extraction may have already been done\n');
}

// Copy to accessible location
snapshots.forEach((snapshot, i) => {
  const targetPath = `/app/snapshot${i + 1}.db`;
  try {
    execSync(`cp ${snapshot.path} ${targetPath}`, { stdio: 'ignore' });
    snapshot.dbPath = targetPath;
  } catch (e) {
    console.log(`Warning: Could not copy ${snapshot.name}`);
  }
});

// Check each snapshot
snapshots.forEach((snapshot, i) => {
  if (!snapshot.dbPath || !fs.existsSync(snapshot.dbPath)) {
    console.log(`\n=== Snapshot ${i + 1}: ${snapshot.name} ===`);
    console.log('ERROR: Database file not accessible\n');
    return;
  }

  console.log(`\n=== Snapshot ${i + 1}: ${snapshot.name} ===`);
  
  const db = new Database(snapshot.dbPath, { readonly: true });
  
  // Check announcements
  const announcements = db.prepare('SELECT id, title, created_at FROM announcements ORDER BY created_at DESC').all();
  console.log(`\nAnnouncements: ${announcements.length} total`);
  announcements.forEach((a, idx) => {
    console.log(`  ${idx + 1}. ${a.title}`);
    console.log(`     ID: ${a.id}, Created: ${a.created_at}`);
  });
  
  // Check tasks
  const tasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
  console.log(`\nTasks: ${tasks.count} total`);
  
  const recentTasks = db.prepare('SELECT id, title, status, created_at FROM tasks ORDER BY created_at DESC LIMIT 10').all();
  console.log('Recent tasks (last 10):');
  recentTasks.forEach((t, idx) => {
    console.log(`  ${idx + 1}. ${t.title} (${t.status})`);
    console.log(`     ID: ${t.id}, Created: ${t.created_at}`);
  });
  
  db.close();
});

// Compare current database
console.log('\n\n=== Current Database ===');
const currentDb = new Database('/app/data/taskflow.db');

const currentAnn = currentDb.prepare('SELECT id, title, created_at FROM announcements ORDER BY created_at DESC').all();
console.log(`\nAnnouncements: ${currentAnn.length} total`);
currentAnn.forEach((a, idx) => {
  console.log(`  ${idx + 1}. ${a.title}`);
  console.log(`     ID: ${a.id}, Created: ${a.created_at}`);
});

const currentTasks = currentDb.prepare('SELECT COUNT(*) as count FROM tasks').get();
console.log(`\nTasks: ${currentTasks.count} total`);

const currentRecentTasks = currentDb.prepare('SELECT id, title, status, created_at FROM tasks ORDER BY created_at DESC LIMIT 10').all();
console.log('Recent tasks (last 10):');
currentRecentTasks.forEach((t, idx) => {
  console.log(`  ${idx + 1}. ${t.title} (${t.status})`);
  console.log(`     ID: ${t.id}, Created: ${t.created_at}`);
});

currentDb.close();

console.log('\n=== Comparison Complete ===');
