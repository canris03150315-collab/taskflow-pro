const fs = require('fs');
const filePath = '/app/dist/middleware/auth.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing requireSelfOrAdmin for dept-unassigned...');

// 修改 SUPERVISOR 的權限檢查，允許編輯 dept-unassigned 的人員
const oldPattern = `                if (targetUser.role === 'EMPLOYEE' ||
                    (targetUser.role === 'SUPERVISOR' && targetUser.department === req.user.department)) {
                    next();
                }`;

const newPattern = `                if (targetUser.role === 'EMPLOYEE' ||
                    (targetUser.role === 'SUPERVISOR' && targetUser.department === req.user.department) ||
                    targetUser.department === 'dept-unassigned') {
                    next();
                }`;

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: requireSelfOrAdmin updated - all SUPERVISOR can edit dept-unassigned users');
} else {
    console.log('ERROR: Pattern not found');
}

console.log('Complete!');
