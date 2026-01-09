const fs = require('fs');
const authPath = '/app/dist/middleware/auth.js';
let authContent = fs.readFileSync(authPath, 'utf8');

console.log('Fixing requireSelfOrAdmin middleware...');

// Find and replace the requireSelfOrAdmin function
const oldFunction = `        // BOSS 和 MANAGER 可以管理所有人
        if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {
            next();
            return;
        }`;

const newFunction = `        // BOSS 和 MANAGER 可以管理所有人
        if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {
            next();
            return;
        }
        // 擁有 MANAGE_USERS 權限的用戶可以管理所有人
        if (req.user.permissions && req.user.permissions.includes('MANAGE_USERS')) {
            next();
            return;
        }`;

if (authContent.includes(oldFunction)) {
    authContent = authContent.replace(oldFunction, newFunction);
    fs.writeFileSync(authPath, authContent, 'utf8');
    console.log('Fixed requireSelfOrAdmin middleware');
} else {
    console.log('Pattern not found, checking alternative...');
}

console.log('Complete!');
