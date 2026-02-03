const Database = require('better-sqlite3');

console.log('=== Test Routines API Response Format ===\n');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

// Simulate what the API should return
console.log('Test: Simulate API response for recent records');

const records = db.prepare(`
  SELECT * FROM routine_records 
  WHERE date >= date('now', '-7 days')
  ORDER BY date DESC
  LIMIT 20
`).all();

console.log('Total records found:', records.length);

if (records.length > 0) {
  console.log('\nFirst record (raw from DB):');
  console.log(JSON.stringify(records[0], null, 2));
  
  // Check if completed_items is a string that needs parsing
  const firstRecord = records[0];
  console.log('\nType of completed_items:', typeof firstRecord.completed_items);
  
  if (typeof firstRecord.completed_items === 'string') {
    try {
      const parsed = JSON.parse(firstRecord.completed_items);
      console.log('Parsed completed_items:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('ERROR parsing completed_items:', e.message);
    }
  }
  
  // Check what the API should map to
  console.log('\nWhat API should return (mapped):');
  const mapped = records.map(record => ({
    id: record.id,
    user_id: record.user_id,
    department_id: record.department_id,
    date: record.date,
    items: typeof record.completed_items === 'string' 
      ? JSON.parse(record.completed_items) 
      : record.completed_items
  }));
  
  console.log('First mapped record:');
  console.log(JSON.stringify(mapped[0], null, 2));
  
  console.log('\nAll dates in records:');
  const dates = [...new Set(records.map(r => r.date))];
  console.log(dates.join(', '));
}

db.close();
console.log('\n=== Test Complete ===');
