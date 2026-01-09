const db = require('./node_modules/better-sqlite3')('/app/data/taskflow.db');

const deptId = 'HR';

console.log('=== Checking department relations for:', deptId, '===\n');

// Check users
const users = db.prepare('SELECT COUNT(*) as count FROM users WHERE department = ?').get(deptId);
console.log('Users:', users.count);
if (users.count > 0) {
  const userList = db.prepare('SELECT id, name FROM users WHERE department = ?').all(deptId);
  console.log('  Users:', userList.map(u => u.name).join(', '));
}

// Check schedules
try {
  const schedules = db.prepare('SELECT COUNT(*) as count FROM schedules WHERE department_id = ?').get(deptId);
  console.log('Schedules:', schedules.count);
} catch (e) {
  console.log('Schedules: table or column not found');
}

// Check routines
try {
  const routines = db.prepare('SELECT COUNT(*) as count FROM routine_templates WHERE department_id = ?').get(deptId);
  console.log('Routine templates:', routines.count);
} catch (e) {
  console.log('Routine templates: table or column not found');
}

try {
  const routineRecords = db.prepare('SELECT COUNT(*) as count FROM routine_records WHERE department_id = ?').get(deptId);
  console.log('Routine records:', routineRecords.count);
} catch (e) {
  console.log('Routine records: table or column not found');
}

// Check leave requests
try {
  const leaves = db.prepare('SELECT COUNT(*) as count FROM leave_requests WHERE department_id = ?').get(deptId);
  console.log('Leave requests:', leaves.count);
} catch (e) {
  console.log('Leave requests: table or column not found');
}

console.log('\n=== Summary ===');
if (users.count === 0) {
  console.log('✓ Department can be safely deleted (no users)');
} else {
  console.log('✗ Department has users - need to reassign or delete users first');
}

db.close();
