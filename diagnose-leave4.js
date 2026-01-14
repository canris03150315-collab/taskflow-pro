const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== Deep Diagnose Leave Issue ===');

// 1. Find Xiang user
var xiangUser = db.prepare("SELECT * FROM users WHERE name = ?").get('\u7fd4\u54e5');
console.log('\n1. Xiang user data:');
console.log(JSON.stringify(xiangUser, null, 2));

// 2. Check leave quotas for Xiang
if (xiangUser) {
  console.log('\n2. Leave quotas for Xiang:');
  var quotas = db.prepare("SELECT * FROM leave_quotas WHERE user_id = ?").all(xiangUser.id);
  console.log('  Found: ' + quotas.length + ' records');
  quotas.forEach(function(q) {
    console.log('  - ' + q.leave_type + ': ' + q.remaining_days + '/' + q.total_days + ' days');
  });
}

// 3. Check all leave quotas
console.log('\n3. All leave quotas in system:');
var allQuotas = db.prepare("SELECT lq.*, u.name FROM leave_quotas lq JOIN users u ON lq.user_id = u.id").all();
console.log('  Total: ' + allQuotas.length);
allQuotas.forEach(function(q) {
  console.log('  - ' + q.name + ': ' + q.leave_type + ' = ' + q.remaining_days + '/' + q.total_days);
});

// 4. Check leave_types table
console.log('\n4. leave_types table:');
try {
  var leaveTypes = db.prepare("SELECT * FROM leave_types").all();
  console.log('  Found: ' + leaveTypes.length);
  leaveTypes.forEach(function(lt) {
    console.log('  - ' + lt.name + ' (' + lt.code + '): ' + lt.default_days + ' days');
  });
} catch(e) {
  console.log('  Table not found: ' + e.message);
}

// 5. Check attendance_records for Xiang
if (xiangUser) {
  console.log('\n5. Attendance records for Xiang (recent 5):');
  var attendance = db.prepare("SELECT * FROM attendance_records WHERE user_id = ? ORDER BY date DESC LIMIT 5").all(xiangUser.id);
  console.log('  Found: ' + attendance.length);
  attendance.forEach(function(a) {
    console.log('  - ' + a.date + ': ' + a.status);
  });
}

db.close();
console.log('\n=== Done ===');
