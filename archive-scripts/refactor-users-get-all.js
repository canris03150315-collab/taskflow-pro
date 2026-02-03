const fs = require('fs');

console.log('=== 重構 GET / 路由（獲取所有用戶） ===');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('原始文件大小:', content.length, 'bytes');

// 1. 在文件開頭添加 UserService 引入（如果還沒有）
if (!content.includes("const UserService = require('../services/userService');")) {
    // 找到最後一個 require 語句的位置
    const lastRequireIndex = content.lastIndexOf("const auth_1 = require(\"../middleware/auth\");");
    if (lastRequireIndex !== -1) {
        const insertPos = content.indexOf('\n', lastRequireIndex) + 1;
        content = content.slice(0, insertPos) + 
                  "const UserService = require('../services/userService');\n" +
                  content.slice(insertPos);
        console.log('✓ 添加 UserService 引入');
    }
}

// 2. 替換 GET / 路由中的資料庫查詢
// 找到 GET / 路由的開始
const getRouteStart = content.indexOf("router.get('/', auth_1.authenticateToken");
if (getRouteStart === -1) {
    console.error('❌ 找不到 GET / 路由');
    process.exit(1);
}

// 找到這個路由中的 db.all 調用
const dbAllPattern = /const users = await db\.all\(query, params\);[\s\S]*?const usersWithPermissions = users\.map\(user => \({[\s\S]*?permissions: user\.permissions \? JSON\.parse\(user\.permissions\) : undefined[\s\S]*?\}\)\);/;

const replacement = `const usersWithPermissions = await UserService.getAllUsers(db, currentUser);`;

if (dbAllPattern.test(content)) {
    content = content.replace(dbAllPattern, replacement);
    console.log('✓ 替換 GET / 路由的資料庫查詢');
} else {
    console.error('❌ 找不到要替換的模式');
    process.exit(1);
}

// 寫入修改後的文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('修改後文件大小:', content.length, 'bytes');
console.log('✓ GET / 路由重構完成');
console.log('SUCCESS');
