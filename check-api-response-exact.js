const fs = require('fs');
const Database = require('./node_modules/better-sqlite3');

console.log('=== Check exact API response format ===\n');

// Read the actual history route code
const content = fs.readFileSync('/app/dist/routes/routines.js', 'utf8');

// Find mappedRecords transformation
const mapMatch = content.match(/const mappedRecords = records\.map[\s\S]*?\}\);/);
if (mapMatch) {
  console.log('API mapping code:');
  console.log(mapMatch[0]);
}

console.log('\n--- Testing with actual data ---\n');

const db = new Database('/app/data/taskflow.db');
const today = new Date().toISOString().split('T')[0];

const records = db.prepare('SELECT * FROM routine_records WHERE date = ?').all(today);

records.forEach(r => {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
  
  // Simulate exact API transformation
  const mapped = {
    id: r.id,
    user_id: r.user_id,
    department_id: r.department_id,
    date: r.date,
    items: JSON.parse(r.completed_items || '[]')
  };
  
  console.log(`User: ${user?.name}`);
  console.log(`Response: ${JSON.stringify(mapped, null, 2)}`);
  console.log('');
});

db.close();
