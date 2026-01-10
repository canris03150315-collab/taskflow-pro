const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Check Se7en user info ===');

const user = db.prepare('SELECT id, username, name, department FROM users WHERE username = ?').get('canris');

if (user) {
  console.log('User ID:', user.id);
  console.log('Username:', user.username);
  console.log('Name:', user.name);
  console.log('Department ID:', user.department);
  
  const dept = db.prepare('SELECT id, name FROM departments WHERE id = ?').get(user.department);
  if (dept) {
    console.log('Department Name:', dept.name);
  }
} else {
  console.log('User not found');
}

db.close();
console.log('\n=== Check complete ===');
