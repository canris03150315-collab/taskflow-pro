const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'taskflow.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

console.log('Start cleaning leave test data...\n');

try {
  const deleteLeaves = db.prepare('DELETE FROM leave_requests');
  const leavesResult = deleteLeaves.run();
  console.log('Deleted leave requests:', leavesResult.changes);

  const deleteSchedules = db.prepare('DELETE FROM schedules');
  const schedulesResult = deleteSchedules.run();
  console.log('Deleted schedules:', schedulesResult.changes);

  const countLeaves = db.prepare('SELECT COUNT(*) as count FROM leave_requests').get();
  console.log('Remaining leave requests:', countLeaves.count);

  const countSchedules = db.prepare('SELECT COUNT(*) as count FROM schedules').get();
  console.log('Remaining schedules:', countSchedules.count);

  console.log('\nCleanup completed successfully!');
} catch (error) {
  console.error('Cleanup failed:', error.message);
} finally {
  db.close();
}
