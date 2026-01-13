// Diagnose task notification issue
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Task Notification Diagnosis ===\n');

// Get recent tasks
const tasks = db.prepare(`
  SELECT id, title, status, assigned_to_user_id, created_by, created_at 
  FROM tasks 
  ORDER BY created_at DESC 
  LIMIT 10
`).all();

console.log('Recent tasks:');
tasks.forEach(t => {
  console.log(`  - ${t.title}`);
  console.log(`    Status: ${t.status}, Assigned to: ${t.assigned_to_user_id || 'none'}`);
  console.log(`    Created by: ${t.created_by}`);
});

// Check tasks that should trigger notifications
// taskNotificationCount logic:
// 1. status === 'Assigned' && assignedToUserId === currentUser.id
// 2. status === 'Open' && !assignedToUserId
// 3. unreadUpdatesForUserIds includes currentUser.id

const assignedTasks = db.prepare(`
  SELECT id, title, assigned_to_user_id 
  FROM tasks 
  WHERE status = 'Assigned' AND is_archived = 0
`).all();

const openTasks = db.prepare(`
  SELECT id, title 
  FROM tasks 
  WHERE status = 'Open' AND assigned_to_user_id IS NULL AND is_archived = 0
`).all();

console.log('\n=== Notification-eligible tasks ===');
console.log(`Assigned tasks (waiting acceptance): ${assignedTasks.length}`);
assignedTasks.forEach(t => console.log(`  - ${t.title} -> ${t.assigned_to_user_id}`));

console.log(`\nOpen tasks (anyone can accept): ${openTasks.length}`);
openTasks.forEach(t => console.log(`  - ${t.title}`));

// Get users
const users = db.prepare('SELECT id, name, role FROM users').all();
console.log('\n=== Users ===');
users.forEach(u => console.log(`  - ${u.name} (${u.role}): ${u.id}`));

db.close();
console.log('\n=== Diagnosis complete ===');
