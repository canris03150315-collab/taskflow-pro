const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Verify Routine History API Fix ===\n');

// Simulate different user roles
const testUsers = [
  { id: 'admin-1766955365557', name: 'Seven (BOSS)', role: 'BOSS', department: 'cbsv402gc' },
  { id: 'user-1767024824151-vbceaduza', name: 'Supervisor', role: 'SUPERVISOR', department: 'x3ye5179b' },
  { id: 'user-1767674448027-ukzx1qqj3', name: 'Employee', role: 'EMPLOYEE', department: 'x3ye5179b' }
];

const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const startDate = thirtyDaysAgo.toISOString().split('T')[0];

console.log(`Query date range: ${startDate} to today\n`);

testUsers.forEach(user => {
  console.log(`--- ${user.name} (${user.role}) ---`);
  
  let records;
  if (user.role === 'SUPERVISOR') {
    records = db.prepare(
      'SELECT * FROM routine_records WHERE department_id = ? AND date >= ? ORDER BY date DESC'
    ).all(user.department, startDate);
  } else if (user.role === 'BOSS' || user.role === 'MANAGER') {
    records = db.prepare(
      'SELECT * FROM routine_records WHERE date >= ? ORDER BY date DESC'
    ).all(startDate);
  } else {
    records = db.prepare(
      'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'
    ).all(user.id, user.department, startDate);
  }
  
  console.log(`Total records returned: ${records.length}`);
  
  if (records.length > 0) {
    // Count completed records
    const completedRecords = records.filter(r => {
      const items = JSON.parse(r.completed_items || '[]');
      const completed = items.filter(item => item.completed).length;
      const total = items.length;
      return total > 0 && completed === total;
    });
    
    console.log(`Completed 100% records: ${completedRecords.length}`);
    
    // Show recent dates
    const recentDates = [...new Set(records.slice(0, 5).map(r => r.date))];
    console.log(`Recent dates: ${recentDates.join(', ')}`);
  }
  
  console.log('');
});

console.log('Verification complete!');
console.log('\nExpected behavior:');
console.log('- BOSS: Should see all records from all departments');
console.log('- SUPERVISOR: Should see all records from own department');
console.log('- EMPLOYEE: Should see only own records');

db.close();
