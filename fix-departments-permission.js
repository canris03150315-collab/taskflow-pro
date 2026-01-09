const fs = require('fs');

const filePath = '/app/dist/routes/departments.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('=== Fix departments.js permission ===');

// Fix POST route - create department
const postRouteOld = `router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER]), async (req, res) => {`;
const postRouteNew = `router.post('/', auth_1.authenticateToken, async (req, res) => {
    const currentUser = req.user;
    const hasPermission = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER' || 
                         (currentUser.permissions && currentUser.permissions.includes('MANAGE_DEPARTMENTS'));
    if (!hasPermission) {
        return res.status(403).json({ error: '\\u7121\\u6b0a\\u5275\\u5efa\\u90e8\\u9580' });
    }
`;

if (content.includes(postRouteOld)) {
    content = content.replace(postRouteOld, postRouteNew);
    console.log('POST route fixed');
} else {
    console.log('POST route not found');
}

// Fix PUT route - update department
const putRouteOld = `router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER]), async (req, res) => {`;
const putRouteNew = `router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    const currentUser = req.user;
    const hasPermission = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER' || 
                         (currentUser.permissions && currentUser.permissions.includes('MANAGE_DEPARTMENTS'));
    if (!hasPermission) {
        return res.status(403).json({ error: '\\u7121\\u6b0a\\u66f4\\u65b0\\u90e8\\u9580' });
    }
`;

if (content.includes(putRouteOld)) {
    content = content.replace(putRouteOld, putRouteNew);
    console.log('PUT route fixed');
} else {
    console.log('PUT route not found');
}

// Fix DELETE route - delete department
const deleteRouteOld = `router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS]), async (req, res) => {`;
const deleteRouteNew = `router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    const currentUser = req.user;
    const hasPermission = currentUser.role === 'BOSS' || 
                         (currentUser.permissions && currentUser.permissions.includes('MANAGE_DEPARTMENTS'));
    if (!hasPermission) {
        return res.status(403).json({ error: '\\u7121\\u6b0a\\u522a\\u9664\\u90e8\\u9580' });
    }
`;

if (content.includes(deleteRouteOld)) {
    content = content.replace(deleteRouteOld, deleteRouteNew);
    console.log('DELETE route fixed');
} else {
    console.log('DELETE route not found');
}

// Remove duplicate currentUser declarations
content = content.replace(/const currentUser = req\.user;\s+const { name, theme, icon, parent_department_id } = req\.body;/g, 
                         'const { name, theme, icon, parent_department_id } = req.body;');
content = content.replace(/const currentUser = req\.user;\s+const { id } = req\.params;\s+const { name, theme, icon, parent_department_id } = req\.body;/g,
                         'const { id } = req.params;\n        const { name, theme, icon, parent_department_id } = req.body;');
content = content.replace(/const currentUser = req\.user;\s+const { id } = req\.params;/g,
                         'const { id } = req.params;');

fs.writeFileSync(filePath, content, 'utf8');
console.log('=== Fix complete ===');
console.log('File saved:', filePath);
