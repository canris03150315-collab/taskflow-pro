const fs = require('fs');
const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing unassigned department permissions...');

// 修復 1: POST /users - SUPERVISOR 檢查
// 目前邏輯：SUPERVISOR 只能新增到自己部門或 dept-unassigned
// 新邏輯：保持原樣，但所有 SUPERVISOR 都可以看到和編輯 dept-unassigned 的人員

const oldPattern1 = `        // SUPERVISOR ?芾?啣??芸楛?券??????唬犖?撌?        if (currentUser.role === types_1.Role.SUPERVISOR) {
            if (department !== currentUser.department && department !== 'dept-unassigned') {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u81ea\\u5df1\\u90e8\\u9580\\u6216\\u5f85\\u5206\\u914d\\u65b0\\u4eba\\u7684\\u4eba\\u54e1' });
            }
            if (role !== types_1.Role.EMPLOYEE) {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u4e00\\u822c\\u54e1\\u5de5' });
            }
        }`;

// 新邏輯：所有 SUPERVISOR 都可以新增到 dept-unassigned
const newPattern1 = `        // SUPERVISOR ?芾?啣??芸楛?券??????唬犖?撌?        // \\u6240\\u6709 SUPERVISOR \\u90fd\\u53ef\\u4ee5\\u65b0\\u589e\\u5230\\u5f85\\u5206\\u914d\\u90e8\\u9580
        if (currentUser.role === types_1.Role.SUPERVISOR) {
            // \\u5141\\u8a31\\u65b0\\u589e\\u5230\\u81ea\\u5df1\\u90e8\\u9580\\u6216\\u5f85\\u5206\\u914d\\u90e8\\u9580
            if (department !== currentUser.department && department !== 'dept-unassigned') {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u81ea\\u5df1\\u90e8\\u9580\\u6216\\u5f85\\u5206\\u914d\\u65b0\\u4eba\\u7684\\u4eba\\u54e1' });
            }
            if (role !== types_1.Role.EMPLOYEE) {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u4e00\\u822c\\u54e1\\u5de5' });
            }
        }`;

if (content.includes(oldPattern1)) {
    content = content.replace(oldPattern1, newPattern1);
    console.log('POST route - SUPERVISOR check updated (comment added)');
} else {
    console.log('POST pattern not found');
}

// 修復 2: 檢查 GET /users 路由是否需要修改
// 確保所有 SUPERVISOR 都可以看到 dept-unassigned 的人員
// 目前代碼已經允許所有 SUPERVISOR 看到所有用戶，不需要修改

fs.writeFileSync(filePath, content, 'utf8');
console.log('Complete!');
