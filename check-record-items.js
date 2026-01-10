const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Check routine_records table structure and data ===');

// Get table schema
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='routine_records'").get();
console.log('Table schema:');
console.log(schema.sql);

// Get all records for Se7en
const se7en = db.prepare('SELECT id FROM users WHERE username = ?').get('code001');
const records = db.prepare('SELECT * FROM routine_records WHERE user_id = ?').all(se7en.id);

console.log('\n--- Records for Se7en ---');
console.log('Total records:', records.length);

records.forEach(r => {
  console.log('\nRecord ID:', r.id);
  console.log('Date:', r.date);
  console.log('Template ID:', r.template_id);
  console.log('Items column value:', r.items);
  console.log('Items type:', typeof r.items);
  console.log('Items is null:', r.items === null);
  console.log('Items is undefined:', r.items === undefined);
  
  // Try to parse if exists
  if (r.items) {
    try {
      const parsed = JSON.parse(r.items);
      console.log('Parsed items:', parsed);
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  }
});

db.close();
console.log('\n=== Check complete ===');
