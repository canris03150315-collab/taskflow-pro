const fs = require('fs');
const filePath = '/app/dist/routes/departments.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Starting fix...');

const postOld = "router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER]), async (req, res) => {";
const postNew = "router.post('/', auth_1.authenticateToken, async (req, res) => {\n    const currentUser = req.user;\n    const hasPermission = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER' || (currentUser.permissions && currentUser.permissions.includes('MANAGE_DEPARTMENTS'));\n    if (!hasPermission) { return res.status(403).json({ error: '\\u7121\\u6b0a\\u5275\\u5efa\\u90e8\\u9580' }); }\n";

const putOld = "router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER]), async (req, res) => {";
const putNew = "router.put('/:id', auth_1.authenticateToken, async (req, res) => {\n    const currentUser = req.user;\n    const hasPermission = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER' || (currentUser.permissions && currentUser.permissions.includes('MANAGE_DEPARTMENTS'));\n    if (!hasPermission) { return res.status(403).json({ error: '\\u7121\\u6b0a\\u66f4\\u65b0\\u90e8\\u9580' }); }\n";

const delOld = "router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS]), async (req, res) => {";
const delNew = "router.delete('/:id', auth_1.authenticateToken, async (req, res) => {\n    const currentUser = req.user;\n    const hasPermission = currentUser.role === 'BOSS' || (currentUser.permissions && currentUser.permissions.includes('MANAGE_DEPARTMENTS'));\n    if (!hasPermission) { return res.status(403).json({ error: '\\u7121\\u6b0a\\u522a\\u9664\\u90e8\\u9580' }); }\n";

if (content.includes(postOld)) {
    content = content.replace(postOld, postNew);
    console.log('POST fixed');
}

if (content.includes(putOld)) {
    content = content.replace(putOld, putNew);
    console.log('PUT fixed');
}

if (content.includes(delOld)) {
    content = content.replace(delOld, delNew);
    console.log('DELETE fixed');
}

content = content.replace(/const currentUser = req\.user;\s+const { name, theme, icon, parent_department_id } = req\.body;/g, 'const { name, theme, icon, parent_department_id } = req.body;');
content = content.replace(/const currentUser = req\.user;\s+const { id } = req\.params;\s+const { name, theme, icon, parent_department_id } = req\.body;/g, 'const { id } = req.params;\n        const { name, theme, icon, parent_department_id } = req.body;');
content = content.replace(/const currentUser = req\.user;\s+const { id } = req\.params;/g, 'const { id } = req.params;');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Complete!');
