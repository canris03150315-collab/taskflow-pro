const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Test /api/routines/history API Response ===\n');

// Get a SUPERVISOR user for testing
const supervisor = db.prepare(`
  SELECT id, name, role, department 
  FROM users 
  WHERE role = 'SUPERVISOR'
  LIMIT 1
`).get();

if (!supervisor) {
  console.log('ERROR: No SUPERVISOR user found');
  process.exit(1);
}

console.log('Test User:', supervisor);
console.log('');

// Simulate the API logic
const userId = supervisor.id;
const userDept = supervisor.department;

const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const startDate = thirtyDaysAgo.toISOString().split('T')[0];

console.log('Query parameters:');
console.log('  userId:', userId);
console.log('  userDept:', userDept);
console.log('  startDate:', startDate);
console.log('');

// Execute the query as SUPERVISOR
let records;
if (supervisor.role === 'SUPERVISOR') {
  records = db.prepare(
    'SELECT * FROM routine_records WHERE department_id = ? AND date >= ? ORDER BY date DESC'
  ).all(userDept, startDate);
} else if (supervisor.role === 'BOSS' || supervisor.role === 'MANAGER') {
  records = db.prepare(
    'SELECT * FROM routine_records WHERE date >= ? ORDER BY date DESC'
  ).all(startDate);
} else {
  records = db.prepare(
    'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'
  ).all(userId, userDept, startDate);
}

console.log('Total records found:', records.length);
console.log('');

if (records.length > 0) {
  // Map records as the API does
  const mappedRecords = records.map(r => ({
    id: r.id,
    user_id: r.user_id,
    department_id: r.department_id,
    date: r.date,
    items: JSON.parse(r.completed_items || '[]')
  }));
  
  console.log('Sample API Response (first 3 records):');
  console.log(JSON.stringify({ records: mappedRecords.slice(0, 3) }, null, 2));
  
  console.log('\n');
  console.log('Record details:');
  mappedRecords.slice(0, 5).forEach((rec, idx) => {
    const completed = rec.items.filter(item => item.completed).length;
    const total = rec.items.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    console.log(`\n${idx + 1}. Date: ${rec.date}, User: ${rec.user_id}`);
    console.log(`   Items: ${total}, Completed: ${completed} (${percent}%)`);
    console.log(`   Items array length: ${rec.items.length}`);
    if (rec.items.length > 0) {
      console.log(`   First item:`, rec.items[0]);
    }
  });
} else {
  console.log('No records found!');
}

db.close();
