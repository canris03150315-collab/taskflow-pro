// check-approvers.js
// Check eligible approvers in database
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'taskflow.db');
const db = new Database(dbPath);

console.log('=== Checking Eligible Approvers ===\n');

// Get all BOSS and MANAGER users
const allManagers = db.prepare(`
  SELECT id, name, role, department 
  FROM users 
  WHERE role IN ('BOSS', 'MANAGER')
  ORDER BY role DESC, department, name
`).all();

console.log('All BOSS/MANAGER users:');
console.log('Total:', allManagers.length);
allManagers.forEach(user => {
  console.log(`- ${user.name} (${user.role}) - ${user.department} [ID: ${user.id}]`);
});

console.log('\n=== Testing Eligible Approvers Logic ===\n');

// Test for each BOSS/MANAGER user
allManagers.forEach(currentUser => {
  console.log(`\nFor user: ${currentUser.name} (${currentUser.role}) - ${currentUser.department}`);
  
  const eligible = db.prepare(`
    SELECT id, name, role, department 
    FROM users 
    WHERE (role = 'BOSS' OR role = 'MANAGER')
      AND id != ?
      AND department != ?
    ORDER BY role DESC, name ASC
  `).all(currentUser.id, currentUser.department);
  
  console.log(`  Eligible approvers: ${eligible.length}`);
  eligible.forEach(approver => {
    console.log(`  - ${approver.name} (${approver.role}) - ${approver.department}`);
  });
  
  if (eligible.length === 0) {
    console.log('  ⚠️ WARNING: No eligible approvers found!');
    console.log('  Reasons:');
    console.log('    - All other BOSS/MANAGER are in the same department');
    console.log('    - OR no other BOSS/MANAGER exists');
  }
});

db.close();
console.log('\n=== Check Complete ===');
