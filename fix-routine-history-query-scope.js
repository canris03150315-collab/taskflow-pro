const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing routine history query scope...');

// Find the current query that only returns current user's records
const oldQuery = `const records = dbCall(db, 'prepare',
      'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'
    ).all(userId, userDept, startDate);`;

// New query based on user role
const newQuery = `// Query based on user role
    let records;
    if (req.user.role === 'SUPERVISOR') {
      // SUPERVISOR: Get all records from their department
      records = dbCall(db, 'prepare',
        'SELECT * FROM routine_records WHERE department_id = ? AND date >= ? ORDER BY date DESC'
      ).all(userDept, startDate);
    } else if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {
      // BOSS/MANAGER: Get all records (no filter)
      records = dbCall(db, 'prepare',
        'SELECT * FROM routine_records WHERE date >= ? ORDER BY date DESC'
      ).all(startDate);
    } else {
      // EMPLOYEE: Only their own records
      records = dbCall(db, 'prepare',
        'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'
      ).all(userId, userDept, startDate);
    }`;

if (content.includes(oldQuery)) {
  content = content.replace(oldQuery, newQuery);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Fixed query scope based on user role');
  console.log('  - SUPERVISOR: Returns all records from their department');
  console.log('  - BOSS/MANAGER: Returns all records');
  console.log('  - EMPLOYEE: Returns only their own records');
} else {
  console.log('ERROR: Pattern not found');
  console.log('Trying to find similar pattern...');
  
  // Check if already fixed
  if (content.includes('Query based on user role')) {
    console.log('INFO: Already fixed!');
  } else {
    console.log('ERROR: Cannot find the pattern to replace');
  }
}

console.log('Fix complete!');
