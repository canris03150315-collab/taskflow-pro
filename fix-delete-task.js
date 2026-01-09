const fs = require('fs');

const filePath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing DELETE task route to use dbCall...');

// Check if dbCall is imported
if (!content.includes('const { dbCall }')) {
  // Add dbCall import after express import
  content = content.replace(
    "const express_1 = __importDefault(require(\"express\"));",
    "const express_1 = __importDefault(require(\"express\"));\nconst { dbCall } = require('../database');"
  );
  console.log('Added dbCall import');
}

// Fix the DELETE route - replace db.get with dbCall
const oldGetPattern = /const task = await db\.get\('SELECT \* FROM tasks WHERE id = \?', \[id\]\);/;
const newGetCode = "const task = await dbCall(db, 'get', 'SELECT * FROM tasks WHERE id = ?', [id]);";

if (oldGetPattern.test(content)) {
  content = content.replace(oldGetPattern, newGetCode);
  console.log('Fixed db.get to dbCall');
}

// Fix db.run for DELETE
const oldRunPattern = /await db\.run\('DELETE FROM tasks WHERE id = \?', \[id\]\);/;
const newRunCode = "await dbCall(db, 'run', 'DELETE FROM tasks WHERE id = ?', [id]);";

if (oldRunPattern.test(content)) {
  content = content.replace(oldRunPattern, newRunCode);
  console.log('Fixed db.run to dbCall');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed DELETE task route');
