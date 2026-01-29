const fs = require('fs');

console.log('=== Refactoring GET / route with correct path ===');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

// 1. Add UserService import with CORRECT path
if (!content.includes("const UserService = require('../../services/userService');")) {
    const lastRequireIndex = content.lastIndexOf("const auth_1 = require(\"../middleware/auth\");");
    if (lastRequireIndex !== -1) {
        const insertPos = content.indexOf('\n', lastRequireIndex) + 1;
        content = content.slice(0, insertPos) + 
                  "const UserService = require('../../services/userService');\n" +
                  content.slice(insertPos);
        console.log('+ Added UserService import with correct path');
    }
}

// 2. Replace database query in GET / route
const dbAllPattern = /const users = await db\.all\(query, params\);[\s\S]*?const usersWithPermissions = users\.map\(user => \({[\s\S]*?permissions: user\.permissions \? JSON\.parse\(user\.permissions\) : undefined[\s\S]*?\}\)\);/;

const replacement = `const usersWithPermissions = await UserService.getAllUsers(db, currentUser);`;

if (dbAllPattern.test(content)) {
    content = content.replace(dbAllPattern, replacement);
    console.log('+ Replaced GET / route database query');
} else {
    console.error('ERROR: Pattern not found');
    process.exit(1);
}

// Write modified file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Modified file size:', content.length, 'bytes');
console.log('SUCCESS: GET / route refactored with correct path');
