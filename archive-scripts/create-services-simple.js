const fs = require('fs');
const path = require('path');

console.log('Creating service layer...\n');

const servicesDir = '/app/services';
if (!fs.existsSync(servicesDir)) {
  fs.mkdirSync(servicesDir, { recursive: true });
}

// UserService
fs.writeFileSync(path.join(servicesDir, 'userService.js'), `const dbCall = require('../src/database').dbCall;

class UserService {
  constructor(db) { this.db = db; }
  getAllUsers() { return dbCall(this.db, 'prepare', 'SELECT * FROM users').all(); }
  getUserById(id) { return dbCall(this.db, 'prepare', 'SELECT * FROM users WHERE id = ?').get(id); }
}

module.exports = UserService;
`);

// AttendanceService
fs.writeFileSync(path.join(servicesDir, 'attendanceService.js'), `const dbCall = require('../src/database').dbCall;

class AttendanceService {
  constructor(db) { this.db = db; }
  getAllAttendance() { return dbCall(this.db, 'prepare', 'SELECT * FROM attendance_records ORDER BY date DESC').all(); }
}

module.exports = AttendanceService;
`);

// WorkLogService
fs.writeFileSync(path.join(servicesDir, 'workLogService.js'), `const dbCall = require('../src/database').dbCall;

class WorkLogService {
  constructor(db) { this.db = db; }
  getAllWorkLogs() { return dbCall(this.db, 'prepare', 'SELECT * FROM work_logs ORDER BY date DESC').all(); }
}

module.exports = WorkLogService;
`);

// Index
fs.writeFileSync(path.join(servicesDir, 'index.js'), `const Database = require('better-sqlite3');
const UserService = require('./userService');
const AttendanceService = require('./attendanceService');
const WorkLogService = require('./workLogService');

const db = new Database('/app/data/taskflow.db');

module.exports = {
  userService: new UserService(db),
  attendanceService: new AttendanceService(db),
  workLogService: new WorkLogService(db),
  db
};
`);

console.log('Services created. Testing...\n');

try {
  const services = require('/app/services');
  
  const users = services.userService.getAllUsers();
  console.log('UserService: ' + users.length + ' users');
  
  const attendance = services.attendanceService.getAllAttendance();
  console.log('AttendanceService: ' + attendance.length + ' records');
  
  const workLogs = services.workLogService.getAllWorkLogs();
  console.log('WorkLogService: ' + workLogs.length + ' logs');
  
  services.db.close();
  console.log('\nAll tests passed!');
  process.exit(0);
} catch (error) {
  console.error('Test failed:', error.message);
  fs.rmSync(servicesDir, { recursive: true, force: true });
  process.exit(1);
}
