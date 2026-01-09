const db = require('./node_modules/better-sqlite3')('/app/data/taskflow.db');

console.log('=== All departments in database ===\n');

const depts = db.prepare('SELECT * FROM departments ORDER BY id').all();

console.log('Total departments:', depts.length);
console.log('\nDepartment list:');
depts.forEach(dept => {
  console.log(`  ID: ${dept.id}`);
  console.log(`  Name: ${dept.name}`);
  console.log(`  Description: ${dept.description || '(none)'}`);
  console.log('  ---');
});

db.close();
