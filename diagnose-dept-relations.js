const db = require('./node_modules/better-sqlite3')('/app/data/taskflow.db');

const deptId = 'HR';

console.log('=== Checking department relations ===\n');

// Check users
const users = db.prepare('SELECT COUNT(*) as count FROM users WHERE department = ?').get(deptId);
console.log('Users:', users.count);

// Check tasks
const tasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE department_id = ?').get(deptId);
console.log('Tasks:', tasks.count);

// Check schedules
const schedules = db.prepare('SELECT COUNT(*) as count FROM schedules WHERE department_id = ?').get(deptId);
console.log('Schedules:', schedules.count);

// Check routines
const routines = db.prepare('SELECT COUNT(*) as count FROM routine_templates WHERE department_id = ?').get(deptId);
console.log('Routine templates:', routines.count);

const routineRecords = db.prepare('SELECT COUNT(*) as count FROM routine_records WHERE department_id = ?').get(deptId);
console.log('Routine records:', routineRecords.count);

// Check leave requests
const leaves = db.prepare('SELECT COUNT(*) as count FROM leave_requests WHERE department_id = ?').get(deptId);
console.log('Leave requests:', leaves.count);

db.close();
