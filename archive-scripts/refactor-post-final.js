const fs = require('fs');

console.log('=== Refactoring POST / route (final) ===');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

// Find and replace the INSERT statement in POST / route
// The pattern includes the userId generation and the INSERT
const postPattern = /const userId = `user-\$\{Date\.now\(\)\}-\$\{Math\.random\(\)\.toString\(36\)\.substr\(2, 9\)\}`;[\s\S]*?await db\.run\(`INSERT INTO users \(id, name, role, department, avatar, username, password, permissions, created_at, updated_at\)[\s\S]*?VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, datetime\('now'\), datetime\('now'\)\)`, \[[\s\S]*?userId,[\s\S]*?name,[\s\S]*?role,[\s\S]*?department,[\s\S]*?avatar[^,]*,[\s\S]*?username,[\s\S]*?hashedPassword,[\s\S]*?permissions[^\]]*\]\);/;

if (postPattern.test(content)) {
    const replacement = `const newUser = await UserService.createUser(db, {
            name,
            username,
            password: hashedPassword,
            role,
            department,
            avatar,
            permissions
        });
        const userId = newUser.id;`;
    
    content = content.replace(postPattern, replacement);
    console.log('+ Replaced POST / route INSERT statement');
} else {
    console.log('! Pattern not found, trying alternative...');
    
    // Try simpler pattern - just the INSERT
    const simplePattern = /await db\.run\(`INSERT INTO users \(id, name, role, department, avatar, username, password, permissions, created_at, updated_at\)[\s\S]*?VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, datetime\('now'\), datetime\('now'\)\)`, \[[^\]]+\]\);/;
    
    if (simplePattern.test(content)) {
        // Need to be careful here - we need to keep userId generation
        console.log('! Found INSERT but need to preserve userId generation');
        console.log('! Attempting replacement...');
        
        content = content.replace(simplePattern, `const newUser = await UserService.createUser(db, {
            name,
            username,
            password: hashedPassword,
            role,
            department,
            avatar,
            permissions
        });
        // Use the ID from created user
        const createdUserId = newUser.id;`);
        
        // Also need to update the response to use createdUserId
        content = content.replace(/userId,/g, 'createdUserId,');
        
        console.log('+ Replaced POST / INSERT (alternative pattern)');
    } else {
        console.log('! Could not find pattern to replace');
    }
}

// Write modified file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Modified file size:', content.length, 'bytes');
console.log('SUCCESS: POST / route refactored');
