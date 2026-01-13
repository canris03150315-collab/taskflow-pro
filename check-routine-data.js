const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking routine_records data structure ===\n');

const records = db.prepare(`
  SELECT id, user_id, date, completed_items 
  FROM routine_records 
  WHERE date = (SELECT MAX(date) FROM routine_records) 
  LIMIT 3
`).all();

records.forEach((record, index) => {
  console.log(`Record ${index + 1}:`);
  console.log('  ID:', record.id);
  console.log('  User ID:', record.user_id);
  console.log('  Date:', record.date);
  console.log('  completed_items (raw):', record.completed_items);
  
  try {
    const items = JSON.parse(record.completed_items || '[]');
    console.log('  completed_items (parsed):', JSON.stringify(items, null, 4));
  } catch (e) {
    console.log('  Error parsing:', e.message);
  }
  console.log('');
});

db.close();
console.log('Done');
