const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== Diagnose Leave Issue ===');

// 1. Find user
console.log('\n1. All users:');
var allUsers = db.prepare("SELECT id, name, role FROM users").all();
allUsers.forEach(function(u) {
  console.log('  - ' + u.name + ' (' + u.role + ') ID: ' + u.id.substring(0, 20) + '...');
});

// 2. Table structure
console.log('\n2. leave_requests table structure:');
var tableInfo = db.prepare("PRAGMA table_info(leave_requests)").all();
tableInfo.forEach(function(col) {
  console.log('  - ' + col.name + ': ' + col.type);
});

// 3. Stats
console.log('\n3. Leave stats by status:');
var stats = db.prepare("SELECT status, COUNT(*) as count FROM leave_requests GROUP BY status").all();
stats.forEach(function(s) {
  console.log('  - ' + s.status + ': ' + s.count);
});

// 4. Recent leaves
console.log('\n4. Recent 10 leaves:');
var recentLeaves = db.prepare("SELECT lr.*, u.name as user_name FROM leave_requests lr JOIN users u ON lr.user_id = u.id ORDER BY lr.created_at DESC LIMIT 10").all();
recentLeaves.forEach(function(l) {
  console.log('  - ' + l.user_name + ': ' + l.leave_type + ' (' + l.status + ')');
  console.log('    ' + l.start_date + ' ~ ' + l.end_date);
});

// 5. Check leave quotas
console.log('\n5. leave_quotas table:');
try {
  var quotaInfo = db.prepare("PRAGMA table_info(leave_quotas)").all();
  if (quotaInfo.length > 0) {
    quotaInfo.forEach(function(col) {
      console.log('  - ' + col.name + ': ' + col.type);
    });
    var quotas = db.prepare("SELECT * FROM leave_quotas LIMIT 5").all();
    console.log('  Sample quotas: ' + quotas.length);
  }
} catch(e) {
  console.log('  Table not found');
}

db.close();
console.log('\n=== Done ===');
