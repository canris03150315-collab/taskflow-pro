const Database = require('better-sqlite3');

console.log('=== Find Missing Tasks ===\n');

const snapshotDb = new Database('/app/snapshot1.db', { readonly: true });
const currentDb = new Database('/app/data/taskflow.db');

// Get all tasks from snapshot
const snapshotTasks = snapshotDb.prepare('SELECT * FROM tasks ORDER BY created_at').all();
console.log('Snapshot tasks:', snapshotTasks.length);
snapshotTasks.forEach((t, i) => {
  console.log(`${i + 1}. ${t.title} (ID: ${t.id})`);
});

// Get all tasks from current database
const currentTasks = currentDb.prepare('SELECT * FROM tasks ORDER BY created_at').all();
console.log('\nCurrent database tasks:', currentTasks.length);
currentTasks.forEach((t, i) => {
  console.log(`${i + 1}. ${t.title} (ID: ${t.id})`);
});

// Find tasks in snapshot but not in current database
const currentTaskIds = new Set(currentTasks.map(t => t.id));
const missingTasks = snapshotTasks.filter(t => !currentTaskIds.has(t.id));

console.log('\n=== Missing Tasks (in snapshot but not in current) ===');
if (missingTasks.length > 0) {
  console.log(`Found ${missingTasks.length} missing tasks:\n`);
  missingTasks.forEach((t, i) => {
    console.log(`${i + 1}. ${t.title}`);
    console.log(`   ID: ${t.id}`);
    console.log(`   Status: ${t.status}`);
    console.log(`   Created: ${t.created_at}`);
    console.log(`   Assigned to: ${t.assigned_to_user_id || 'None'}`);
    console.log('');
  });
} else {
  console.log('No missing tasks found. All snapshot tasks exist in current database.');
}

// Find tasks in current but not in snapshot (newly added)
const snapshotTaskIds = new Set(snapshotTasks.map(t => t.id));
const newTasks = currentTasks.filter(t => !snapshotTaskIds.has(t.id));

console.log('=== New Tasks (in current but not in snapshot) ===');
if (newTasks.length > 0) {
  console.log(`Found ${newTasks.length} new tasks:\n`);
  newTasks.forEach((t, i) => {
    console.log(`${i + 1}. ${t.title}`);
    console.log(`   ID: ${t.id}`);
    console.log(`   Status: ${t.status}`);
    console.log(`   Created: ${t.created_at}`);
    console.log('');
  });
}

snapshotDb.close();
currentDb.close();

console.log('=== Analysis Complete ===');
