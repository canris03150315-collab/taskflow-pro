const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Checking routines tables...');

try {
    // 檢查 routine_templates 表
    const templatesInfo = db.prepare("PRAGMA table_info(routine_templates)").all();
    console.log('\n=== routine_templates 表結構 ===');
    console.log(templatesInfo.map(c => `${c.name} (${c.type})`).join(', '));
    
    const templates = db.prepare('SELECT * FROM routine_templates').all();
    console.log('\n總模板數:', templates.length);
    console.log('模板列表:');
    templates.forEach(t => {
        console.log(`- ID: ${t.id}, Title: ${t.title}, isDaily: ${t.is_daily}, Dept: ${t.department_id}`);
    });
    
    // 檢查 routine_records 表
    const recordsInfo = db.prepare("PRAGMA table_info(routine_records)").all();
    console.log('\n=== routine_records 表結構 ===');
    console.log(recordsInfo.map(c => `${c.name} (${c.type})`).join(', '));
    
    const records = db.prepare('SELECT * FROM routine_records ORDER BY date DESC LIMIT 5').all();
    console.log('\n最近記錄數:', records.length);
    
} catch (error) {
    console.error('ERROR:', error.message);
}

db.close();
