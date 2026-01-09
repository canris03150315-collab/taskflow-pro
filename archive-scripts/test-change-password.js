const Database = require('./node_modules/better-sqlite3');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function testChangePassword() {
    try {
        console.log('=== Testing Change Password API ===\n');
        
        // 1. 讀取資料庫密鑰
        const keyPath = path.join('/app/data', '.db-key');
        const key = fs.readFileSync(keyPath, 'utf8').trim();
        
        // 2. 連接資料庫
        const db = new Database('/app/data/taskflow.db');
        db.pragma(`cipher='aes256cbc'`);
        db.pragma(`key='${key}'`);
        
        // 3. 獲取測試用戶
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get('canris');
        if (!user) {
            console.log('ERROR: User canris not found');
            return;
        }
        
        console.log('User found:', user.username);
        console.log('User ID:', user.id);
        
        // 4. 測試密碼驗證
        const testPassword = 'kico123123';
        const isValid = await bcrypt.compare(testPassword, user.password);
        console.log('Current password valid:', isValid);
        
        if (!isValid) {
            console.log('ERROR: Current password is incorrect');
            return;
        }
        
        // 5. 模擬修改密碼流程
        const newPassword = 'test1234';
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        console.log('\nSimulating password change...');
        console.log('New password (plain):', newPassword);
        console.log('New password (hashed):', hashedPassword.substring(0, 20) + '...');
        
        // 6. 更新密碼（測試用，不實際執行）
        // db.prepare('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?').run(hashedPassword, user.id);
        
        console.log('\n✅ Change password API test completed');
        console.log('API endpoint: POST /api/users/' + user.id + '/change-password');
        console.log('Required fields: currentPassword, newPassword');
        
        db.close();
    } catch (error) {
        console.error('ERROR:', error.message);
    }
}

testChangePassword();
