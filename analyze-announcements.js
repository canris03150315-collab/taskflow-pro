const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 分析所有公告的已讀狀態 ===\n');

// 查詢所有公告
const announcements = db.prepare('SELECT id, title, priority, read_by FROM announcements ORDER BY created_at DESC').all();

// 查詢總用戶數
const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

console.log('系統總用戶數:', totalUsers);
console.log('公告總數:', announcements.length);
console.log('');

announcements.forEach((ann, index) => {
    let readBy = [];
    try {
        readBy = ann.read_by ? JSON.parse(ann.read_by) : [];
    } catch (e) {
        readBy = [];
    }
    
    const readCount = readBy.length;
    const isWrong = readCount !== totalUsers && readCount > 0;
    
    console.log(`${index + 1}. ${ann.title}`);
    console.log(`   優先級: ${ann.priority}`);
    console.log(`   已讀人數: ${readCount}/${totalUsers}`);
    
    if (isWrong) {
        console.log(`   ⚠️ 注意：還有 ${totalUsers - readCount} 人未讀`);
    }
    
    if (readCount === totalUsers) {
        console.log(`   ✅ 所有人都已讀`);
    }
    
    console.log('');
});

db.close();
