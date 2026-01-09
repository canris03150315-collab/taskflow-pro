const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 清理公告已讀列表中的無效用戶 ID ===\n');

// 獲取所有有效用戶 ID
const validUsers = db.prepare('SELECT id FROM users').all().map(u => u.id);
console.log('系統有效用戶數:', validUsers.length);

// 獲取所有公告
const announcements = db.prepare('SELECT id, title, read_by FROM announcements').all();

let totalCleaned = 0;

announcements.forEach(ann => {
    let readBy = [];
    try {
        readBy = ann.read_by ? JSON.parse(ann.read_by) : [];
    } catch (e) {
        readBy = [];
    }
    
    const originalCount = readBy.length;
    
    // 過濾掉無效的用戶 ID
    const cleanedReadBy = readBy.filter(id => validUsers.includes(id));
    
    if (originalCount !== cleanedReadBy.length) {
        const removed = originalCount - cleanedReadBy.length;
        console.log(`\n📢 ${ann.title}`);
        console.log(`   原始已讀: ${originalCount}`);
        console.log(`   清理後: ${cleanedReadBy.length}`);
        console.log(`   移除: ${removed} 個無效 ID`);
        
        // 更新資料庫
        const newReadByJson = JSON.stringify(cleanedReadBy);
        db.prepare('UPDATE announcements SET read_by = ? WHERE id = ?').run(newReadByJson, ann.id);
        
        totalCleaned += removed;
        console.log('   ✅ 已更新');
    }
});

if (totalCleaned === 0) {
    console.log('\n✅ 所有公告的已讀列表都是乾淨的，無需清理');
} else {
    console.log(`\n✅ 清理完成！共移除 ${totalCleaned} 個無效的用戶 ID`);
}

db.close();
