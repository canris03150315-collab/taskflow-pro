const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('=== Safe fix for /routines/history ===\n');

// Fix 1: Change query to get all records for BOSS/MANAGER
// Find the specific line and replace it
const oldQuery = "const records = dbCall(db, 'prepare',\n      'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'\n    ).all(userId, userDept, startDate);";

const newQuery = `let records;
    if (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') {
      records = dbCall(db, 'prepare', 'SELECT * FROM routine_records WHERE date >= ? ORDER BY date DESC').all(startDate);
    } else if (currentUser.role === 'SUPERVISOR') {
      records = dbCall(db, 'prepare', 'SELECT * FROM routine_records WHERE department_id = ? AND date >= ? ORDER BY date DESC').all(currentUser.department, startDate);
    } else {
      records = dbCall(db, 'prepare', 'SELECT * FROM routine_records WHERE user_id = ? AND date >= ? ORDER BY date DESC').all(currentUser.id, startDate);
    }`;

// Also need to change userId/userDept to currentUser
content = content.replace('const userId = req.user.id;', 'const currentUser = req.user;');
content = content.replace('const userDept = req.user.department;', '// userDept removed - using currentUser.department');

if (content.includes(oldQuery)) {
  content = content.replace(oldQuery, newQuery);
  console.log('Step 1: Query updated to support multiple roles');
} else {
  console.log('Step 1: Could not find exact query pattern, trying alternative...');
  
  // Try a simpler replacement
  const simpleOld = ".all(userId, userDept, startDate);";
  const simpleNew = ".all(startDate);";
  
  if (content.includes(simpleOld)) {
    // First change the SELECT to not filter by user
    content = content.replace(
      "WHERE user_id = ? AND department_id = ? AND date >= ?",
      "WHERE date >= ?"
    );
    content = content.replace(simpleOld, simpleNew);
    console.log('Step 1 (alternative): Query simplified');
  }
}

// Fix 2: Change r.items to r.completed_items
if (content.includes("JSON.parse(r.items || '[]')")) {
  content = content.replace("JSON.parse(r.items || '[]')", "JSON.parse(r.completed_items || '[]')");
  console.log('Step 2: Fixed column name items -> completed_items');
} else {
  console.log('Step 2: Column name already correct or not found');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\nDone. Please restart container.');
