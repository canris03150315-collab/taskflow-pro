const db = require('./node_modules/better-sqlite3')('/app/data/taskflow.db');

const oldDepts = ['Engineering', 'Marketing', 'HR'];

for (const id of oldDepts) {
  // Check if any users are in this department
  const users = db.prepare('SELECT COUNT(*) as count FROM users WHERE department = ?').get(id);
  console.log('Department:', id, '- Users:', users.count);
  
  if (users.count === 0) {
    db.prepare('DELETE FROM departments WHERE id = ?').run(id);
    console.log('DELETED:', id);
  } else {
    console.log('SKIPPED (has users):', id);
  }
}

// Verify
const remaining = db.prepare('SELECT id, name FROM departments').all();
console.log('\nRemaining departments:');
console.log(JSON.stringify(remaining, null, 2));

db.close();
