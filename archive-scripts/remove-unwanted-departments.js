const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Checking current departments...');

try {
  // List all departments
  const allDepts = db.prepare('SELECT id, name FROM departments ORDER BY name').all();
  console.log('\nCurrent departments:');
  allDepts.forEach(dept => {
    console.log('- ' + dept.id + ': ' + dept.name);
  });
  
  // Departments to remove
  const depsToRemove = ['HR', 'Marketing', 'Engineering'];
  
  console.log('\nRemoving unwanted departments...');
  
  let totalRemoved = 0;
  depsToRemove.forEach(deptId => {
    const result = db.prepare('DELETE FROM departments WHERE id = ?').run(deptId);
    if (result.changes > 0) {
      console.log('SUCCESS: Removed department: ' + deptId);
      totalRemoved += result.changes;
    } else {
      console.log('INFO: Department not found: ' + deptId);
    }
  });
  
  console.log('\nTotal departments removed: ' + totalRemoved);
  
  // Verify results
  const remainingDepts = db.prepare('SELECT id, name FROM departments ORDER BY name').all();
  console.log('\nRemaining departments:');
  remainingDepts.forEach(dept => {
    console.log('- ' + dept.id + ': ' + dept.name);
  });
  
  console.log('\nSUCCESS: Department cleanup completed!');
  
} catch (error) {
  console.error('ERROR: Failed to remove departments:', error.message);
  process.exit(1);
}

db.close();
console.log('Database connection closed');
