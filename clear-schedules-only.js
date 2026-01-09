const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Starting to clear schedule test data...');

try {
  // Check if leaves table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('schedules', 'leaves', 'leave_requests')").all();
  console.log('Found tables:', tables.map(t => t.name).join(', '));
  
  // Clear schedule data
  const schedulesResult = db.prepare('DELETE FROM schedules').run();
  console.log('SUCCESS: Cleared ' + schedulesResult.changes + ' schedule records');
  
  // Try to clear leave_requests if it exists
  const leaveTable = tables.find(t => t.name === 'leave_requests' || t.name === 'leaves');
  if (leaveTable) {
    const leavesResult = db.prepare('DELETE FROM ' + leaveTable.name).run();
    console.log('SUCCESS: Cleared ' + leavesResult.changes + ' leave records from ' + leaveTable.name);
  } else {
    console.log('INFO: No leave table found, skipping');
  }
  
  // Verify results
  const schedulesCount = db.prepare('SELECT COUNT(*) as count FROM schedules').get();
  console.log('\nVerification:');
  console.log('- Schedules remaining: ' + schedulesCount.count);
  
  if (leaveTable) {
    const leavesCount = db.prepare('SELECT COUNT(*) as count FROM ' + leaveTable.name).get();
    console.log('- Leaves remaining: ' + leavesCount.count);
  }
  
  console.log('\nSUCCESS: Test data cleared!');
  
} catch (error) {
  console.error('ERROR: Failed to clear data:', error.message);
  process.exit(1);
}

db.close();
console.log('Database connection closed');
