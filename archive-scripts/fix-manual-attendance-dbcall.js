const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing dbCall syntax in manual attendance route...');

// Fix the dbCall syntax - should be dbCall(db, 'prepare', query).get(params)
// Not dbCall(db, 'prepare', query).get(params)

// Fix: const existing = dbCall(db, 'prepare', 'SELECT...').get(userId, date);
// Should be: const existing = dbCall(db, 'prepare', 'SELECT...').get(userId, date);

// The issue is the query is split across lines, need to fix the pattern
content = content.replace(
  /const existing = dbCall\(db, 'prepare',[\s\S]*?'SELECT \* FROM attendance_records WHERE user_id = \? AND date = \?'[\s\S]*?\)\.get\(userId, date\);/,
  "const existing = dbCall(db, 'prepare', 'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?').get(userId, date);"
);

// Fix the UPDATE statement
content = content.replace(
  /dbCall\(db, 'prepare', `[\s\S]*?UPDATE attendance_records[\s\S]*?WHERE id = \?[\s\S]*?`\)\.run\(/,
  "dbCall(db, 'prepare', 'UPDATE attendance_records SET clock_out = ?, duration_minutes = ?, work_hours = ?, status = ?, is_manual = ?, manual_by = ?, manual_reason = ?, manual_at = ? WHERE id = ?').run("
);

// Fix the SELECT after update
content = content.replace(
  /const updated = dbCall\(db, 'prepare', 'SELECT \* FROM attendance_records WHERE id = \?'\)\.get\(existing\.id\);/,
  "const updated = dbCall(db, 'prepare', 'SELECT * FROM attendance_records WHERE id = ?').get(existing.id);"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed dbCall syntax');
