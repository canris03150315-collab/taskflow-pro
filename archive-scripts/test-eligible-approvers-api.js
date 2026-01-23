// test-eligible-approvers-api.js
// Test the eligible approvers API endpoint
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Testing Eligible Approvers API Logic ===\n');

// Simulate Seven (BOSS, Management) as current user
const currentUser = {
  id: 'admin-1767449914767',
  name: 'Seven',
  role: 'BOSS',
  department: 'Management'
};

console.log('Current User:', currentUser.name, '|', currentUser.role, '|', currentUser.department);
console.log('\nExecuting SQL query...\n');

const query = `
  SELECT id, name, role, department 
  FROM users 
  WHERE (role = 'BOSS' OR role = 'MANAGER' OR role = 'SUPERVISOR')
    AND id != ?
    AND department != ?
  ORDER BY 
    CASE role 
      WHEN 'BOSS' THEN 1 
      WHEN 'MANAGER' THEN 2 
      WHEN 'SUPERVISOR' THEN 3 
    END,
    name ASC
`;

console.log('SQL Query:');
console.log(query);
console.log('\nParameters:', [currentUser.id, currentUser.department]);

const approvers = db.prepare(query).all(currentUser.id, currentUser.department);

console.log('\n=== Results ===');
console.log('Total eligible approvers:', approvers.length);
console.log('\nList:');
approvers.forEach((a, index) => {
  console.log(`${index + 1}. ${a.name} | ${a.role} | ${a.department} | ${a.id}`);
});

if (approvers.length === 0) {
  console.log('\n⚠️ WARNING: No eligible approvers found!');
  console.log('\nPossible reasons:');
  console.log('1. All other BOSS/MANAGER/SUPERVISOR are in the same department');
  console.log('2. No other BOSS/MANAGER/SUPERVISOR exists');
  
  console.log('\n=== All BOSS/MANAGER/SUPERVISOR in database ===');
  const all = db.prepare(`
    SELECT id, name, role, department 
    FROM users 
    WHERE role IN ('BOSS', 'MANAGER', 'SUPERVISOR')
    ORDER BY role, department, name
  `).all();
  
  all.forEach(u => {
    console.log(`- ${u.name} | ${u.role} | ${u.department}`);
  });
}

db.close();
console.log('\n=== Test Complete ===');
