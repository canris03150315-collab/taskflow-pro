const fs = require('fs');
const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding diagnostic logging to POST /users...');

// 在 SUPERVISOR 檢查前添加日誌
const oldPattern = `        // SUPERVISOR 只能新增自己部門或待分配新人的員工
        if (currentUser.role === types_1.Role.SUPERVISOR) {
            if (department !== currentUser.department && department !== 'dept-unassigned') {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u81ea\\u5df1\\u90e8\\u9580\\u6216\\u5f85\\u5206\\u914d\\u65b0\\u4eba\\u7684\\u4eba\\u54e1' });
            }
            if (role !== types_1.Role.EMPLOYEE) {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u4e00\\u822c\\u54e1\\u5de5' });
            }
        }`;

const newPattern = `        // SUPERVISOR 只能新增自己部門或待分配新人的員工
        if (currentUser.role === types_1.Role.SUPERVISOR) {
            console.log('[POST /users] SUPERVISOR check:', {
                currentUserDept: currentUser.department,
                targetDept: department,
                targetRole: role,
                isDeptUnassigned: department === 'dept-unassigned',
                isOwnDept: department === currentUser.department
            });
            if (department !== currentUser.department && department !== 'dept-unassigned') {
                console.log('[POST /users] SUPERVISOR rejected: wrong department');
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u81ea\\u5df1\\u90e8\\u9580\\u6216\\u5f85\\u5206\\u914d\\u65b0\\u4eba\\u7684\\u4eba\\u54e1' });
            }
            if (role !== types_1.Role.EMPLOYEE) {
                console.log('[POST /users] SUPERVISOR rejected: wrong role');
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u4e00\\u822c\\u54e1\\u5de5' });
            }
            console.log('[POST /users] SUPERVISOR check passed');
        }`;

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Added diagnostic logging');
} else {
    console.log('ERROR: Pattern not found');
}

console.log('Complete!');
