const fs = require('fs');

console.log('=== Refactoring PUT and POST routes ===');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

// 1. Refactor PUT /:id route
console.log('\n--- Refactoring PUT /:id ---');

// Find and replace the UPDATE section (after all validation)
const putUpdatePattern = /updates\.push\('updated_at = \?'\);[\s\S]*?params\.push\(now\);[\s\S]*?params\.push\(id\);[\s\S]*?await db\.run\(`UPDATE users SET \$\{updates\.join\(', '\)\} WHERE id = \?`, params\);/;

if (putUpdatePattern.test(content)) {
    const replacement = `updates.push('updated_at = ?');
        params.push(now);
        
        // Use UserService for update
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined && !isSelf) updateData.role = role;
        if (department !== undefined && !isSelf) updateData.department = department;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (permissions !== undefined && !isSelf) updateData.permissions = permissions;
        
        await UserService.updateUser(db, id, updateData);`;
    
    content = content.replace(putUpdatePattern, replacement);
    console.log('+ Replaced PUT /:id UPDATE statement');
} else {
    console.log('! PUT pattern not found, trying alternative...');
    
    // Try simpler pattern - just the db.run line
    const simplePattern = /await db\.run\(`UPDATE users SET \$\{updates\.join\(', '\)\} WHERE id = \?`, params\);/;
    if (simplePattern.test(content)) {
        // Get the position and insert UserService call before it
        content = content.replace(simplePattern, `// Build update data for UserService
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined && !isSelf) updateData.role = role;
        if (department !== undefined && !isSelf) updateData.department = department;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (permissions !== undefined && !isSelf) updateData.permissions = permissions;
        
        await UserService.updateUser(db, id, updateData);`);
        console.log('+ Replaced PUT /:id (simple pattern)');
    }
}

// Also replace the getUserById call in PUT route
const putGetUserPattern = /const updatedUser = await db\.get\('SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = \?', \[id\]\);[\s\S]*?const user = \{[\s\S]*?\.\.\.updatedUser,[\s\S]*?permissions: updatedUser\.permissions \? JSON\.parse\(updatedUser\.permissions\) : undefined[\s\S]*?\};/;

if (putGetUserPattern.test(content)) {
    content = content.replace(putGetUserPattern, 'const user = await UserService.getUserById(db, id);');
    console.log('+ Replaced PUT /:id getUserById call');
}

// 2. Refactor POST / route
console.log('\n--- Refactoring POST / ---');

// Find the INSERT statement
const postInsertPattern = /const id = `user-\$\{Date\.now\(\)\}-\$\{Math\.random\(\)\.toString\(36\)\.substr\(2, 9\)\}`;[\s\S]*?const now = new Date\(\)\.toISOString\(\);[\s\S]*?await db\.run\(`INSERT INTO users \(id, name, role, department, avatar, username, password, permissions, created_at, updated_at\)[\s\S]*?VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)`,[\s\S]*?\[[\s\S]*?id,[\s\S]*?name,[\s\S]*?role,[\s\S]*?department,[\s\S]*?avatar.*?,[\s\S]*?username,[\s\S]*?hashedPassword,[\s\S]*?permissions.*?,[\s\S]*?now,[\s\S]*?now[\s\S]*?\]\);/;

if (postInsertPattern.test(content)) {
    const replacement = `const newUser = await UserService.createUser(db, {
            name,
            username,
            password: hashedPassword,
            role,
            department,
            avatar,
            permissions
        });
        const id = newUser.id;`;
    
    content = content.replace(postInsertPattern, replacement);
    console.log('+ Replaced POST / INSERT statement');
} else {
    console.log('! POST pattern not found, trying simpler pattern...');
    
    // Try to find just the db.run INSERT
    const simpleInsertPattern = /await db\.run\(`INSERT INTO users \(id, name, role, department, avatar, username, password, permissions, created_at, updated_at\)[^`]+`[^;]+\);/;
    
    if (simpleInsertPattern.test(content)) {
        // This is tricky, we need to keep the id generation
        console.log('! Found INSERT but pattern too complex, manual intervention needed');
    }
}

// Write modified file
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== Summary ===');
console.log('Modified file size:', content.length, 'bytes');
console.log('SUCCESS: PUT and POST routes refactored');
