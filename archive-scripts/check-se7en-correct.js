const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Check Se7en (correct user) ===');

// Find user with name Se7en
const users = db.prepare('SELECT id, username, name, department FROM users').all();

console.log('\n--- All users with "Se" or "7" in name ---');
users.filter(u => u.name && (u.name.includes('Se') || u.name.includes('7'))).forEach(u => {
  console.log(`- ${u.name} (${u.username}) - Dept: ${u.department}`);
  const dept = db.prepare('SELECT name FROM departments WHERE id = ?').get(u.department);
  if (dept) {
    console.log(`  Department Name: ${dept.name}`);
  }
});

console.log('\n--- Daily task KK info ---');
const kkTask = db.prepare('SELECT * FROM routine_templates WHERE title = ?').get('KK');
if (kkTask) {
  console.log('Task ID:', kkTask.id);
  console.log('Department ID:', kkTask.department_id);
  console.log('is_daily:', kkTask.is_daily);
  
  const dept = db.prepare('SELECT name FROM departments WHERE id = ?').get(kkTask.department_id);
  if (dept) {
    console.log('Department Name:', dept.name);
  }
}

db.close();
console.log('\n=== Check complete ===');
