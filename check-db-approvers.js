// check-db-approvers.js
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== All BOSS/MANAGER Users ===');
const managers = db.prepare(`
  SELECT id, name, role, department 
  FROM users 
  WHERE role IN ('BOSS', 'MANAGER')
  ORDER BY role DESC, department, name
`).all();

console.log('Total:', managers.length);
managers.forEach(u => {
  console.log(`${u.name} | ${u.role} | ${u.department} | ${u.id}`);
});

console.log('\n=== Department Distribution ===');
const depts = db.prepare(`
  SELECT department, COUNT(*) as count
  FROM users 
  WHERE role IN ('BOSS', 'MANAGER')
  GROUP BY department
`).all();

depts.forEach(d => {
  console.log(`${d.department}: ${d.count} managers`);
});

db.close();
