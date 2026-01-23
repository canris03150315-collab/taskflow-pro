const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== Diagnose User Permission ===');

// Check 86 department users (x3ye5179b)
console.log('\n86 department users:');
var users = db.prepare("SELECT id, name, role, department, permissions FROM users WHERE department = 'x3ye5179b'").all();
users.forEach(function(u) {
  console.log('Name:', u.name);
  console.log('  Role:', u.role);
  console.log('  Permissions:', u.permissions);
  console.log('');
});

// Check role enum
console.log('\nRole values in system:');
var roles = db.prepare("SELECT DISTINCT role FROM users").all();
roles.forEach(function(r) {
  console.log('  -', r.role);
});

db.close();
console.log('\n=== Done ===');
