const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

// 修復問題：查詢今日記錄時應該同時檢查 department_id
// 原本：SELECT * FROM routine_records WHERE user_id = ? AND date = ?
// 修改為：SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?

content = content.replace(
  /SELECT \* FROM routine_records WHERE user_id = \? AND date = \?\)\.get\(userId, today\)/g,
  'SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?).get(userId, today, userDept)'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed routine department check');
