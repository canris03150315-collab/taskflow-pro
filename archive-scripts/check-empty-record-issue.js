const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Check empty record issue ===');

// Check all departments and their daily task templates
const depts = db.prepare('SELECT id, name FROM departments').all();

console.log('Departments and their daily task templates:\n');

depts.forEach(dept => {
  const templates = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1')
    .all(dept.id);
  
  console.log(`${dept.name} (${dept.id}):`);
  if (templates.length > 0) {
    templates.forEach(t => {
      console.log(`  - ${t.title}`);
      console.log(`    Items: ${t.items}`);
    });
  } else {
    console.log('  (No daily tasks)');
  }
  console.log('');
});

// Check today's records
const today = new Date().toISOString().split('T')[0];
const records = db.prepare('SELECT * FROM routine_records WHERE date = ?').all(today);

console.log(`\nToday's records (${today}):`);
records.forEach(r => {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
  const dept = db.prepare('SELECT name FROM departments WHERE id = ?').get(r.department_id);
  console.log(`- ${user?.name} (${dept?.name})`);
  console.log(`  Items: ${r.completed_items}`);
});

db.close();
console.log('\n=== Check complete ===');
