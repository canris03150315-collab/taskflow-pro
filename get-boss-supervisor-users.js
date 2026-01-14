const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Get BOSS and SUPERVISOR Users ===\n');

const users = db.prepare(`
  SELECT id, name, role, department 
  FROM users 
  WHERE role IN ('BOSS', 'SUPERVISOR')
  ORDER BY role, name
`).all();

console.log(`Found ${users.length} users:\n`);
users.forEach(u => {
  console.log(`  ${u.role}: ${u.name} (${u.id})`);
  console.log(`    Department: ${u.department}`);
});

db.close();
