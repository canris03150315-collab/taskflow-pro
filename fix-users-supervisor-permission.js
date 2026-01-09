const fs = require('fs');
const path = '/app/dist/routes/users.js';

let content = fs.readFileSync(path, 'utf8');

// 修改 POST 路由的 requireRole，允許 SUPERVISOR 也可以新增人員
// 原本：requireRole([Role.BOSS, Role.MANAGER])
// 修改為：requireRole([Role.BOSS, Role.MANAGER, Role.SUPERVISOR])

const oldRequireRole = "router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER]), async (req, res) => {";
const newRequireRole = "router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER, types_1.Role.SUPERVISOR]), async (req, res) => {";

if (content.includes(oldRequireRole)) {
  content = content.replace(oldRequireRole, newRequireRole);
  console.log('SUCCESS: Updated POST route to allow SUPERVISOR');
} else {
  console.log('WARNING: Pattern not found, checking if already updated');
  if (content.includes(newRequireRole)) {
    console.log('INFO: Already updated');
  } else {
    console.error('ERROR: Cannot find POST route pattern');
    process.exit(1);
  }
}

// 添加 SUPERVISOR 只能新增自己部門員工的邏輯檢查
// 在 "// 檢查部門是否存在" 之前添加檢查

const deptCheckPattern = "        // \u6aa2\u67e5\u90e8\u9580\u662f\u5426\u5b58\u5728";
const supervisorCheck = `        // SUPERVISOR \u53ea\u80fd\u65b0\u589e\u81ea\u5df1\u90e8\u9580\u7684\u54e1\u5de5
        if (currentUser.role === types_1.Role.SUPERVISOR) {
            if (department !== currentUser.department) {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u81ea\\u5df1\\u90e8\\u9580\\u7684\\u4eba\\u54e1' });
            }
            if (role !== types_1.Role.EMPLOYEE) {
                return res.status(403).json({ error: '\\u4e3b\\u7ba1\\u53ea\\u80fd\\u65b0\\u589e\\u4e00\\u822c\\u54e1\\u5de5' });
            }
        }
        `;

if (content.includes(deptCheckPattern) && !content.includes('SUPERVISOR \u53ea\u80fd\u65b0\u589e\u81ea\u5df1\u90e8\u9580\u7684\u54e1\u5de5')) {
  content = content.replace(deptCheckPattern, supervisorCheck + deptCheckPattern);
  console.log('SUCCESS: Added SUPERVISOR department check');
} else if (content.includes('SUPERVISOR \u53ea\u80fd\u65b0\u589e\u81ea\u5df1\u90e8\u9580\u7684\u54e1\u5de5')) {
  console.log('INFO: SUPERVISOR check already exists');
} else {
  console.log('WARNING: Could not add SUPERVISOR check');
}

fs.writeFileSync(path, content, 'utf8');
console.log('COMPLETE: users.js updated successfully');
