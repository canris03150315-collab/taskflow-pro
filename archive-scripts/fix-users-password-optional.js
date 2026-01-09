"use strict";
const fs = require('fs');

// 讀取文件
const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

// 在 PUT /:id 路由中，從 req.body 解構時添加 password
content = content.replace(
    /const \{ name, role, department, avatar, permissions \} = req\.body;/,
    'const { name, role, department, avatar, permissions, password } = req.body;'
);

// 在更新語句構建部分，avatar 之後添加 password 處理
const passwordUpdateCode = `        if (avatar !== undefined) {
            updates.push('avatar = ?');
            params.push(avatar);
        }
        if (password !== undefined && password !== '' && !isSelf) {
            // 只有提供密碼且不為空時才更新密碼
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push('password = ?');
            params.push(hashedPassword);
        }
        if (permissions !== undefined && !isSelf) {`;

content = content.replace(
    /if \(avatar !== undefined\) \{[\s\S]*?params\.push\(avatar\);[\s\S]*?\}[\s\S]*?if \(permissions !== undefined && !isSelf\) \{/,
    passwordUpdateCode
);

// 寫回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('✓ 已添加密碼選填更新邏輯');
