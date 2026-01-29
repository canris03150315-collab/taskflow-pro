const fs = require('fs');

console.log('=== Complete Users Routes Refactoring ===');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

let changeCount = 0;

// 3. Refactor GET /department/:departmentId route
console.log('\n--- Refactoring GET /department/:departmentId ---');
const getDeptPattern = /const users = await db\.all\('SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE department = \? ORDER BY role DESC, name\s+ASC', \[departmentId\]\);[\s\S]*?const usersWithPermissions = users\.map\(user => \({[\s\S]*?permissions: user\.permissions \? JSON\.parse\(user\.permissions\) : undefined[\s\S]*?\}\)\);/;

if (getDeptPattern.test(content)) {
    content = content.replace(getDeptPattern, 'const usersWithPermissions = await UserService.getUsersByDepartment(db, departmentId);');
    console.log('+ Replaced GET /department/:departmentId route');
    changeCount++;
} else {
    console.log('! Pattern not found for GET /department/:departmentId (may already be refactored)');
}

// 4. Refactor DELETE /:id route
console.log('\n--- Refactoring DELETE /:id ---');
// Find the cascade delete section
const deletePattern = /await db\.run\('DELETE FROM tasks WHERE created_by = \? OR assigned_to_user_id = \? OR accepted_by_user_id = \?', \[id, id, id\]\);[\s\S]*?await db\.run\('DELETE FROM suggestions WHERE author_id = \? OR status_changed_by = \?', \[id, id\]\);[\s\S]*?await db\.run\('DELETE FROM users WHERE id = \?', \[id\]\);/;

if (deletePattern.test(content)) {
    content = content.replace(deletePattern, 'await UserService.deleteUser(db, id);');
    console.log('+ Replaced DELETE /:id route (cascade delete)');
    changeCount++;
} else {
    console.log('! Pattern not found for DELETE /:id (may already be refactored)');
}

// 5. Refactor PUT /:id route - UPDATE statement
console.log('\n--- Refactoring PUT /:id ---');
// This is complex, we'll replace the UPDATE statement
const updatePattern = /await db\.run\(`UPDATE users SET \$\{updates\.join\(', '\)\} WHERE id = \?`, params\);[\s\S]*?const updatedUser = await db\.get\('SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = \?', \[id\]\);[\s\S]*?const user = \{[\s\S]*?\.\.\.updatedUser,[\s\S]*?permissions: updatedUser\.permissions \? JSON\.parse\(updatedUser\.permissions\) : undefined[\s\S]*?\};/;

if (updatePattern.test(content)) {
    const replacement = `const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (department !== undefined) updateData.department = department;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (permissions !== undefined) updateData.permissions = permissions;
        
        const user = await UserService.updateUser(db, id, updateData);`;
    
    content = content.replace(updatePattern, replacement);
    console.log('+ Replaced PUT /:id route');
    changeCount++;
} else {
    console.log('! Pattern not found for PUT /:id (may already be refactored)');
}

// 6. Refactor POST / route - INSERT statement
console.log('\n--- Refactoring POST / ---');
// Replace the INSERT statement, keeping all validation logic
const insertPattern = /await db\.run\(`INSERT INTO users \(id, name, role, department, avatar, username, password, permissions, created_at, updated_at\)[\s\S]*?VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)`, \[[\s\S]*?id,[\s\S]*?name,[\s\S]*?role,[\s\S]*?department,[\s\S]*?avatar \|\| null,[\s\S]*?username,[\s\S]*?hashedPassword,[\s\S]*?permissions \? JSON\.stringify\(permissions\) : null,[\s\S]*?now,[\s\S]*?now[\s\S]*?\]\);/;

if (insertPattern.test(content)) {
    const replacement = `const newUser = await UserService.createUser(db, {
            name,
            username,
            password: hashedPassword,
            role,
            department,
            avatar,
            permissions
        });`;
    
    content = content.replace(insertPattern, replacement);
    console.log('+ Replaced POST / route (INSERT)');
    changeCount++;
} else {
    console.log('! Pattern not found for POST / INSERT (may already be refactored)');
}

// Write modified file
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== Summary ===');
console.log('Modified file size:', content.length, 'bytes');
console.log('Total changes made:', changeCount);

if (changeCount > 0) {
    console.log('SUCCESS: Users routes refactoring completed');
} else {
    console.log('WARNING: No changes made (routes may already be refactored)');
}
