const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Verify Routine History API Fix ===\n');

// Test different user roles
const testUsers = [
  { id: 'admin-1766955365557', role: 'BOSS', name: 'Seven' },
  { id: 'user-1767024824151-vbceaduza', role: 'SUPERVISOR', name: 'Test Supervisor' }
];

const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const startDate = thirtyDaysAgo.toISOString().split('T')[0];

testUsers.forEach(user => {
  console.log(`\n=== Testing as ${user.role}: ${user.name} ===`);
  
  const userInfo = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  if (!userInfo) {
    console.log(`  User not found: ${user.id}`);
    return;
  }
  
  console.log(`  User ID: ${userInfo.id}`);
  console.log(`  Department: ${userInfo.department}`);
  console.log(`  Role: ${userInfo.role}`);
  
  let records;
  if (userInfo.role === 'SUPERVISOR') {
    console.log(`  Query: All records from department ${userInfo.department}`);
    records = db.prepare(
      'SELECT * FROM routine_records WHERE department_id = ? AND date >= ? ORDER BY date DESC'
    ).all(userInfo.department, startDate);
  } else if (userInfo.role === 'BOSS' || userInfo.role === 'MANAGER') {
    console.log('  Query: All records (no filter)');
    records = db.prepare(
      'SELECT * FROM routine_records WHERE date >= ? ORDER BY date DESC'
    ).all(startDate);
  } else {
    console.log('  Query: Only own records');
    records = db.prepare(
      'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'
    ).all(userInfo.id, userInfo.department, startDate);
  }
  
  console.log(`  Total records returned: ${records.length}`);
  
  // Group by date
  const dateGroups = {};
  records.forEach(r => {
    if (!dateGroups[r.date]) {
      dateGroups[r.date] = [];
    }
    dateGroups[r.date].push(r.user_id);
  });
  
  console.log('  Records by date:');
  Object.keys(dateGroups).sort().reverse().forEach(date => {
    console.log(`    ${date}: ${dateGroups[date].length} users`);
  });
});

console.log('\n=== Verification Complete ===');
db.close();
