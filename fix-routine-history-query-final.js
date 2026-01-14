const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing routine history query scope - Final version...');

// Find the exact pattern from the file
const searchPattern = `const records = dbCall(db, 'prepare',
        'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'
      ).all(userId, userDept, startDate);`;

const replacement = `// Query based on user role
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

// Try to find and replace
const index = content.indexOf(searchPattern);
if (index !== -1) {
  content = content.substring(0, index) + replacement + content.substring(index + searchPattern.length);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Fixed query scope based on user role');
  console.log('  - SUPERVISOR: Returns all records from their department');
  console.log('  - BOSS/MANAGER: Returns all records');
  console.log('  - EMPLOYEE: Returns only their own records');
} else {
  console.log('ERROR: Exact pattern not found');
  console.log('Trying regex approach...');
  
  // Use regex to find the pattern more flexibly
  const regex = /const records = dbCall\(db, 'prepare',\s*'SELECT \* FROM routine_records WHERE user_id = \? AND department_id = \? AND date >= \? ORDER BY date DESC'\s*\)\.all\(userId, userDept, startDate\);/;
  
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Fixed using regex approach');
  } else {
    console.log('ERROR: Cannot find pattern even with regex');
  }
}

console.log('Fix complete!');
