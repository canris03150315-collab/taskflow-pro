const Database = require('better-sqlite3');

console.log('Clearing test leave requests...\n');

try {
  const db = new Database('/app/data/taskflow.db');
  
  // Delete all leave requests
  const result = db.prepare('DELETE FROM leave_requests').run();
  
  console.log(`Deleted ${result.changes} leave requests`);
  
  db.close();
  console.log('\nTest leaves cleared successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
