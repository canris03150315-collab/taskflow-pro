// update-manager-departments.js
// Update manager departments to enable dual approval
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Before Update ===');
const before = db.prepare('SELECT id, name, role, department FROM users WHERE role IN ("BOSS", "MANAGER")').all();
before.forEach(u => console.log(`${u.name} | ${u.role} | ${u.department}`));

// Update departments
// Keep Seven in Management
// Move others to different departments
db.prepare('UPDATE users SET department = ? WHERE id = ?').run('Sales', 'user-1767450732967-40qk55qu1'); // 洲 -> Sales
db.prepare('UPDATE users SET department = ? WHERE id = ?').run('Finance', 'user-1767453373714-w7h80o4cm'); // 大俠 -> Finance

console.log('\n=== After Update ===');
const after = db.prepare('SELECT id, name, role, department FROM users WHERE role IN ("BOSS", "MANAGER")').all();
after.forEach(u => console.log(`${u.name} | ${u.role} | ${u.department}`));

console.log('\n=== Testing Eligible Approvers ===');
after.forEach(currentUser => {
  const eligible = db.prepare(`
    SELECT name, role, department 
    FROM users 
    WHERE (role = 'BOSS' OR role = 'MANAGER')
      AND id != ?
      AND department != ?
  `).all(currentUser.id, currentUser.department);
  
  console.log(`\nFor ${currentUser.name} (${currentUser.department}):`);
  console.log(`  Eligible approvers: ${eligible.length}`);
  eligible.forEach(e => console.log(`  - ${e.name} (${e.role}) - ${e.department}`));
});

db.close();
console.log('\n✅ Update Complete!');
