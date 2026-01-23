const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Check Se7en actual status ===\n');

const se7en = db.prepare('SELECT id FROM users WHERE username = ?').get('code001');
const today = new Date().toISOString().split('T')[0];

const record = db.prepare('SELECT * FROM routine_records WHERE user_id = ? AND date = ?')
  .get(se7en.id, today);

if (record) {
  console.log('Record ID:', record.id);
  console.log('completed_items (raw):', record.completed_items);
  
  const items = JSON.parse(record.completed_items);
  console.log('Parsed items:', JSON.stringify(items, null, 2));
  
  if (items.length > 0) {
    console.log('\nFirst item:');
    console.log('  text:', items[0].text);
    console.log('  completed:', items[0].completed);
    console.log('  typeof completed:', typeof items[0].completed);
  }
} else {
  console.log('No record found');
}

db.close();
