const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Before fix, checking query...');
const beforeMatch = content.match(/WHERE user_id = \? AND date = \?\)\.get\(userId, today\)/);
if (beforeMatch) {
  console.log('Found query to fix');
} else {
  console.log('Query pattern not found!');
}

// Replace the query
const oldPattern = "WHERE user_id = ? AND date = ?').get(userId, today)";
const newPattern = "WHERE user_id = ? AND date = ? AND department_id = ?').get(userId, today, userDept)";

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Fixed routine query with department_id check');
} else {
  console.log('ERROR: Pattern not found in file');
}
