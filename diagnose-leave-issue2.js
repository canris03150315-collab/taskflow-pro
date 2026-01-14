const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== Diagnose Leave Issue ===');

// 1. Find user
console.log('\n1. Find user with name containing xiang:');
const users = db.prepare("SELECT id, name, role, department_id FROM users WHERE name LIKE '%翔%' OR name LIKE '%xiang%'").all();
console.log('Found users:', users.length);
users.forEach(function(u) {
  console.log('  - ' + u.name + ' (' + u.role + ') ID: ' + u.id);
});

if (users.length === 0) {
  console.log('\nAll users:');
  var allUsers = db.prepare("SELECT id, name, role FROM users").all();
  allUsers.forEach(function(u) {
    console.log('  - ' + u.name + ' (' + u.role + ')');
  });
}

// 2. Table structure
console.log('\n2. leave_requests table structure:');
var tableInfo = db.prepare("PRAGMA table_info(leave_requests)").all();
tableInfo.forEach(function(col) {
  console.log('  - ' + col.name + ': ' + col.type);
});

// 3. User leave data
if (users.length > 0) {
  var userId = users[0].id;
  console.log('\n3. Leave data for user: ' + userId);
  var leaves = db.prepare("SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 10").all(userId);
  console.log('  Total records: ' + leaves.length);
  leaves.forEach(function(l) {
    console.log('  - Type: ' + l.leave_type + ', Status: ' + l.status);
    console.log('    Start: ' + l.start_date + ', End: ' + l.end_date);
  });
}

// 4. Stats
console.log('\n4. Leave stats:');
var stats = db.prepare("SELECT status, COUNT(*) as count FROM leave_requests GROUP BY status").all();
stats.forEach(function(s) {
  console.log('  - ' + s.status + ': ' + s.count);
});

// 5. Recent leaves
console.log('\n5. Recent 5 leaves:');
var recentLeaves = db.prepare("SELECT lr.*, u.name as user_name FROM leave_requests lr JOIN users u ON lr.user_id = u.id ORDER BY lr.created_at DESC LIMIT 5").all();
recentLeaves.forEach(function(l) {
  console.log('  - ' + l.user_name + ': ' + l.leave_type + ' (' + l.status + ')');
  console.log('    ' + l.start_date + ' ~ ' + l.end_date);
});

db.close();
console.log('\n=== Done ===');
