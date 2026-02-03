const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Diagnosing 86 Dept (using correct schema) ===\n');

const dept86Id = 'x3ye5179b';
const dept86Users = db.prepare('SELECT id, name FROM users WHERE department = ?').all(dept86Id);

console.log('86 Dept users:', dept86Users.length);
dept86Users.forEach(u => console.log(`  - ${u.name} (${u.id})`));

// Get the template
const template = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1').get(dept86Id);
console.log('\n86 Dept template:');
console.log(`  Title: ${template.title}`);
console.log(`  Items: ${template.items}`);

// Check today's records
const today = new Date().toISOString().split('T')[0];
console.log(`\nToday's records (${today}):`);

dept86Users.forEach(u => {
  const record = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ?').get(u.id, today);
  
  if (record) {
    console.log(`\n  ${u.name}:`);
    console.log(`    Record ID: ${record.id}`);
    console.log(`    Department: ${record.department_id}`);
    console.log(`    Template: ${record.template_id}`);
    
    if (record.completed_items) {
      const items = JSON.parse(record.completed_items);
      console.log(`    Items: ${items.length}`);
      items.forEach((item, i) => {
        console.log(`      ${i + 1}. ${item.text} - ${item.completed ? 'DONE' : 'TODO'}`);
      });
    } else {
      console.log(`    ⚠️  completed_items is NULL or empty`);
    }
  } else {
    console.log(`\n  ${u.name}: NO RECORD for today`);
  }
});

db.close();
