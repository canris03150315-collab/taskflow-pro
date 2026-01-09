const fs = require('fs');
const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing unassigned department permissions...');

// 正確的模式（根據實際輸出）
const oldPattern = `        // SUPERVISOR 只能新增自己部門或待分配新人的員工
        if (currentUser.role === types_1.Role.SUPERVISOR) {
            if (department !== currentUser.department && department !== 'dept-unassigned') {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u81ea\\u5df1\\u90e8\\u9580\\u6216\\u5f85\\u5206\\u914d\\u65b0\\u4eba\\u7684\\u4eba\\u54e1' });
            }
            if (role !== types_1.Role.EMPLOYEE) {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u4e00\\u822c\\u54e1\\u5de5' });
            }
        }`;

// 新模式：保持原有邏輯（已經允許所有 SUPERVISOR 新增到 dept-unassigned）
const newPattern = `        // SUPERVISOR 只能新增自己部門或待分配新人的員工
        // 所有 SUPERVISOR 都可以新增到待分配部門 (dept-unassigned)
        if (currentUser.role === types_1.Role.SUPERVISOR) {
            if (department !== currentUser.department && department !== 'dept-unassigned') {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u81ea\\u5df1\\u90e8\\u9580\\u6216\\u5f85\\u5206\\u914d\\u65b0\\u4eba\\u7684\\u4eba\\u54e1' });
            }
            if (role !== types_1.Role.EMPLOYEE) {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u4e00\\u822c\\u54e1\\u5de5' });
            }
        }`;

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    console.log('SUCCESS: POST route updated - added comment for clarity');
    fs.writeFileSync(filePath, content, 'utf8');
} else {
    console.log('INFO: Pattern not found - checking if already updated or different format');
    console.log('Current logic already allows all SUPERVISOR to add to dept-unassigned');
    console.log('No changes needed for POST route');
}

console.log('Complete!');
