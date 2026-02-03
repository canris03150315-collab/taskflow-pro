const Database = require('better-sqlite3');

console.log('=== Test API Response with Real User ===\n');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

// Get a real user (SUPERVISOR or BOSS)
const users = db.prepare('SELECT * FROM users WHERE role IN (?, ?) LIMIT 1').all('SUPERVISOR', 'BOSS');

if (users.length === 0) {
  console.log('ERROR: No SUPERVISOR or BOSS user found!');
  process.exit(1);
}

const testUser = users[0];
console.log('Test user:', {
  id: testUser.id,
  name: testUser.name,
  role: testUser.role,
  department: testUser.department
});

// Simulate API call
console.log('\nSimulating API call to /api/routines/history');

const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const startDate = thirtyDaysAgo.toISOString().split('T')[0];

let records;
if (testUser.role === 'SUPERVISOR') {
  records = db.prepare(
    'SELECT * FROM routine_records WHERE department_id = ? AND date >= ? ORDER BY date DESC'
  ).all(testUser.department, startDate);
} else if (testUser.role === 'BOSS' || testUser.role === 'MANAGER') {
  records = db.prepare(
    'SELECT * FROM routine_records WHERE date >= ? ORDER BY date DESC'
  ).all(startDate);
}

console.log('Total records found:', records.length);

if (records.length > 0) {
  // Map records like the API does
  const mappedRecords = records.map(r => ({
    id: r.id,
    user_id: r.user_id,
    department_id: r.department_id,
    date: r.date,
    items: JSON.parse(r.completed_items || '[]')
  }));
  
  console.log('\nAPI would return:');
  console.log(JSON.stringify({ records: mappedRecords.slice(0, 3) }, null, 2));
  
  // Check dates
  const dates = [...new Set(records.map(r => r.date))].sort().reverse();
  console.log('\nAvailable dates:', dates.join(', '));
  
  // Check today
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = mappedRecords.filter(r => r.date === today);
  console.log('\nToday (' + today + ') records:', todayRecords.length);
  
  // Check recent dates
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().split('T')[0];
  const yesterdayRecords = mappedRecords.filter(r => r.date === yesterdayDate);
  console.log('Yesterday (' + yesterdayDate + ') records:', yesterdayRecords.length);
  
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAgoDate = threeDaysAgo.toISOString().split('T')[0];
  const threeDaysAgoRecords = mappedRecords.filter(r => r.date === threeDaysAgoDate);
  console.log('3 days ago (' + threeDaysAgoDate + ') records:', threeDaysAgoRecords.length);
  
} else {
  console.log('ERROR: No records found for this user!');
}

db.close();
console.log('\n=== Test Complete ===');
