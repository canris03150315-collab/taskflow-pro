const fs = require('fs');
const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing unassigned department permissions...');

// 實際的模式（註釋和代碼在同一行）
const oldPattern = `        // SUPERVISOR ?芾?啣??芸楛?券??????唬犖?撌?        if (currentUser.role === types_1.Role.SUPERVISOR) {
            if (department !== currentUser.department && department !== 'dept-unassigned') {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u81ea\\u5df1\\u90e8\\u9580\\u6216\\u5f85\\u5206\\u914d\\u65b0\\u4eba\\u7684\\u4eba\\u54e1' });
            }
            if (role !== types_1.Role.EMPLOYEE) {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u4e00\\u822c\\u54e1\\u5de5' });
            }
        }`;

// 新模式：保持原有邏輯（已經允許所有 SUPERVISOR 新增到 dept-unassigned）
// 只需要添加註釋說明
const newPattern = `        // SUPERVISOR ?芾?啣??芸楛?券??????唬犖?撌?        // \\u6240\\u6709 SUPERVISOR \\u90fd\\u53ef\\u4ee5\\u65b0\\u589e\\u5230\\u5f85\\u5206\\u914d\\u90e8\\u9580 (dept-unassigned)
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
    console.log('SUCCESS: POST route updated');
} else {
    console.log('ERROR: Pattern not found, checking actual content...');
    // 輸出實際內容以便調試
    const lines = content.split('\n');
    for (let i = 85; i < 94; i++) {
        console.log(`Line ${i}: ${lines[i]}`);
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Complete!');
