const fs = require('fs');
const path = '/app/dist/routes/users.js';

let content = fs.readFileSync(path, 'utf8');

// 修改 SUPERVISOR 的部門檢查邏輯，允許新增到自己部門或「待分配新人」部門
// 原本：if (department !== currentUser.department)
// 修改為：允許自己部門或 dept-unassigned

const oldDeptCheck = "        // SUPERVISOR \u53ea\u80fd\u65b0\u589e\u81ea\u5df1\u90e8\u9580\u7684\u54e1\u5de5\n        if (currentUser.role === types_1.Role.SUPERVISOR) {\n            if (department !== currentUser.department) {\n                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u81ea\\u5df1\\u90e8\\u9580\\u7684\\u4eba\\u54e1' });";

const newDeptCheck = "        // SUPERVISOR \u53ea\u80fd\u65b0\u589e\u81ea\u5df1\u90e8\u9580\u6216\u5f85\u5206\u914d\u65b0\u4eba\u7684\u54e1\u5de5\n        if (currentUser.role === types_1.Role.SUPERVISOR) {\n            if (department !== currentUser.department && department !== 'dept-unassigned') {\n                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u81ea\\u5df1\\u90e8\\u9580\\u6216\\u5f85\\u5206\\u914d\\u65b0\\u4eba\\u7684\\u4eba\\u54e1' });";

if (content.includes(oldDeptCheck)) {
  content = content.replace(oldDeptCheck, newDeptCheck);
  console.log('SUCCESS: Updated SUPERVISOR department check to allow dept-unassigned');
} else {
  console.log('WARNING: Pattern not found, checking if already updated');
  if (content.includes(newDeptCheck)) {
    console.log('INFO: Already updated to allow dept-unassigned');
  } else {
    console.error('ERROR: Cannot find SUPERVISOR department check pattern');
    process.exit(1);
  }
}

fs.writeFileSync(path, content, 'utf8');
console.log('COMPLETE: users.js updated successfully');
