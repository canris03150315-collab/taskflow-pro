const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 診斷公告已讀狀態 ===\n');

// 查詢所有公告
const announcements = db.prepare('SELECT id, title, read_by FROM announcements ORDER BY created_at DESC LIMIT 5').all();

console.log('最近 5 個公告的已讀狀態：\n');
announcements.forEach(ann => {
    let readBy = [];
    try {
        readBy = ann.read_by ? JSON.parse(ann.read_by) : [];
    } catch (e) {
        console.log(`  ❌ 解析失敗: ${ann.id}`);
        readBy = [];
    }
    
    console.log(`📢 ${ann.title}`);
    console.log(`   ID: ${ann.id}`);
    console.log(`   read_by (原始): ${ann.read_by}`);
    console.log(`   read_by (解析): ${JSON.stringify(readBy)}`);
    console.log(`   已讀人數: ${readBy.length}`);
    console.log('');
});

// 查詢所有用戶
const users = db.prepare('SELECT id, name FROM users').all();
console.log(`\n系統中共有 ${users.length} 個用戶：`);
users.forEach(u => {
    console.log(`  - ${u.name} (${u.id})`);
});

db.close();
console.log('\n診斷完成！');
