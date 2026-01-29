const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('=== 自動化服務層實施腳本 ===\n');

// 步驟 1：創建服務層目錄
console.log('步驟 1：創建服務層目錄...');
const servicesDir = '/app/services';
if (!fs.existsSync(servicesDir)) {
  fs.mkdirSync(servicesDir, { recursive: true });
  console.log('✅ 服務層目錄已創建');
} else {
  console.log('✅ 服務層目錄已存在');
}

// 步驟 2：創建 UserService
console.log('\n步驟 2：創建 UserService...');
const userServiceCode = `
const dbCall = require('../src/database').dbCall;

class UserService {
  constructor(db) {
    this.db = db;
  }

  getAllUsers() {
    return dbCall(this.db, 'prepare', 'SELECT * FROM users').all();
  }

  getUserById(id) {
    return dbCall(this.db, 'prepare', 'SELECT * FROM users WHERE id = ?').get(id);
  }

  getUserByUsername(username) {
    return dbCall(this.db, 'prepare', 'SELECT * FROM users WHERE username = ?').get(username);
  }

  createUser(userData) {
    const { id, username, password, name, department_id, role } = userData;
    dbCall(this.db, 'prepare', \`
      INSERT INTO users (id, username, password, name, department_id, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    \`).run(id, username, password, name, department_id, role);
    return this.getUserById(id);
  }

  updateUser(id, userData) {
    const { name, department_id, role } = userData;
    dbCall(this.db, 'prepare', \`
      UPDATE users 
      SET name = ?, department_id = ?, role = ?
      WHERE id = ?
    \`).run(name, department_id, role, id);
    return this.getUserById(id);
  }

  deleteUser(id) {
    dbCall(this.db, 'prepare', 'DELETE FROM users WHERE id = ?').run(id);
  }
}

module.exports = UserService;
`;

fs.writeFileSync(path.join(servicesDir, 'userService.js'), userServiceCode);
console.log('✅ UserService 已創建');

// 步驟 3：創建 AttendanceService
console.log('\n步驟 3：創建 AttendanceService...');
const attendanceServiceCode = `
const dbCall = require('../src/database').dbCall;

class AttendanceService {
  constructor(db) {
    this.db = db;
  }

  getAllAttendance() {
    return dbCall(this.db, 'prepare', 'SELECT * FROM attendance_records ORDER BY date DESC, clock_in DESC').all();
  }

  getAttendanceByUserId(userId) {
    return dbCall(this.db, 'prepare', 'SELECT * FROM attendance_records WHERE user_id = ? ORDER BY date DESC').all(userId);
  }

  getAttendanceByDate(date) {
    return dbCall(this.db, 'prepare', 'SELECT * FROM attendance_records WHERE date = ?').all(date);
  }

  createAttendance(data) {
    const { id, user_id, date, clock_in, clock_out, status } = data;
    dbCall(this.db, 'prepare', \`
      INSERT INTO attendance_records (id, user_id, date, clock_in, clock_out, status)
      VALUES (?, ?, ?, ?, ?, ?)
    \`).run(id, user_id, date, clock_in, clock_out, status);
    return dbCall(this.db, 'prepare', 'SELECT * FROM attendance_records WHERE id = ?').get(id);
  }

  updateAttendance(id, data) {
    const { clock_in, clock_out, status } = data;
    dbCall(this.db, 'prepare', \`
      UPDATE attendance_records 
      SET clock_in = ?, clock_out = ?, status = ?
      WHERE id = ?
    \`).run(clock_in, clock_out, status, id);
    return dbCall(this.db, 'prepare', 'SELECT * FROM attendance_records WHERE id = ?').get(id);
  }

  deleteAttendance(id) {
    dbCall(this.db, 'prepare', 'DELETE FROM attendance_records WHERE id = ?').run(id);
  }
}

module.exports = AttendanceService;
`;

fs.writeFileSync(path.join(servicesDir, 'attendanceService.js'), attendanceServiceCode);
console.log('✅ AttendanceService 已創建');

