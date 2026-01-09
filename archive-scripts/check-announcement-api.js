const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 檢查公告 API 返回數據 ===\n');

// 1. 查詢最新公告
const announcement = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 1').get();

if (!announcement) {
    console.log('❌ 沒有找到公告');
    db.close();
    process.exit(1);
}

console.log('📢 最新公告:');
console.log(`   標題: ${announcement.title}`);
console.log(`   ID: ${announcement.id}`);
console.log(`   created_by: ${announcement.created_by}`);
console.log(`   created_at: ${announcement.created_at}`);
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

// 3. 模擬 parseAnnouncementJson 函數
function parseAnnouncementJson(ann) {
    if (!ann) return ann;
    
    try {
        ann.read_by = ann.read_by ? JSON.parse(ann.read_by) : [];
    } catch (e) {
        ann.read_by = [];
    }

    ann.createdBy = ann.created_by;
    ann.createdAt = ann.created_at;
    ann.updatedAt = ann.updated_at;
    ann.readBy = ann.read_by;

    return ann;
}

const parsed = parseAnnouncementJson({...announcement});

console.log('解析後的公告對象:');
console.log(`   createdBy: ${parsed.createdBy}`);
console.log(`   createdAt: ${parsed.createdAt}`);
console.log(`   readBy: ${JSON.stringify(parsed.readBy)}`);
console.log(`   read_by: ${JSON.stringify(parsed.read_by)}`);

// 4. 查詢所有用戶
const users = db.prepare('SELECT id, name FROM users').all();
console.log(`\n系統中共有 ${users.length} 個用戶：`);
users.forEach(u => {
    const hasRead = readBy.includes(u.id);
    console.log(`  ${hasRead ? '✅' : '❌'} ${u.name} (${u.id})`);
});

db.close();
console.log('\n檢查完成！');
