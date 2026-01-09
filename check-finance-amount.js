const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking finance records with amounts ===\n');

try {
  const records = db.prepare('SELECT id, type, amount, category, description, department_id, date, status FROM finance ORDER BY created_at DESC LIMIT 10').all();
  
  console.log('Total records:', records.length);
  console.log('\nRecords:');
  records.forEach(r => {
    console.log(`\nID: ${r.id}`);
    console.log(`Type: ${r.type}`);
    console.log(`Amount: ${r.amount} (type: ${typeof r.amount})`);
    console.log(`Category: ${r.category}`);
    console.log(`Description: ${r.description}`);
    console.log(`Department: ${r.department_id}`);
    console.log(`Date: ${r.date}`);
    console.log(`Status: ${r.status}`);
  });
} catch (error) {
  console.error('Error:', error);
}

db.close();
