const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Check History API ===\n');

const today = new Date().toISOString().split('T')[0];

// Get all records for today
const records = db.prepare('SELECT * FROM routine_records WHERE date = ?').all(today);

console.log('Records for today:', records.length);

records.forEach(r => {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
  console.log('\nUser:', user?.name);
  console.log('completed_items:', r.completed_items);
  
  try {
    const items = JSON.parse(r.completed_items);
    console.log('Items format:', items.length > 0 ? Object.keys(items[0]) : 'empty');
  } catch (e) {
    console.log('Parse error:', e.message);
  }
});

db.close();
