const fs = require('fs');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('=== Fixing audit log database syntax ===');

// Replace prepare().get() with await db.get()
const oldPattern1 = /const totalResult = req\.db\.prepare\(countQuery\)\.get\(\.\.\.params\);/g;
const newCode1 = 'const totalResult = await db.get(countQuery, params);';

if (content.match(oldPattern1)) {
    content = content.replace(oldPattern1, newCode1);
    console.log('✓ Fixed: totalResult query');
} else {
    console.log('✗ Pattern not found: totalResult');
}

// Replace prepare().all() with await db.all()
const oldPattern2 = /const logs = req\.db\.prepare\(query\)\.all\(\.\.\.params\);/g;
const newCode2 = 'const logs = await db.all(query, params);';

if (content.match(oldPattern2)) {
    content = content.replace(oldPattern2, newCode2);
    console.log('✓ Fixed: logs query');
} else {
    console.log('✗ Pattern not found: logs query');
}

// Also need to change req.db to db at the beginning
const oldPattern3 = /const currentUser = req\.user;(\s+)\/\/ \\u6b0a\\u9650\\u6aa2\\u67e5/g;
const newCode3 = `const currentUser = req.user;
        const db = req.db;
        
        // \\u6b0a\\u9650\\u6aa2\\u67e5`;

if (content.match(oldPattern3)) {
    content = content.replace(oldPattern3, newCode3);
    console.log('✓ Added: const db = req.db');
} else {
    console.log('✗ Pattern not found: const db declaration');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ SUCCESS: Fixed database syntax in audit log route');
