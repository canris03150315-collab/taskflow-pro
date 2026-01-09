const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 檢查「系統正式開始使用」公告的 read_by 數據 ===\n');

const ann = db.prepare('SELECT id, title, read_by FROM announcements WHERE title = ? LIMIT 1').get('系統正式開始使用');

if (!ann) {
    console.log('❌ 未找到公告');
    db.close();
    process.exit(1);
}

console.log('📢 公告:', ann.title);
console.log('   ID:', ann.id);

let readBy = [];
try {
    readBy = ann.read_by ? JSON.parse(ann.read_by) : [];
} catch (e) {
    console.log('❌ 解析失敗:', e.message);
    db.close();
    process.exit(1);
}

console.log('\n已讀用戶列表:');
readBy.forEach((id, i) => {
    console.log(`  ${i + 1}. ${id}`);
});

console.log('\n檢查重複:');
const uniqueIds = [...new Set(readBy)];
console.log('原始數量:', readBy.length);
console.log('去重後數量:', uniqueIds.length);

if (readBy.length !== uniqueIds.length) {
    console.log('⚠️ 發現重複的用戶 ID！');
    
    // 找出重複的 ID
    const duplicates = readBy.filter((id, index) => readBy.indexOf(id) !== index);
    console.log('\n重複的 ID:');
    [...new Set(duplicates)].forEach(id => {
        const count = readBy.filter(x => x === id).length;
        console.log(`  - ${id} (出現 ${count} 次)`);
    });
} else {
    console.log('✅ 沒有重複');
}

// 查詢所有用戶
const users = db.prepare('SELECT id, name FROM users').all();
console.log('\n系統用戶列表:');
users.forEach((u, i) => {
    const hasRead = readBy.includes(u.id);
    console.log(`  ${i + 1}. ${hasRead ? '✅' : '❌'} ${u.name} (${u.id})`);
});

db.close();
console.log('\n檢查完成！');
