// 修復建立用戶權限的腳本
const fs = require('fs');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到 POST 路由並替換權限檢查
const oldPattern = `router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER]), async (req, res) => {
    try {`;

const newPattern = `router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        // 檢查權限：BOSS, MANAGER, SUPERVISOR，或有 MANAGE_USERS 權限的人
        const currentUser = req.user;
        const isAdmin = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER' || currentUser.role === 'SUPERVISOR';
        let permissions = currentUser.permissions || [];
        if (typeof permissions === 'string') {
            try { permissions = JSON.parse(permissions); } catch(e) { permissions = []; }
        }
        const hasManagePermission = Array.isArray(permissions) && permissions.includes('MANAGE_USERS');
        if (!isAdmin && !hasManagePermission) {
            return res.status(403).json({ error: '無權建立用戶' });
        }`;

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(filePath, content);
    console.log('✓ 已修復建立用戶權限檢查');
} else {
    console.log('找不到目標程式碼，嘗試其他方式...');
    // 嘗試找到 router.post 並替換
    const regex = /router\.post\('\/', auth_1\.authenticateToken, \(0, auth_1\.requireRole\)\(\[types_1\.Role\.BOSS, types_1\.Role\.MANAGER\]\), async \(req, res\) => \{\s*try \{/;
    if (regex.test(content)) {
        content = content.replace(regex, newPattern);
        fs.writeFileSync(filePath, content);
        console.log('✓ 已修復建立用戶權限檢查 (regex)');
    } else {
        console.log('無法找到目標程式碼');
        console.log('現有的 POST 路由:');
        const match = content.match(/router\.post\('\/'[\s\S]{0,200}/);
        if (match) console.log(match[0]);
    }
}
