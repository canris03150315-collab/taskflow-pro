const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// 模擬後端的 parseAnnouncementJson 函數
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

// 查詢公告
const announcement = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 1').get();

console.log('=== 原始資料庫數據 ===');
console.log('read_by (raw):', announcement.read_by);
console.log('Type:', typeof announcement.read_by);

console.log('\n=== 解析後的數據 ===');
const parsed = parseAnnouncementJson({...announcement});
console.log('read_by:', parsed.read_by);
console.log('Type:', typeof parsed.read_by);
console.log('Is Array:', Array.isArray(parsed.read_by));
console.log('Length:', parsed.read_by.length);

console.log('\nreadBy:', parsed.readBy);
console.log('Type:', typeof parsed.readBy);
console.log('Is Array:', Array.isArray(parsed.readBy));
console.log('Length:', parsed.readBy.length);

console.log('\n=== JSON.stringify 後 ===');
const jsonStr = JSON.stringify(parsed);
console.log('JSON:', jsonStr.substring(0, 200) + '...');

console.log('\n=== 重新解析 JSON ===');
const reparsed = JSON.parse(jsonStr);
console.log('readBy type:', typeof reparsed.readBy);
console.log('readBy is Array:', Array.isArray(reparsed.readBy));
console.log('readBy length:', reparsed.readBy.length);

db.close();
