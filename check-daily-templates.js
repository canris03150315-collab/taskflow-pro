const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Check all routine templates ===');

const allTemplates = db.prepare('SELECT id, title, department_id, is_daily FROM routine_templates').all();

console.log('\nTotal templates:', allTemplates.length);

console.log('\n--- Daily Tasks (is_daily = 1) ---');
const dailyTasks = allTemplates.filter(t => t.is_daily === 1);
dailyTasks.forEach(t => {
  console.log(`- ${t.title} (Dept: ${t.department_id})`);
});

console.log('\n--- Documents (is_daily = 0 or null) ---');
const documents = allTemplates.filter(t => !t.is_daily || t.is_daily === 0);
documents.forEach(t => {
  console.log(`- ${t.title} (Dept: ${t.department_id})`);
});

console.log('\n--- Departments ---');
const depts = db.prepare('SELECT id, name FROM departments').all();
depts.forEach(d => {
  console.log(`- ${d.id}: ${d.name}`);
});

db.close();
console.log('\n=== Check complete ===');
