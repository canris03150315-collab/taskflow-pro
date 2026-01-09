const Database = require('./node_modules/better-sqlite3');
const fs = require('fs');
const path = require('path');

async function checkAvatar() {
    try {
        // 讀取資料庫密鑰
        const keyPath = path.join('/app/data', '.db-key');
        const key = fs.readFileSync(keyPath, 'utf8').trim();
        
        // 連接資料庫
        const db = new Database('/app/data/taskflow.db');
        db.pragma(`cipher='aes256cbc'`);
        db.pragma(`key='${key}'`);
        
        // 查詢用戶的 avatar
        const users = db.prepare('SELECT id, name, username, avatar FROM users').all();
        
        console.log('=== 用戶頭像檢查 ===\n');
        
        for (const user of users) {
            console.log(`用戶: ${user.name} (${user.username})`);
            console.log(`ID: ${user.id}`);
            
            if (user.avatar) {
                console.log(`頭像: ${user.avatar.substring(0, 50)}...`);
                console.log(`頭像長度: ${user.avatar.length} 字元`);
                console.log(`是否為 base64: ${user.avatar.startsWith('data:image/')}`);
            } else {
                console.log('頭像: null');
            }
            console.log('---\n');
        }
        
        db.close();
    } catch (error) {
        console.error('錯誤:', error.message);
    }
}

checkAvatar();
