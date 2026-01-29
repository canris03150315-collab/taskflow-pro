const fs = require('fs');

console.log('=== 開始重構用戶路由 ===');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('原始文件大小:', content.length, 'bytes');

// 1. 在文件開頭添加 UserService 引入
const importStatement = "const { UserService } = require('../services');";
const routerLine = "const router = express_1.default.Router();";

if (!content.includes("require('../services')")) {
    content = content.replace(
        routerLine,
        `${routerLine}\nconst userService = new UserService();`
    );
    
    // 在 require 區域添加 services 引入
    const lastRequire = content.lastIndexOf("const auth_1 = require(\"../middleware/auth\");");
    if (lastRequire !== -1) {
        const insertPos = content.indexOf('\n', lastRequire) + 1;
        content = content.slice(0, insertPos) + 
                  "const services_1 = require(\"../services\");\n" +
                  content.slice(insertPos);
    }
    
    console.log('✓ 添加 UserService 引入');
}

// 2. 替換 GET / 路由的資料庫查詢
content = content.replace(
    /const users = await db\.all\(query, params\);/g,
    'const users = await services_1.UserService.getAllUsers(db, currentUser);'
);
console.log('✓ 替換 GET / 路由');

// 3. 替換 GET /:id 路由的資料庫查詢
content = content.replace(
    /const userRow = await db\.get\('SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = \?', \[id\]\);/g,
    'const userRow = await services_1.UserService.getUserById(db, id);'
);
console.log('✓ 替換 GET /:id 路由');

// 4. 替換 POST / 路由的用戶名檢查
content = content.replace(
    /const existingUser = await db\.get\('SELECT id FROM users WHERE username = \?', \[username\]\);/g,
    'const existingUser = await db.get(\'SELECT id FROM users WHERE username = ?\', [username]);'
);

// 5. 替換 POST / 路由的 INSERT 操作
const insertPattern = /await db\.run\(`INSERT INTO users \(id, name, role, department, avatar, username, password, permissions, created_at, updated_at\)[^;]+;/g;
content = content.replace(
    insertPattern,
    `const newUser = await services_1.UserService.createUser(db, {
            name,
            username,
            password: hashedPassword,
            role,
            department,
            avatar,
            permissions
        });`
);
console.log('✓ 替換 POST / 路由的 INSERT');

// 6. 替換 PUT /:id 路由的 UPDATE 操作
content = content.replace(
    /await db\.run\(`UPDATE users SET \$\{updates\.join\(', '\)\} WHERE id = \?`, params\);/g,
    `await services_1.UserService.updateUser(db, id, {
            name: req.body.name,
            role: req.body.role,
            department: req.body.department,
            avatar: req.body.avatar,
            permissions: req.body.permissions
        });`
);
console.log('✓ 替換 PUT /:id 路由的 UPDATE');

// 7. 替換 PUT /:id 路由的查詢更新後的用戶
content = content.replace(
    /const updatedUser = await db\.get\('SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = \?', \[id\]\);/g,
    'const updatedUser = await services_1.UserService.getUserById(db, id);'
);

// 8. 替換 DELETE /:id 路由
content = content.replace(
    /await db\.run\('DELETE FROM users WHERE id = \?', \[id\]\);/g,
    'await services_1.UserService.deleteUser(db, id);'
);
console.log('✓ 替換 DELETE /:id 路由');

// 9. 替換 GET /department/:departmentId 路由
content = content.replace(
    /const users = await db\.all\('SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE department = \? ORDER BY role DESC, name\s+ASC', \[departmentId\]\);/g,
    'const users = await services_1.UserService.getUsersByDepartment(db, departmentId);'
);
console.log('✓ 替換 GET /department/:departmentId 路由');

// 寫入修改後的文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('修改後文件大小:', content.length, 'bytes');
console.log('✓ 用戶路由重構完成');
console.log('SUCCESS');
