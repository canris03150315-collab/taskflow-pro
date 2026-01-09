// 修復建立用戶權限的腳本 v2
const fs = require('fs');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到舊的 POST 路由並替換為新的（帶權限檢查）
const oldPattern = /router\.post\('\/', auth_1\.authenticateToken, \(0, auth_1\.requireRole\)\(\[types_1\.Role\.BOSS, types_1\.Role\.MANAGER\]\), async \(req, res\) => \{\s*try \{\s*const db = req\.db;/;

const newCode = `router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        // 檢查權限：BOSS, MANAGER, SUPERVISOR，或有 MANAGE_USERS 權限的人
        const currentUser = req.user;
        const isAdminRole = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER' || currentUser.role === 'SUPERVISOR';
        let userPerms = currentUser.permissions || [];
        if (typeof userPerms === 'string') {
            try { userPerms = JSON.parse(userPerms); } catch(e) { userPerms = []; }
        }
        const hasManageUsersPerm = Array.isArray(userPerms) && userPerms.includes('MANAGE_USERS');
        if (!isAdminRole && !hasManageUsersPerm) {
            return res.status(403).json({ error: '無權建立用戶' });
        }`;

if (oldPattern.test(content)) {
    content = content.replace(oldPattern, newCode);
    fs.writeFileSync(filePath, content);
    console.log('✓ 已修復建立用戶權限檢查');
} else {
    console.log('找不到目標程式碼');
    // 顯示現有的 POST 路由開頭
    const match = content.match(/router\.post\('\/'[\s\S]{0,300}/);
    if (match) {
        console.log('現有程式碼:');
        console.log(match[0]);
    }
}
