const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Diagnosing DEPT_63 daily tasks ===\n');

// Find DEPT_63 users
const dept63 = 'j06ng7vy3';
const users = db.prepare('SELECT id, name, department FROM users WHERE department = ?').all(dept63);
console.log('DEPT_63 users:', users.length);
users.forEach(u => console.log(`  - ${u.name} (${u.id})`));

// Check templates for DEPT_63
const templates = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1').all(dept63);
console.log('\nDaily task templates for DEPT_63:', templates.length);
templates.forEach(t => console.log(`  - ${t.id}: ${t.title}`));

// Check today's records for each user
const today = new Date().toISOString().split('T')[0];
console.log(`\nToday's records (${today}) for DEPT_63 users:`);
users.forEach(u => {
  const record = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?').get(u.id, today, dept63);
  if (record) {
    console.log(`  - ${u.name}: Has record`);
    console.log(`    Items: ${record.items}`);
    console.log(`    Completed: ${record.completed_count}/${record.total_count}`);
  } else {
    console.log(`  - ${u.name}: NO record`);
  }
});

// Check if there are templates in other departments
console.log('\nAll daily task templates:');
const allTemplates = db.prepare('SELECT * FROM routine_templates WHERE is_daily = 1').all();
allTemplates.forEach(t => {
  const dept = db.prepare('SELECT name FROM departments WHERE id = ?').get(t.department_id);
  console.log(`  - ${t.title} (${dept?.name || t.department_id})`);
});

db.close();
