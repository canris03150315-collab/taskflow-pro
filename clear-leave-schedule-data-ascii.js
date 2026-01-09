const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Starting to clear leave and schedule test data...');

try {
  // Clear schedule data
  const schedulesResult = db.prepare('DELETE FROM schedules').run();
  console.log('SUCCESS: Cleared ' + schedulesResult.changes + ' schedule records');
  
  // Clear leave data
  const leavesResult = db.prepare('DELETE FROM leaves').run();
  console.log('SUCCESS: Cleared ' + leavesResult.changes + ' leave records');
  
  // Verify results
  const schedulesCount = db.prepare('SELECT COUNT(*) as count FROM schedules').get();
  const leavesCount = db.prepare('SELECT COUNT(*) as count FROM leaves').get();
  
  console.log('\nVerification:');
  console.log('- Schedules remaining: ' + schedulesCount.count);
  console.log('- Leaves remaining: ' + leavesCount.count);
  
  if (schedulesCount.count === 0 && leavesCount.count === 0) {
    console.log('\nSUCCESS: Test data cleared completely!');
  } else {
    console.log('\nWARNING: Some data still remains');
  }
  
} catch (error) {
  console.error('ERROR: Failed to clear data:', error.message);
  process.exit(1);
}

db.close();
console.log('\nDatabase connection closed');
