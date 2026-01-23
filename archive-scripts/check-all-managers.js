// check-all-managers.js
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== All Management Level Users ===');
const managers = db.prepare(`
  SELECT id, name, role, department 
  FROM users 
  WHERE role IN ('BOSS', 'MANAGER', 'SUPERVISOR')
  ORDER BY 
    CASE role 
      WHEN 'BOSS' THEN 1 
      WHEN 'MANAGER' THEN 2 
      WHEN 'SUPERVISOR' THEN 3 
    END,
    department, name
`).all();

console.log('Total:', managers.length);
console.log('\nBOSS:');
managers.filter(u => u.role === 'BOSS').forEach(u => {
  console.log(`  ${u.name} | ${u.department} | ${u.id}`);
});

console.log('\nMANAGER:');
managers.filter(u => u.role === 'MANAGER').forEach(u => {
  console.log(`  ${u.name} | ${u.department} | ${u.id}`);
});

console.log('\nSUPERVISOR:');
managers.filter(u => u.role === 'SUPERVISOR').forEach(u => {
  console.log(`  ${u.name} | ${u.department} | ${u.id}`);
});

console.log('\n=== Department Distribution ===');
const depts = db.prepare(`
  SELECT department, 
    SUM(CASE WHEN role = 'BOSS' THEN 1 ELSE 0 END) as boss_count,
    SUM(CASE WHEN role = 'MANAGER' THEN 1 ELSE 0 END) as manager_count,
    SUM(CASE WHEN role = 'SUPERVISOR' THEN 1 ELSE 0 END) as supervisor_count
  FROM users 
  WHERE role IN ('BOSS', 'MANAGER', 'SUPERVISOR')
  GROUP BY department
`).all();

depts.forEach(d => {
  console.log(`${d.department}: ${d.boss_count} BOSS, ${d.manager_count} MANAGER, ${d.supervisor_count} SUPERVISOR`);
});

db.close();
