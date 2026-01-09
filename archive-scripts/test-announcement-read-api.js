const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 測試公告已讀 API 邏輯 ===\n');

// 1. 查詢第一個公告
const announcement = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 1').get();

if (!announcement) {
    console.log('❌ 沒有找到公告');
    db.close();
    process.exit(1);
}

console.log('📢 測試公告:');
console.log(`   標題: ${announcement.title}`);
console.log(`   ID: ${announcement.id}`);
console.log(`   read_by (原始): ${announcement.read_by}`);

// 2. 解析 read_by
let readBy = [];
try {
    readBy = announcement.read_by ? JSON.parse(announcement.read_by) : [];
} catch (e) {
    console.log(`   ❌ 解析 read_by 失敗: ${e.message}`);
    readBy = [];
}

console.log(`   read_by (解析): ${JSON.stringify(readBy)}`);
console.log(`   已讀人數: ${readBy.length}\n`);

// 3. 模擬添加一個用戶 ID
const testUserId = 'test-user-123';
console.log(`模擬用戶 ${testUserId} 標記已讀...\n`);

if (!readBy.includes(testUserId)) {
    readBy.push(testUserId);
    const readByJson = JSON.stringify(readBy);
    console.log(`   新的 read_by JSON: ${readByJson}`);
    
    // 更新資料庫
    db.prepare('UPDATE announcements SET read_by = ? WHERE id = ?').run(readByJson, announcement.id);
    console.log('   ✅ 資料庫已更新\n');
    
    // 驗證更新
    const updated = db.prepare('SELECT read_by FROM announcements WHERE id = ?').get(announcement.id);
    console.log('驗證更新結果:');
    console.log(`   read_by (資料庫): ${updated.read_by}`);
    
    const verifyReadBy = JSON.parse(updated.read_by);
    console.log(`   read_by (解析): ${JSON.stringify(verifyReadBy)}`);
    console.log(`   包含測試用戶: ${verifyReadBy.includes(testUserId) ? '✅ 是' : '❌ 否'}`);
} else {
    console.log('   ⚠️ 用戶已經在已讀列表中');
}

db.close();
console.log('\n測試完成！');
