"use strict";
const fs = require('fs');

// 讀取文件
const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

// 修復：在 GET /api/users 的 SELECT 語句中添加 permissions 欄位
content = content.replace(
    /let query = 'SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users';/g,
    "let query = 'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users';"
);

// 寫回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('✓ 已修復用戶列表的權限欄位查詢問題');
