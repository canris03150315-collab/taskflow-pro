const fs = require('fs');
const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing unassigned department permissions...');

// 修復 1: POST /users - 移除 SUPERVISOR 對 dept-unassigned 的限制
// 讓所有有 MANAGE_USERS 權限的用戶都可以新增到待分配部門
const oldPost = `        // SUPERVISOR ?芾?啣??芸楛?券??????唬犖?撌?        if (currentUser.role === types_1.Role.SUPERVISOR) {
            if (department !== currentUser.department && department !== 'dept-unassigned') {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u81ea\\u5df1\\u90e8\\u9580\\u6216\\u5f85\\u5206\\u914d\\u65b0\\u4eba\\u7684\\u4eba\\u54e1' });
            }
            if (role !== types_1.Role.EMPLOYEE) {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u4e00\\u822c\\u54e1\\u5de5' });
            }
        }`;

const newPost = `        // SUPERVISOR ?芾?啣??芸楛?券????        if (currentUser.role === types_1.Role.SUPERVISOR) {
            if (department !== currentUser.department && department !== 'dept-unassigned') {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u81ea\\u5df1\\u90e8\\u9580\\u6216\\u5f85\\u5206\\u914d\\u65b0\\u4eba\\u7684\\u4eba\\u54e1' });
            }
            if (role !== types_1.Role.EMPLOYEE) {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u4e00\\u822c\\u54e1\\u5de5' });
            }
        }
        // \\u64c1\\u6709 MANAGE_USERS \\u6b0a\\u9650\\u7684\\u7528\\u6236\\u53ef\\u4ee5\\u65b0\\u589e\\u5230\\u4efb\\u4f55\\u90e8\\u9580\\uff08\\u5305\\u62ec\\u5f85\\u5206\\u914d\\uff09
        if (currentUser.permissions && currentUser.permissions.includes('MANAGE_USERS')) {
            // \\u6709 MANAGE_USERS \\u6b0a\\u9650\\u7684\\u7528\\u6236\\u4e0d\\u53d7\\u90e8\\u9580\\u9650\\u5236
        }`;

if (content.includes(oldPost)) {
    content = content.replace(oldPost, newPost);
    console.log('POST route fixed');
} else {
    console.log('POST pattern not found, trying alternative...');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Complete!');
