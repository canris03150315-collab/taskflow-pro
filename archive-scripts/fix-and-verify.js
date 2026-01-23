const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fix and Verify ===\n');

const se7en = db.prepare('SELECT id, department FROM users WHERE username = ?').get('code001');
const today = new Date().toISOString().split('T')[0];

// Step 1: Delete bad record
console.log('1. Deleting bad record...');
const deleteResult = db.prepare('DELETE FROM routine_records WHERE user_id = ? AND date = ?')
  .run(se7en.id, today);
console.log('   Deleted:', deleteResult.changes, 'records');

// Step 2: Get template and create correct record manually
console.log('\n2. Creating correct record...');
const template = db.prepare('SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1')
  .get(se7en.department);

if (!template) {
  console.log('   ERROR: No template found');
  db.close();
  process.exit(1);
}

const templateItems = JSON.parse(template.items);
const correctItems = templateItems.map(text => ({ text, completed: false }));
const recordId = 'routine-' + Date.now();
const now = new Date().toISOString();

db.prepare('INSERT INTO routine_records (id, user_id, department_id, template_id, date, completed_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
  .run(recordId, se7en.id, se7en.department, template.id, today, JSON.stringify(correctItems), now);

console.log('   Created record:', recordId);
console.log('   Items:', JSON.stringify(correctItems));

// Step 3: Test toggle
console.log('\n3. Testing toggle...');
const record = db.prepare('SELECT * FROM routine_records WHERE id = ?').get(recordId);
let items = JSON.parse(record.completed_items);
console.log('   Before toggle:', JSON.stringify(items));

items[0].completed = true;
db.prepare('UPDATE routine_records SET completed_items = ? WHERE id = ?')
  .run(JSON.stringify(items), recordId);

// Verify
const updated = db.prepare('SELECT * FROM routine_records WHERE id = ?').get(recordId);
const updatedItems = JSON.parse(updated.completed_items);
console.log('   After toggle:', JSON.stringify(updatedItems));
console.log('   Toggle works:', updatedItems[0].completed === true);

db.close();
console.log('\n=== Done ===');
