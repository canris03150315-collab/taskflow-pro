const fs = require('fs');
const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

// 修復 GET /users 的 SELECT 語句
const oldPattern = "let query = 'SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users';";
const newPattern = "let query = 'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users';";

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed GET /users SELECT query');
} else {
  console.log('❌ Pattern not found or already fixed');
}
