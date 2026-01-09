const fs = require('fs');
const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

// 修復 GET /users 的 SELECT 語句
const oldPattern = "let query = 'SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users';";
const newPattern = "let query = 'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users';";

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed GET /users SELECT query - added permissions field');
} else if (content.includes(newPattern)) {
  console.log('✅ Already fixed - permissions field exists');
} else {
  console.log('❌ Pattern not found');
  // 顯示實際的內容以便調試
  const lines = content.split('\n');
  const queryLine = lines.find(l => l.includes("let query = 'SELECT"));
  console.log('Found query line:', queryLine);
}
