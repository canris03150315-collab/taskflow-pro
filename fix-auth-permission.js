const fs = require('fs');
const filePath = '/app/dist/middleware/auth.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing requireSelfOrAdmin...');

// Find the exact pattern from the file
const oldPattern = `        // BOSS ??MANAGER ?臭誑蝞∠???犖
        if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {
            next();
            return;
        }`;

const newPattern = `        // BOSS ??MANAGER ?臭誑蝞∠???犖
        if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {
            next();
            return;
        }
        // \\u64c1\\u6709 MANAGE_USERS \\u6b0a\\u9650\\u7684\\u7528\\u6236\\u53ef\\u4ee5\\u7ba1\\u7406\\u6240\\u6709\\u4eba
        if (req.user.permissions && req.user.permissions.includes('MANAGE_USERS')) {
            next();
            return;
        }`;

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: requireSelfOrAdmin fixed');
} else {
    console.log('ERROR: Pattern not found');
    console.log('Looking for alternative pattern...');
    
    // Try simpler pattern
    const simpleOld = "if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {\n            next();\n            return;\n        }\n        // SUPERVISOR";
    const simpleNew = "if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {\n            next();\n            return;\n        }\n        // \\u64c1\\u6709 MANAGE_USERS \\u6b0a\\u9650\\u7684\\u7528\\u6236\\u53ef\\u4ee5\\u7ba1\\u7406\\u6240\\u6709\\u4eba\n        if (req.user.permissions && req.user.permissions.includes('MANAGE_USERS')) {\n            next();\n            return;\n        }\n        // SUPERVISOR";
    
    if (content.includes(simpleOld)) {
        content = content.replace(simpleOld, simpleNew);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('SUCCESS: Alternative pattern fixed');
    } else {
        console.log('ERROR: Alternative pattern also not found');
    }
}

console.log('Complete');
