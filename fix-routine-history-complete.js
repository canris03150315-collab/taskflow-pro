const fs = require('fs');
const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('=== Fix /history route ===\n');

// 1. Fix field mapping: r.items -> r.completed_items
const oldFieldMapping = `items: JSON.parse(r.items || '[]')`;
const newFieldMapping = `items: JSON.parse(r.completed_items || '[]')`;

if (content.includes(oldFieldMapping)) {
  content = content.replace(oldFieldMapping, newFieldMapping);
  console.log('OK: Fixed field mapping r.items -> r.completed_items');
} else {
  console.log('WARN: Field mapping already fixed or needs manual check');
}

// 2. Fix query scope based on user role
const oldQuery = `const records = dbCall(db, 'prepare',
      'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'
    ).all(userId, userDept, startDate);`;

const newQuery = `// Query different scope based on role
    let records;
    if (req.user.role === 'SUPERVISOR') {
      // SUPERVISOR: Return all department records
      records = dbCall(db, 'prepare',
        'SELECT * FROM routine_records WHERE department_id = ? AND date >= ? ORDER BY date DESC'
      ).all(userDept, startDate);
    } else if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {
      // BOSS/MANAGER: Return all records
      records = dbCall(db, 'prepare',
        'SELECT * FROM routine_records WHERE date >= ? ORDER BY date DESC'
      ).all(startDate);
    } else {
      // EMPLOYEE: Return only own records
      records = dbCall(db, 'prepare',
        'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'
      ).all(userId, userDept, startDate);
    }`;

if (content.includes(`WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC`)) {
  content = content.replace(oldQuery, newQuery);
  console.log('OK: Fixed query scope based on role');
} else {
  console.log('WARN: Query scope already fixed or needs manual check');
}

// Write back to file
fs.writeFileSync(filePath, content, 'utf8');
console.log('\nFix completed!');
console.log('\nFixed issues:');
console.log('1. Field mapping: r.items -> r.completed_items');
console.log('2. Query scope: SUPERVISOR sees dept, BOSS/MANAGER sees all, EMPLOYEE sees own');
