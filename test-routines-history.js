const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Testing routines history query...');

// Get a user to test with
const user = db.prepare('SELECT id, department FROM users WHERE role = "BOSS" LIMIT 1').get();
console.log('Test user:', user);

if (user) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split('T')[0];
  
  console.log('Start date:', startDate);
  
  const records = db.prepare(
    'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'
  ).all(user.id, user.department, startDate);
  
  console.log('Found records:', records.length);
  console.log('Records:', JSON.stringify(records, null, 2));
}

db.close();
console.log('Test complete');
