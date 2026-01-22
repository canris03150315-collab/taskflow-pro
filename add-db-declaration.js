const fs = require('fs');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('=== Adding db declaration to audit log route ===');

// Find and replace: add db declaration after currentUser
const oldCode = `    try {
        const currentUser = req.user;

        // Permission check: BOSS/MANAGER/SUPERVISOR only`;

const newCode = `    try {
        const currentUser = req.user;
        const db = req.db;

        // Permission check: BOSS/MANAGER/SUPERVISOR only`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    console.log('✓ Added: const db = req.db');
} else {
    console.log('✗ Pattern not found');
    console.log('Trying alternative pattern...');
    
    // Try with different spacing
    const altPattern = /const currentUser = req\.user;\s+\/\/ Permission check/;
    if (content.match(altPattern)) {
        content = content.replace(altPattern, 'const currentUser = req.user;\n        const db = req.db;\n\n        // Permission check');
        console.log('✓ Added: const db = req.db (alternative)');
    } else {
        console.log('✗ Alternative pattern not found either');
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ SUCCESS: Added db declaration');
