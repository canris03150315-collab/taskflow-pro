const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Diagnosing 86 Dept Different Tasks Issue ===\n');

// Find dept 86 (x3ye5179b)
const dept86Id = 'x3ye5179b';
const dept86Users = db.prepare('SELECT id, name FROM users WHERE department = ?').all(dept86Id);

console.log('86 Dept users:', dept86Users.length);
dept86Users.forEach(u => console.log(`  - ${u.name} (${u.id})`));

// Get the template for dept 86
const template = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1').get(dept86Id);
console.log('\n86 Dept daily template:');
console.log(`  ID: ${template.id}`);
console.log(`  Title: ${template.title}`);
console.log(`  Items: ${template.items}`);

// Parse template items
const templateItems = JSON.parse(template.items);
console.log(`  Total items: ${templateItems.length}`);
templateItems.forEach((item, i) => {
  console.log(`    ${i + 1}. ${item.title}`);
});

// Check today's records for each user
const today = new Date().toISOString().split('T')[0];
console.log(`\nToday's records (${today}):`);

dept86Users.forEach(u => {
  const record = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?').get(u.id, today, dept86Id);
  
  if (record) {
    const recordItems = record.items ? JSON.parse(record.items) : [];
    console.log(`\n  ${u.name}:`);
    console.log(`    Total items: ${recordItems.length}`);
    console.log(`    Completed: ${record.completed_count}/${record.total_count}`);
    
    recordItems.forEach((item, i) => {
      console.log(`      ${i + 1}. ${item.title} - ${item.completed ? 'DONE' : 'TODO'}`);
    });
  } else {
    console.log(`\n  ${u.name}: NO RECORD`);
  }
});

db.close();
