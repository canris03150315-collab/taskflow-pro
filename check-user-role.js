const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking User Roles ===\n');

// Get all users
const users = db.prepare('SELECT id, name, role, department FROM users ORDER BY role, name').all();

console.log('All users:');
users.forEach(user => {
  console.log(`  ${user.name} (${user.id})`);
  console.log(`    Role: ${user.role}`);
  console.log(`    Department: ${user.department}`);
  console.log(`    Can see audit log: ${user.role === 'BOSS' || user.role === 'MANAGER' || user.role === 'SUPERVISOR' ? 'YES' : 'NO'}`);
  console.log('');
});

db.close();
console.log('=== Check Complete ===');
