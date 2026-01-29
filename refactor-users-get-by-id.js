const fs = require('fs');

console.log('=== Refactoring GET /:id route ===');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

// Replace database query in GET /:id route
// Pattern to match the entire block from db.get to the permission parsing
const getByIdPattern = /const userRow = await db\.get\('SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = \?', \[id\]\);[\s\S]*?if \(!userRow\) \{[\s\S]*?return res\.status\(404\)\.json\(\{ error: [^}]+\}\);[\s\S]*?\}[\s\S]*?const user = \{[\s\S]*?\.\.\.userRow,[\s\S]*?permissions: userRow\.permissions \? JSON\.parse\(userRow\.permissions\) : undefined[\s\S]*?\};/;

const replacement = `const user = await UserService.getUserById(db, id);
        if (!user) {
            return res.status(404).json({ error: '\\u7528\\u6236\\u4e0d\\u5b58\\u5728' });
        }`;

if (getByIdPattern.test(content)) {
    content = content.replace(getByIdPattern, replacement);
    console.log('+ Replaced GET /:id route database query');
} else {
    console.error('ERROR: Pattern not found for GET /:id route');
    console.log('Searching for simpler pattern...');
    
    // Try a simpler pattern
    const simplePattern = /const userRow = await db\.get\('SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = \?', \[id\]\);/;
    
    if (simplePattern.test(content)) {
        console.log('Found userRow query, replacing...');
        content = content.replace(simplePattern, 'const userRow = await UserService.getUserById(db, id);');
        
        // Also replace the user object creation
        const userObjPattern = /const user = \{[\s\S]*?\.\.\.userRow,[\s\S]*?permissions: userRow\.permissions \? JSON\.parse\(userRow\.permissions\) : undefined[\s\S]*?\};/;
        if (userObjPattern.test(content)) {
            content = content.replace(userObjPattern, 'const user = userRow;');
            console.log('+ Replaced user object creation');
        }
        
        console.log('+ Replaced GET /:id route (simple pattern)');
    } else {
        console.error('ERROR: Could not find pattern to replace');
        process.exit(1);
    }
}

// Write modified file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Modified file size:', content.length, 'bytes');
console.log('SUCCESS: GET /:id route refactored');
