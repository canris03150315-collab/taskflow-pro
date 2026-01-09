const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Testing announcements API response format...');

try {
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
    console.log('Total announcements:', announcements.length);
    
    // 模擬後端返回格式
    const response = { announcements };
    console.log('Response format:', JSON.stringify(response, null, 2));
    
    // 檢查前端是否能正確解析
    const parsed = response.announcements || [];
    console.log('Frontend would receive:', parsed.length, 'announcements');
    
} catch (error) {
    console.error('ERROR:', error.message);
}

db.close();
