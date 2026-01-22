const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fixing undefined items in routine records ===\n');

const today = new Date().toISOString().split('T')[0];

// Get the template to know correct items
const template = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1').get('x3ye5179b');

if (!template) {
  console.log('No template found');
  db.close();
  process.exit(0);
}

console.log('Template items:', template.items);
const templateItems = JSON.parse(template.items);
console.log('Parsed template items:', templateItems);

// Get all today's records for dept 86
const records = db.prepare('SELECT * FROM routine_records WHERE date = ? AND department_id = ?').all(today, 'x3ye5179b');

console.log(`\nFound ${records.length} records for dept 86 today`);

let fixed = 0;
records.forEach(record => {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(record.user_id);
  
  if (!record.completed_items) {
    console.log(`${user.name}: No completed_items, skipping`);
    return;
  }
  
  const items = JSON.parse(record.completed_items);
  console.log(`\n${user.name}: ${items.length} items`);
  
  // Check if any item has undefined text
  let hasUndefined = false;
  items.forEach((item, i) => {
    if (!item.text || item.text === 'undefined') {
      console.log(`  Item ${i + 1}: undefined (should be: ${templateItems[i]})`);
      hasUndefined = true;
    }
  });
  
  if (hasUndefined) {
    // Rebuild items from template
    const newItems = templateItems.map((templateItem, i) => ({
      text: templateItem,
      completed: items[i] ? items[i].completed : false
    }));
    
    // Update record
    db.prepare('UPDATE routine_records SET completed_items = ? WHERE id = ?').run(
      JSON.stringify(newItems),
      record.id
    );
    
    console.log(`  ✅ Fixed ${user.name}`);
    fixed++;
  } else {
    console.log(`  ✅ ${user.name} is OK`);
  }
});

console.log(`\n✅ Fixed ${fixed} records`);
db.close();
