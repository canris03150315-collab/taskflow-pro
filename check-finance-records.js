const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking finance records ===\n');

try {
  const records = db.prepare('SELECT * FROM finance ORDER BY created_at DESC LIMIT 5').all();
  console.log('Total records:', records.length);
  console.log('\nRecords:');
  records.forEach(r => {
    console.log(JSON.stringify(r, null, 2));
  });
} catch (error) {
  console.error('Error:', error);
}

db.close();
