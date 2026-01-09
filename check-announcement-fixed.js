const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 檢查「重大通知」公告 ===\n');

// 查詢「重大通知」公告
const ann = db.prepare("SELECT id, title, read_by FROM announcements WHERE title LIKE ? ORDER BY created_at DESC LIMIT 1").get('%重大通知%');

if (!ann) {
    console.log('❌ 未找到「重大通知」公告');
    db.close();
    process.exit(1);
}

console.log('📢 公告標題:', ann.title);
console.log('   ID:', ann.id);
console.log('   read_by (原始):', ann.read_by);

// 解析 read_by
let readBy = [];
try {
    readBy = ann.read_by ? JSON.parse(ann.read_by) : [];
} catch (e) {
    console.log('   ❌ 解析失敗:', e.message);
    readBy = [];
}

console.log('   read_by (解析):', JSON.stringify(readBy));
console.log('   已讀人數:', readBy.length);

// 查詢總用戶數
const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log('\n系統總用戶數:', users.count);

console.log('\n應該顯示:', readBy.length + '/' + users.count);
console.log('前端可能顯示:', users.count + '/' + users.count, '❌ 錯誤');

// 列出已讀用戶
if (readBy.length > 0) {
    console.log('\n已讀用戶 ID:');
    readBy.forEach((id, i) => {
        console.log('  ' + (i + 1) + '.', id);
    });
}

db.close();
console.log('\n檢查完成！');
