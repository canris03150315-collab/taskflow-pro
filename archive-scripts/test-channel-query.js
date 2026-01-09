const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// 測試兩個用戶的查詢
const users = [
    { id: 'admin-1766339617209', name: 'Seven (A帳號)' },
    { id: 'user-1766352752934-70o31mqg7', name: 'AI部主管 (B帳號)' }
];

users.forEach(user => {
    console.log(`\n=== 測試用戶: ${user.name} (${user.id}) ===`);
    
    // 使用後端的 LIKE 查詢
    const channels = db.prepare(`
        SELECT * FROM chat_channels
        WHERE participants LIKE ?
    `).all(`%${user.id}%`);
    
    console.log(`找到 ${channels.length} 個頻道:`);
    channels.forEach(ch => {
        console.log(`  - 頻道 ID: ${ch.id}`);
        console.log(`    參與者: ${ch.participants}`);
        const participants = JSON.parse(ch.participants);
        console.log(`    解析後: ${participants.join(', ')}`);
        console.log(`    包含此用戶: ${participants.includes(user.id)}`);
    });
});

db.close();
