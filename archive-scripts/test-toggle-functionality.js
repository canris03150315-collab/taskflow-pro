const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Test toggle functionality ===');

// Get Se7en's today record
const se7en = db.prepare('SELECT id FROM users WHERE username = ?').get('code001');
const today = new Date().toISOString().split('T')[0];

const record = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ?')
  .get(se7en.id, today);

if (!record) {
  console.log('ERROR: No record found for today');
  db.close();
  process.exit(1);
}

console.log('Record ID:', record.id);
console.log('Current completed_items:', record.completed_items);

// Parse items
const items = JSON.parse(record.completed_items || '[]');
console.log('\nParsed items:', JSON.stringify(items, null, 2));

// Simulate toggle (set first item to completed)
console.log('\n--- Simulating toggle: set index 0 to true ---');
items[0].completed = true;

// Update database
db.prepare('UPDATE routine_records SET completed_items = ? WHERE id = ?')
  .run(JSON.stringify(items), record.id);

console.log('Updated items:', JSON.stringify(items, null, 2));

// Verify update
const updated = db.prepare('SELECT * FROM routine_records WHERE id = ?').get(record.id);
console.log('\nVerification - completed_items after update:', updated.completed_items);

const verifyItems = JSON.parse(updated.completed_items);
console.log('Parsed after update:', JSON.stringify(verifyItems, null, 2));
console.log('First item completed:', verifyItems[0].completed);

db.close();
console.log('\n=== Test complete ===');