// 步驟 4：創建 WorkLogService
console.log('\n步驟 4：創建 WorkLogService...');
const workLogServiceCode = `
const dbCall = require('../src/database').dbCall;

class WorkLogService {
  constructor(db) {
    this.db = db;
  }

  getAllWorkLogs() {
    return dbCall(this.db, 'prepare', 'SELECT * FROM work_logs ORDER BY date DESC, created_at DESC').all();
  }

  getWorkLogsByUserId(userId) {
    return dbCall(this.db, 'prepare', 'SELECT * FROM work_logs WHERE user_id = ? ORDER BY date DESC').all(userId);
  }

  getWorkLogsByDate(date) {
    return dbCall(this.db, 'prepare', 'SELECT * FROM work_logs WHERE date = ?').all(date);
  }

  createWorkLog(data) {
    const { id, user_id, department_id, date, today_tasks, tomorrow_tasks, notes } = data;
    const now = new Date().toISOString();
    dbCall(this.db, 'prepare', \`
      INSERT INTO work_logs (id, user_id, department_id, date, today_tasks, tomorrow_tasks, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(id, user_id, department_id, date, today_tasks, tomorrow_tasks, notes, now, now);
    return dbCall(this.db, 'prepare', 'SELECT * FROM work_logs WHERE id = ?').get(id);
  }

  updateWorkLog(id, data) {
    const { today_tasks, tomorrow_tasks, notes } = data;
    const now = new Date().toISOString();
    dbCall(this.db, 'prepare', \`
      UPDATE work_logs 
      SET today_tasks = ?, tomorrow_tasks = ?, notes = ?, updated_at = ?
      WHERE id = ?
    \`).run(today_tasks, tomorrow_tasks, notes, now, id);
    return dbCall(this.db, 'prepare', 'SELECT * FROM work_logs WHERE id = ?').get(id);
  }

  deleteWorkLog(id) {
    dbCall(this.db, 'prepare', 'DELETE FROM work_logs WHERE id = ?').run(id);
  }
}

module.exports = WorkLogService;
`;

fs.writeFileSync(path.join(servicesDir, 'workLogService.js'), workLogServiceCode);
console.log('✅ WorkLogService 已創建');

// 步驟 5：創建服務層索引文件
console.log('\n步驟 5：創建服務層索引文件...');
const indexCode = `
const Database = require('better-sqlite3');
const UserService = require('./userService');
const AttendanceService = require('./attendanceService');
const WorkLogService = require('./workLogService');

// 創建資料庫連接
const db = new Database('/app/data/taskflow.db');

// 導出所有服務實例
module.exports = {
  userService: new UserService(db),
  attendanceService: new AttendanceService(db),
  workLogService: new WorkLogService(db),
  db
};
`;

fs.writeFileSync(path.join(servicesDir, 'index.js'), indexCode);
console.log('✅ 服務層索引文件已創建');

// 步驟 6：測試服務層
console.log('\n步驟 6：測試服務層...');
try {
  const services = require('/app/services');
  
  // 測試 UserService
  console.log('  測試 UserService...');
  const users = services.userService.getAllUsers();
  if (!Array.isArray(users)) throw new Error('UserService.getAllUsers() 返回格式錯誤');
  console.log(`  ✅ UserService 正常 (${users.length} 個用戶)`);
  
  // 測試 AttendanceService
  console.log('  測試 AttendanceService...');
  const attendance = services.attendanceService.getAllAttendance();
  if (!Array.isArray(attendance)) throw new Error('AttendanceService.getAllAttendance() 返回格式錯誤');
  console.log(`  ✅ AttendanceService 正常 (${attendance.length} 筆記錄)`);
  
  // 測試 WorkLogService
  console.log('  測試 WorkLogService...');
  const workLogs = services.workLogService.getAllWorkLogs();
  if (!Array.isArray(workLogs)) throw new Error('WorkLogService.getAllWorkLogs() 返回格式錯誤');
  console.log(`  ✅ WorkLogService 正常 (${workLogs.length} 筆記錄)`);
  
  console.log('\n✅ 所有服務層測試通過！');
  
  // 關閉資料庫連接
  services.db.close();
  
  console.log('\n=== 服務層創建成功 ===');
  console.log('下一步：重構 API 路由以使用服務層');
  
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ 服務層測試失敗:', error.message);
  console.error('正在清理...');
  
  // 清理創建的文件
  try {
    fs.rmSync(servicesDir, { recursive: true, force: true });
    console.log('✅ 已清理服務層文件');
  } catch (cleanupError) {
    console.error('清理失敗:', cleanupError.message);
  }
  
  process.exit(1);
}
