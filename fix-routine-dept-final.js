const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing routine query...');

content = content.replace(
  /SELECT \* FROM routine_records WHERE user_id = \? AND date = \?\)\.get\(userId, today\)/g,
  'SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?).get(userId, today, userDept)'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed routine department check');
